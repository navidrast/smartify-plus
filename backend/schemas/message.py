"""Message and Chat Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    document_ids: list[str] = []


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    agent_type: str | None
    content: str
    metadata_json: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
