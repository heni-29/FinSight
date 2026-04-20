from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.transactions import router as transactions_router
from app.routers.plaid import router as plaid_router
from app.routers.advisor import router as advisor_router
from app.routers.users import router as users_router
from app.database import AsyncSessionLocal
from app.services.demo_service import get_or_create_categories
from app.dependencies import set_category_cache

app = FastAPI(
    title="FinSight AI Finance Advisor",
    description="AI-powered personal finance advisor with real-time transaction analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://finsight29.netlify.app",
        "https://finsight-zqg9.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(plaid_router)
app.include_router(advisor_router)
app.include_router(users_router)


@app.on_event("startup")
async def startup_event():
    """
    Pre-create categories on app startup to avoid queries during demo login.
    This improves performance by ensuring categories exist before any seeding.
    Also populates in-memory cache for category lookups.
    Gracefully handles case where database hasn't been initialized yet.
    """
    try:
        async with AsyncSessionLocal() as session:
            categories = await get_or_create_categories(session)
            set_category_cache(categories)
    except Exception as e:
        # Database might not be initialized yet (tables don't exist)
        # Migrations will create tables on next startup
        print(f"Warning: Could not initialize categories cache on startup: {e}")
        print("Make sure to run: alembic upgrade head")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FinSight API"}
