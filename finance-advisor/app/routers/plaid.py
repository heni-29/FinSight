from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.plaid import PlaidExchangeRequest, PlaidLinkTokenResponse, PlaidSyncResponse
from app.services import plaid_service

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token", response_model=PlaidLinkTokenResponse)
async def create_link_token(
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        link_token = await plaid_service.create_link_token(current_user.id)
        return PlaidLinkTokenResponse(link_token=link_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Plaid error: {str(e)}")


@router.post("/exchange", status_code=status.HTTP_201_CREATED)
async def exchange_token(
    data: PlaidExchangeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        account = await plaid_service.exchange_public_token(
            db,
            current_user.id,
            data.public_token,
            data.institution_name,
            data.account_name,
        )
        return {"account_id": str(account.id), "message": "Bank account connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Plaid error: {str(e)}")


@router.post("/sync", response_model=PlaidSyncResponse)
async def sync_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        synced = await plaid_service.sync_transactions(db, current_user.id)
        return PlaidSyncResponse(synced=synced, message=f"Synced {synced} new transactions")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sync error: {str(e)}")
