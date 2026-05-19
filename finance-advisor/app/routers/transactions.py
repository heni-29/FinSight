import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.models import Category, User
from app.schemas.transactions import (
    CategoryOut,
    PaginatedTransactions,
    TransactionCreate,
    TransactionOut,
    TransactionSummary,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await transaction_service.create_transaction(db, current_user.id, data)


@router.get("", response_model=PaginatedTransactions)
async def list_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await transaction_service.list_transactions(
        db,
        user_id=current_user.id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )


@router.get("/summary", response_model=TransactionSummary)
async def get_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    year: int = Query(default=None),
    month: int = Query(default=None),
):
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month
    return await transaction_service.get_monthly_summary(db, current_user.id, y, m)


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return all categories seeded in the DB so the frontend can show real UUID-based options."""
    result = await db.execute(sa_select(Category).order_by(Category.name))
    cats = result.scalars().all()
    return [CategoryOut.model_validate(c) for c in cats]


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    deleted = await transaction_service.delete_transaction(db, current_user.id, transaction_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
