from app.routers.auth import router as auth_router
from app.routers.transactions import router as transactions_router
from app.routers.plaid import router as plaid_router
from app.routers.advisor import router as advisor_router

__all__ = ["auth_router", "transactions_router", "plaid_router", "advisor_router"]
