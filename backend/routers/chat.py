"""Chat router -- POST /api/chat and WS /ws/{conversation_id}."""

import json
import logging
import os
import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, async_session
from models.conversation import Conversation
from models.document import Document, Message
from schemas.message import ChatRequest
from services.agent_pipeline import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/api/chat")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Non-streaming chat endpoint. Returns immediately; actual processing via WebSocket."""
    stmt = select(Conversation).where(Conversation.id == body.conversation_id)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=body.conversation_id,
        role="user",
        content=body.message,
    )
    db.add(msg)
    await db.commit()

    return {"status": "received", "message_id": msg.id}


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: str,
):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            message = payload.get("message", "")
            document_ids = payload.get("document_ids", [])

            async with async_session() as db:
                # Save user message
                user_msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="user",
                    content=message,
                )
                db.add(user_msg)
                await db.commit()

                # Resolve file path from document if provided
                file_path = None
                file_ext = None

                if document_ids:
                    stmt = select(Document).where(Document.id == document_ids[0])
                    result = await db.execute(stmt)
                    doc = result.scalar_one_or_none()
                    if doc:
                        file_ext = doc.file_type
                        # Look for the temp file matching this document
                        import tempfile
                        import glob

                        tmp_dir = tempfile.gettempdir()
                        candidates = sorted(
                            [
                                f
                                for f in os.listdir(tmp_dir)
                                if f.startswith("smartify_upload_")
                                and f.endswith(file_ext)
                            ],
                            key=lambda f: os.path.getmtime(
                                os.path.join(tmp_dir, f)
                            ),
                            reverse=True,
                        )
                        if candidates:
                            file_path = os.path.join(tmp_dir, candidates[0])

                async def ws_send(event: dict):
                    await websocket.send_text(json.dumps(event))

                await run_pipeline(
                    conversation_id=conversation_id,
                    document_id=document_ids[0] if document_ids else None,
                    user_message=message,
                    file_path=file_path,
                    file_ext=file_ext,
                    websocket_send=ws_send,
                    db=db,
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for conversation %s", conversation_id)
    except Exception as exc:
        logger.exception("WebSocket error for conversation %s", conversation_id)
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "error": str(exc)[:200]})
            )
        except Exception:
            pass
