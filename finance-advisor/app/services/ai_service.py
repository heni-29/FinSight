import uuid
from calendar import monthrange
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.models import AIConversation, Category, Transaction

client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

MODEL = "llama-3.3-70b-versatile"


def _fmt(amount: float) -> str:
    return f"${amount:,.2f}"


async def _build_financial_context(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Fetch real transaction data and format it as context for the AI."""
    now = datetime.now(timezone.utc)

    # Current month
    curr_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    curr_end = datetime(now.year, now.month, monthrange(now.year, now.month)[1], 23, 59, 59, tzinfo=timezone.utc)

    # Previous month
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year = now.year if now.month > 1 else now.year - 1
    prev_start = datetime(prev_year, prev_month, 1, tzinfo=timezone.utc)
    prev_end = datetime(prev_year, prev_month, monthrange(prev_year, prev_month)[1], 23, 59, 59, tzinfo=timezone.utc)

    async def get_txns(start, end):
        result = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.category))
            .where(and_(Transaction.user_id == user_id, Transaction.date >= start, Transaction.date <= end))
            .order_by(Transaction.date.desc())
        )
        return result.scalars().all()

    curr_txns = await get_txns(curr_start, curr_end)
    prev_txns = await get_txns(prev_start, prev_end)

    def summarize(txns):
        income = sum(float(t.amount) for t in txns if float(t.amount) < 0)
        expenses = sum(float(t.amount) for t in txns if float(t.amount) > 0)
        by_cat: dict[str, float] = {}
        for t in txns:
            if float(t.amount) > 0:
                cat = t.category.name if t.category else "Uncategorized"
                by_cat[cat] = by_cat.get(cat, 0.0) + float(t.amount)
        return income, expenses, by_cat

    curr_income, curr_exp, curr_cat = summarize(curr_txns)
    prev_income, prev_exp, prev_cat = summarize(prev_txns)

    curr_label = now.strftime("%B %Y")
    prev_label = datetime(prev_year, prev_month, 1).strftime("%B %Y")

    lines = [
        f"## User's Financial Data (as of {now.strftime('%B %d, %Y')})",
        "",
        f"### {curr_label} (current month)",
        f"- Total income: {_fmt(abs(curr_income))}",
        f"- Total expenses: {_fmt(curr_exp)}",
        f"- Net: {_fmt(abs(curr_income) - curr_exp)}",
        f"- Number of transactions: {len(curr_txns)}",
    ]

    if curr_cat:
        lines.append("- Spending by category:")
        for cat, amt in sorted(curr_cat.items(), key=lambda x: -x[1])[:8]:
            lines.append(f"  - {cat}: {_fmt(amt)}")

    lines += [
        "",
        f"### {prev_label} (previous month)",
        f"- Total income: {_fmt(abs(prev_income))}",
        f"- Total expenses: {_fmt(prev_exp)}",
        f"- Net: {_fmt(abs(prev_income) - prev_exp)}",
    ]

    if prev_cat:
        lines.append("- Spending by category:")
        for cat, amt in sorted(prev_cat.items(), key=lambda x: -x[1])[:8]:
            lines.append(f"  - {cat}: {_fmt(amt)}")

    # Recent transactions
    if curr_txns:
        lines += ["", "### Recent transactions (last 10)"]
        for t in curr_txns[:10]:
            cat = t.category.name if t.category else "Uncategorized"
            name = t.merchant_name or t.raw_name or "Unknown"
            sign = "-" if float(t.amount) < 0 else "+"
            lines.append(f"  - {t.date.strftime('%b %d')}: {name} ({cat}) {sign}{_fmt(abs(float(t.amount)))}")

    if not curr_txns and not prev_txns:
        lines += ["", "Note: No transaction data found yet. The user may not have connected a bank account or added transactions manually."]

    return "\n".join(lines)


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

    # Build financial context from real DB data
    financial_context = await _build_financial_context(db, user_id)

    system_prompt = f"""You are FinSight AI, a personal finance advisor. You have access to the user's real transaction data shown below. Use it to give specific, numbers-backed advice. Be concise, warm, and actionable.

{financial_context}"""

    history = list(conv.messages) if conv.messages else []
    history.append({"role": "user", "content": message})

    messages = [{"role": "system", "content": system_prompt}] + history

    # Stream the response directly — no tool calling needed, data is in context
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True,
        max_tokens=1024,
        temperature=0.7,
    )

    streamed_content = ""
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            delta = chunk.choices[0].delta.content
            streamed_content += delta
            yield delta

    # Persist conversation history
    history.append({"role": "assistant", "content": streamed_content})
    conv.messages = history
    await db.commit()
