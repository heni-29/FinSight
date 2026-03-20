import asyncio
import uuid
from datetime import datetime, timezone

import plaid
from plaid.api import plaid_api
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.models import Account, Category, Transaction
from app.services.encryption import decrypt, encrypt


PLAID_ENV_MAP = {
    "sandbox": plaid.Environment.Sandbox,
    "development": plaid.Environment.Sandbox,   # v38+ removed Development; use Sandbox
    "production": plaid.Environment.Production,
}

# Map Plaid categories to simplified local categories
CATEGORY_MAP = {
    "Food and Drink": "Food & Dining",
    "Shops": "Shopping",
    "Travel": "Travel",
    "Recreation": "Entertainment",
    "Healthcare": "Health & Fitness",
    "Service": "Bills & Utilities",
    "Community": "Personal",
    "Transfer": "Transfers",
    "Payment": "Payments",
    "Bank Fees": "Fees",
    "Interest": "Income",
    "Payroll": "Income",
    "Cash Advance": "Cash",
    "Deposit": "Income",
}


def _get_plaid_client() -> plaid_api.PlaidApi:
    env = PLAID_ENV_MAP.get(settings.PLAID_ENV.lower(), plaid.Environment.Sandbox)
    configuration = plaid.Configuration(
        host=env,
        api_key={
            "clientId": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


async def create_link_token(user_id: uuid.UUID) -> str:
    def _sync():
        client = _get_plaid_client()
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="FinSight AI Advisor",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
        )
        response = client.link_token_create(request)
        return response["link_token"]

    return await asyncio.to_thread(_sync)


async def exchange_public_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    public_token: str,
    institution_name: str,
    account_name: str,
) -> Account:
    def _sync():
        client = _get_plaid_client()
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        return client.item_public_token_exchange(request)

    response = await asyncio.to_thread(_sync)
    access_token = response["access_token"]
    item_id = response["item_id"]

    encrypted_token = encrypt(access_token)

    account = Account(
        user_id=user_id,
        plaid_item_id=item_id,
        plaid_access_token_enc=encrypted_token,
        institution_name=institution_name,
        account_name=account_name,
        last_synced=None,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def _get_or_create_category(db: AsyncSession, name: str, parent: str | None) -> Category:
    result = await db.execute(select(Category).where(Category.name == name))
    cat = result.scalar_one_or_none()
    if not cat:
        cat = Category(name=name, parent_name=parent)
        db.add(cat)
        await db.flush()
    return cat


async def sync_transactions(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Fetch latest transactions from Plaid for all user accounts and upsert."""
    # Fetch user's plaid accounts
    accounts_result = await db.execute(
        select(Account).where(
            and_(Account.user_id == user_id, Account.plaid_access_token_enc.isnot(None))
        )
    )
    accounts = accounts_result.scalars().all()

    if not accounts:
        return 0

    client = _get_plaid_client()
    total_synced = 0

    for account in accounts:
        access_token = decrypt(account.plaid_access_token_enc)

        # Use transactions sync API
        cursor = None
        added_txns = []

        while True:
            kwargs = {"access_token": access_token}
            if cursor:
                kwargs["cursor"] = cursor

            def _sync_txn(kw=kwargs):
                req = TransactionsSyncRequest(**kw)
                return client.transactions_sync(req)

            response = await asyncio.to_thread(_sync_txn)

            added_txns.extend(response["added"])
            if not response["has_more"]:
                break
            cursor = response["next_cursor"]

        for plaid_txn in added_txns:
            # Check if already exists
            existing = await db.execute(
                select(Transaction).where(Transaction.plaid_txn_id == plaid_txn["transaction_id"])
            )
            if existing.scalar_one_or_none():
                continue

            # Map category
            plaid_cats = plaid_txn.get("category") or []
            parent_cat = plaid_cats[0] if plaid_cats else "Other"
            local_cat_name = CATEGORY_MAP.get(parent_cat, parent_cat)
            category = await _get_or_create_category(db, local_cat_name, parent_cat)

            txn_date = plaid_txn.get("date")
            if isinstance(txn_date, str):
                from dateutil.parser import parse
                txn_date = parse(txn_date).replace(tzinfo=timezone.utc)
            elif hasattr(txn_date, "isoformat"):
                from datetime import date as date_type
                if isinstance(txn_date, date_type):
                    txn_date = datetime(txn_date.year, txn_date.month, txn_date.day, tzinfo=timezone.utc)

            new_txn = Transaction(
                account_id=account.id,
                user_id=user_id,
                plaid_txn_id=plaid_txn["transaction_id"],
                amount=plaid_txn.get("amount", 0),
                date=txn_date,
                merchant_name=plaid_txn.get("merchant_name"),
                raw_name=plaid_txn.get("name"),
                category_id=category.id,
            )
            db.add(new_txn)
            total_synced += 1

        account.last_synced = datetime.now(timezone.utc)

    await db.commit()
    return total_synced
