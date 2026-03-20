from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.advisor import ChatMessage
from app.services.ai_service import chat_stream

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.post("/chat")
async def chat(
    data: ChatMessage,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    async def event_stream():
        async for chunk in chat_stream(db, current_user.id, data.message):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
