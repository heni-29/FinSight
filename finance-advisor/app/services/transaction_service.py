import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Category, Transaction
from app.schemas.transactions import (
    PaginatedTransactions,
    TransactionCreate,
    TransactionOut,
    TransactionSummary,
)


async def _ensure_category(db: AsyncSession, name: str, parent_name: str | None = None) -> Category:
    result = await db.execute(select(Category).where(Category.name == name))
    cat = result.scalar_one_or_none()
    if not cat:
        cat = Category(name=name, parent_name=parent_name)
        db.add(cat)
        await db.flush()
    return cat


async def create_transaction(
    db: AsyncSession, user_id: uuid.UUID, data: TransactionCreate
) -> TransactionOut:
    txn = Transaction(
        user_id=user_id,
        account_id=data.account_id,
        amount=data.amount,
        date=data.date,
        merchant_name=data.merchant_name,
        raw_name=data.raw_name,
        category_id=data.category_id,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == txn.id)
    )
    txn = result.scalar_one()
    return TransactionOut.model_validate(txn)


async def list_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    category_id: uuid.UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedTransactions:
    filters = [Transaction.user_id == user_id]
    if category_id:
        filters.append(Transaction.category_id == category_id)
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)

    count_q = select(func.count()).select_from(Transaction).where(and_(*filters))
    count_result = await db.execute(count_q)
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    q = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(and_(*filters))
        .order_by(Transaction.date.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(q)
    items = result.scalars().all()

    pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedTransactions(
        items=[TransactionOut.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_monthly_summary(
    db: AsyncSession, user_id: uuid.UUID, year: int, month: int
) -> TransactionSummary:
    from calendar import monthrange

    start = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

    q = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start,
                Transaction.date <= end,
            )
        )
    )
    result = await db.execute(q)
    transactions = result.scalars().all()

    income = Decimal("0")
    expenses = Decimal("0")
    by_category: dict[str, Decimal] = {}

    for t in transactions:
        amount = Decimal(str(t.amount))
        if amount < 0:
            income += abs(amount)
        else:
            expenses += amount
            cat_name = t.category.name if t.category else "Uncategorized"
            by_category[cat_name] = by_category.get(cat_name, Decimal("0")) + amount

    return TransactionSummary(
        income=income,
        expenses=expenses,
        net=income - expenses,
        by_category=by_category,
    )


async def delete_transaction(db: AsyncSession, user_id: uuid.UUID, txn_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(Transaction).where(
            and_(Transaction.id == txn_id, Transaction.user_id == user_id)
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        return False
    await db.delete(txn)
    await db.commit()
    return True
