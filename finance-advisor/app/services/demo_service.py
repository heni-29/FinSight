import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Category, Transaction


# Demo transaction data with categories and realistic amounts
DEMO_TRANSACTIONS = [
    {"merchant": "Whole Foods Market", "category": "Groceries", "amount": 87.43},
    {"merchant": "Trader Joe's", "category": "Groceries", "amount": 62.19},
    {"merchant": "Chipotle Mexican Grill", "category": "Dining", "amount": 14.57},
    {"merchant": "Starbucks", "category": "Dining", "amount": 6.45},
    {"merchant": "Pizza Hut", "category": "Dining", "amount": 28.99},
    {"merchant": "Uber", "category": "Transport", "amount": 12.50},
    {"merchant": "Shell Gas Station", "category": "Transport", "amount": 55.00},
    {"merchant": "Lyft", "category": "Transport", "amount": 18.75},
    {"merchant": "AMC Theatres", "category": "Entertainment", "amount": 32.00},
    {"merchant": "Netflix Subscription", "category": "Entertainment", "amount": 15.99},
    {"merchant": "Spotify Premium", "category": "Entertainment", "amount": 12.99},
    {"merchant": "Nike Store", "category": "Shopping", "amount": 125.50},
    {"merchant": "Amazon", "category": "Shopping", "amount": 67.80},
    {"merchant": "H&M", "category": "Shopping", "amount": 89.99},
    {"merchant": "CVS Pharmacy", "category": "Health", "amount": 34.21},
    {"merchant": "Gym Membership", "category": "Health", "amount": 45.00},
    {"merchant": "Whole Foods Market", "category": "Groceries", "amount": 92.11},
    {"merchant": "Target", "category": "Shopping", "amount": 156.43},
    {"merchant": "Burger King", "category": "Dining", "amount": 11.32},
    {"merchant": "Google Fiber", "category": "Utilities", "amount": 80.00},
    {"merchant": "ComEd Electric", "category": "Utilities", "amount": 125.67},
    {"merchant": "AT&T Mobile", "category": "Utilities", "amount": 65.00},
    {"merchant": "DoorDash", "category": "Dining", "amount": 22.45},
    {"merchant": "Trader Joe's", "category": "Groceries", "amount": 58.76},
    {"merchant": "Best Buy", "category": "Shopping", "amount": 299.99},
]

# Income transactions
DEMO_INCOME = [
    {"merchant": "Employer Salary Deposit", "amount": 5000.00},
    {"merchant": "Freelance Project Payment", "amount": 1200.00},
]


async def seed_demo_data(user_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Seed demo user with realistic transactions spread over the last 30 days.
    Only inserts if the user has no existing transactions.
    """
    # Check if user already has transactions
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == user_id).limit(1)
    )
    if result.scalar_one_or_none():
        # User already has transactions, don't seed again
        return

    # Get or create categories
    categories_data = {
        "Groceries": None,
        "Dining": None,
        "Transport": None,
        "Entertainment": None,
        "Shopping": None,
        "Health": None,
        "Utilities": None,
        "Income": None,
    }

    for cat_name in categories_data.keys():
        result = await db.execute(
            select(Category).where(Category.name == cat_name)
        )
        category = result.scalar_one_or_none()
        if not category:
            category = Category(name=cat_name)
            db.add(category)
        categories_data[cat_name] = category

    await db.flush()  # Ensure categories are created before adding transactions

    # Create transactions spread over last 30 days
    now = datetime.now(timezone.utc)
    transactions = []

    # Add expense transactions
    for idx, txn_data in enumerate(DEMO_TRANSACTIONS):
        days_offset = (idx % 30)
        transaction_date = now - timedelta(days=days_offset)

        category = categories_data[txn_data["category"]]
        transaction = Transaction(
            user_id=user_id,
            merchant_name=txn_data["merchant"],
            amount=Decimal(str(txn_data["amount"])),
            date=transaction_date,
            category_id=category.id if category else None,
            is_anomaly=False,
        )
        transactions.append(transaction)
        db.add(transaction)

    # Add income transactions
    for idx, txn_data in enumerate(DEMO_INCOME):
        days_offset = (idx * 14)  # Space them out by 2 weeks
        if days_offset <= 30:
            transaction_date = now - timedelta(days=days_offset)
            category = categories_data.get("Income")
            transaction = Transaction(
                user_id=user_id,
                merchant_name=txn_data["merchant"],
                amount=Decimal(str(-txn_data["amount"])),  # Negative for income
                date=transaction_date,
                category_id=category.id if category else None,
                is_anomaly=False,
            )
            transactions.append(transaction)
            db.add(transaction)

    await db.commit()
