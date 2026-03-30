from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.models import User
from app.schemas.auth import Token, UserCreate, UserLogin
from app.services.auth_service import create_access_token, hash_password, login_user, register_user
from app.services.demo_service import seed_demo_data

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        token = await register_user(db, data)
        return token
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=Token)
async def login(
    data: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        token = await login_user(db, data.email, data.password)
        return token
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/demo", response_model=Token)
async def demo_login(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    One-click demo login endpoint. Creates or retrieves demo@finsight.com user
    and seeds them with realistic demo transactions if they don't exist yet.
    Returns a JWT token for immediate access.
    """
    demo_email = "demo@finsight.com"
    demo_password = "demo123456"  # Fixed password for demo user

    # Check if demo user exists
    result = await db.execute(select(User).where(User.email == demo_email))
    demo_user = result.scalar_one_or_none()

    if not demo_user:
        # Create demo user
        demo_user = User(
            email=demo_email,
            hashed_password=hash_password(demo_password),
        )
        db.add(demo_user)
        await db.commit()
        await db.refresh(demo_user)

        # Seed demo data
        await seed_demo_data(demo_user.id, db)

    # Generate and return token
    token = create_access_token(demo_user.id, demo_user.email)
    return Token(access_token=token)
