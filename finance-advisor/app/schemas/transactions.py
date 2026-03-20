import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    parent_name: Optional[str] = None

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    amount: Decimal
    date: datetime
    merchant_name: Optional[str] = None
    raw_name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    account_id: Optional[uuid.UUID] = None


class TransactionOut(BaseModel):
    id: uuid.UUID
    account_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    plaid_txn_id: Optional[str] = None
    amount: Decimal
    date: datetime
    merchant_name: Optional[str] = None
    raw_name: Optional[str] = None
    category: Optional[CategoryOut] = None
    is_anomaly: bool

    model_config = {"from_attributes": True}


class TransactionFilter(BaseModel):
    category_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 20


class CategoryTotal(BaseModel):
    name: str
    total: Decimal


class TransactionSummary(BaseModel):
    income: Decimal
    expenses: Decimal
    net: Decimal
    by_category: dict[str, Decimal]


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
    pages: int
