from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.transactions import router as transactions_router
from app.routers.plaid import router as plaid_router
from app.routers.advisor import router as advisor_router

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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FinSight API"}
