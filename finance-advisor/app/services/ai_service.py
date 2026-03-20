import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.models import AIConversation, Category, Transaction

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a personal finance advisor named FinSight AI. You have access to the user's real transaction data via function tools. Be specific, reference actual numbers, and give actionable advice. When analyzing finances, always use the available tools to fetch real data before making recommendations. Be concise, warm, and professional."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Get the user's spending broken down by category for a specific month",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {
                        "type": "string",
                        "description": "Month in YYYY-MM format, e.g. '2024-01'",
                    }
                },
                "required": ["month"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_to_last_month",
            "description": "Compare spending in a specific category between current and previous month",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Category name to compare",
                    }
                },
                "required": ["category"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "flag_anomalies",
            "description": "Find transactions that exceed N times the category average spend",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold_multiplier": {
                        "type": "number",
                        "description": "Multiplier above category average to flag as anomaly (e.g. 2.0 means 2x average)",
                    }
                },
                "required": ["threshold_multiplier"],
            },
        },
    },
]


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


async def _get_spending_by_category(db: AsyncSession, user_id: uuid.UUID, month: str) -> dict:
    year, mon = map(int, month.split("-"))
    from calendar import monthrange

    start = datetime(year, mon, 1, tzinfo=timezone.utc)
    last_day = monthrange(year, mon)[1]
    end = datetime(year, mon, last_day, 23, 59, 59, tzinfo=timezone.utc)

    q = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start,
                Transaction.date <= end,
                Transaction.amount > 0,
            )
        )
    )
    result = await db.execute(q)
    transactions = result.scalars().all()

    by_category: dict[str, float] = {}
    for t in transactions:
        cat = t.category.name if t.category else "Uncategorized"
        by_category[cat] = by_category.get(cat, 0.0) + float(t.amount)

    return {"month": month, "by_category": by_category, "total": sum(by_category.values())}


async def _compare_to_last_month(db: AsyncSession, user_id: uuid.UUID, category: str) -> dict:
    from calendar import monthrange
    from dateutil.relativedelta import relativedelta

    now = datetime.now(timezone.utc)
    curr_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    curr_end = datetime(now.year, now.month, monthrange(now.year, now.month)[1], 23, 59, 59, tzinfo=timezone.utc)

    prev = now - relativedelta(months=1)
    prev_start = datetime(prev.year, prev.month, 1, tzinfo=timezone.utc)
    prev_end = datetime(prev.year, prev.month, monthrange(prev.year, prev.month)[1], 23, 59, 59, tzinfo=timezone.utc)

    async def _sum_for_period(start, end):
        q = (
            select(func.sum(Transaction.amount))
            .join(Category, Transaction.category_id == Category.id)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.date >= start,
                    Transaction.date <= end,
                    Transaction.amount > 0,
                    Category.name.ilike(f"%{category}%"),
                )
            )
        )
        result = await db.execute(q)
        return float(result.scalar_one() or 0)

    curr_total = await _sum_for_period(curr_start, curr_end)
    prev_total = await _sum_for_period(prev_start, prev_end)
    change_pct = ((curr_total - prev_total) / prev_total * 100) if prev_total else 0

    return {
        "category": category,
        "current_month": curr_total,
        "previous_month": prev_total,
        "change_amount": curr_total - prev_total,
        "change_percent": round(change_pct, 2),
    }


async def _flag_anomalies(db: AsyncSession, user_id: uuid.UUID, threshold_multiplier: float) -> dict:
    from dateutil.relativedelta import relativedelta

    now = datetime.now(timezone.utc)
    start = now - relativedelta(days=90)

    q = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start,
                Transaction.amount > 0,
            )
        )
    )
    result = await db.execute(q)
    transactions = result.scalars().all()

    cat_amounts: dict[str, list[float]] = {}
    for t in transactions:
        cat = t.category.name if t.category else "Uncategorized"
        cat_amounts.setdefault(cat, []).append(float(t.amount))

    cat_averages = {cat: sum(amounts) / len(amounts) for cat, amounts in cat_amounts.items()}

    anomalies = []
    for t in transactions:
        cat = t.category.name if t.category else "Uncategorized"
        avg = cat_averages.get(cat, 0)
        if avg > 0 and float(t.amount) > avg * threshold_multiplier:
            anomalies.append({
                "id": str(t.id),
                "date": t.date.isoformat(),
                "merchant": t.merchant_name or t.raw_name,
                "amount": float(t.amount),
                "category": cat,
                "category_avg": round(avg, 2),
                "multiplier": round(float(t.amount) / avg, 2),
            })
            t.is_anomaly = True

    await db.commit()

    return {
        "threshold_multiplier": threshold_multiplier,
        "anomalies_found": len(anomalies),
        "anomalies": anomalies[:20],
    }


async def _execute_tool(db: AsyncSession, user_id: uuid.UUID, tool_name: str, tool_args: dict) -> str:
    if tool_name == "get_spending_by_category":
        result = await _get_spending_by_category(db, user_id, tool_args["month"])
    elif tool_name == "compare_to_last_month":
        result = await _compare_to_last_month(db, user_id, tool_args["category"])
    elif tool_name == "flag_anomalies":
        result = await _flag_anomalies(db, user_id, tool_args["threshold_multiplier"])
    else:
        result = {"error": f"Unknown tool: {tool_name}"}

    return json.dumps(result, default=_decimal_default)


async def get_or_create_conversation(db: AsyncSession, user_id: uuid.UUID) -> AIConversation:
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.user_id == user_id)
        .order_by(AIConversation.created_at.desc())
        .limit(1)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        conv = AIConversation(user_id=user_id, messages=[])
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    return conv


async def chat_stream(
    db: AsyncSession, user_id: uuid.UUID, message: str
) -> AsyncGenerator[str, None]:
    conv = await get_or_create_conversation(db, user_id)

    history = list(conv.messages) if conv.messages else []
    history.append({"role": "user", "content": message})

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    # Phase 1: Non-streaming call ONLY if tool use might be needed
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        stream=False,
    )

    resp_message = response.choices[0].message

    # Resolve all tool calls iteratively
    while resp_message.tool_calls:
        messages.append(resp_message)

        for tool_call in resp_message.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)
            tool_result = await _execute_tool(db, user_id, tool_name, tool_args)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            stream=False,
        )
        resp_message = response.choices[0].message

    # Phase 2: Stream the final response
    # If the non-streaming response already has the final content (no tool calls were
    # triggered at all, or after tool resolution), stream it directly from the current
    # messages context so the model produces a fresh streaming output.
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
    )

    streamed_content = ""
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            delta = chunk.choices[0].delta.content
            streamed_content += delta
            yield delta

    # Persist conversation: only keep user/assistant turns (not tool messages)
    history.append({"role": "assistant", "content": streamed_content})
    conv.messages = history
    await db.commit()

