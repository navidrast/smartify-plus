"""Conversations router -- CRUD for conversations and messages."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import DEMO_USER_ID
from database import get_db
from models.conversation import Conversation
from models.document import Message
from schemas.conversation import ConversationCreate, ConversationOut
from schemas.message import MessageOut

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == DEMO_USER_ID)
        .order_by(Conversation.updated_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/conversations", response_model=ConversationOut)
async def create_conversation(
    body: ConversationCreate = ConversationCreate(),
    db: AsyncSession = Depends(get_db),
):
    conv = Conversation(
        id=str(uuid.uuid4()),
        user_id=DEMO_USER_ID,
        title=body.title or "New Conversation",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return {"status": "deleted"}


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
