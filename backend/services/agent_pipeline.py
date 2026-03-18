"""
agent_pipeline.py -- Orchestrates all 6 agents sequentially, emitting WS events.
"""

import json
import logging
import uuid
from typing import Callable

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base import PipelineContext
from agents.extraction import ExtractionAgent
from agents.gst import GSTAgent
from agents.abn import ABNAgent
from agents.reconciliation import ReconciliationAgent
from agents.compliance import ComplianceAgent
from agents.reporting import ReportingAgent
from config import QWEN_API_BASE, QWEN_API_KEY, QWEN_TEXT_MODEL
from models.record import AgentEvent, ExtractedRecord
from models.document import Message

logger = logging.getLogger(__name__)

_CHAT_SYSTEM = """You are Smartify, an AI accounting assistant for Australian accounting firms.
You help accountants with GST rules, ATO compliance, BAS preparation, invoice analysis, and general accounting queries.
Be concise, professional, and accurate. When relevant, reference Australian tax law and ATO guidelines."""


async def _conversational_reply(user_message: str, websocket_send: Callable) -> str:
    """Handle plain text messages with no document — use qwen-plus for chat."""
    client = AsyncOpenAI(base_url=QWEN_API_BASE, api_key=QWEN_API_KEY)
    response = await client.chat.completions.create(
        model=QWEN_TEXT_MODEL,
        messages=[
            {"role": "system", "content": _CHAT_SYSTEM},
            {"role": "user", "content": user_message},
        ],
        temperature=0.5,
        max_tokens=512,
        timeout=30,
    )
    reply = response.choices[0].message.content or "I'm here to help with your accounting queries."
    await websocket_send({"type": "message", "role": "assistant", "content": reply})
    return reply


async def run_pipeline(
    conversation_id: str,
    document_id: str | None,
    user_message: str,
    file_path: str | None,
    file_ext: str | None,
    websocket_send: Callable,
    db: AsyncSession,
) -> None:
    """
    If a document is attached: run the full 6-agent extraction pipeline.
    If text-only: reply conversationally via qwen-plus.
    """
    # Text-only message — no document to process
    if not file_path:
        try:
            reply = await _conversational_reply(user_message, websocket_send)
        except Exception as exc:
            reply = "Sorry, I couldn't process your message. Please try again."
            await websocket_send({"type": "message", "role": "assistant", "content": reply})
            logger.exception("Conversational reply failed: %s", exc)

        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=reply,
        )
        db.add(msg)
        await db.commit()
        await websocket_send({"type": "pipeline_done", "summary": {"total_records": 0, "total_amount": 0}})
        return

    context = PipelineContext(
        conversation_id=conversation_id,
        document_id=document_id,
        user_message=user_message,
        file_path=file_path,
        file_ext=file_ext,
    )

    agents = [
        ExtractionAgent(),
        GSTAgent(),
        ABNAgent(),
        ReconciliationAgent(db),
        ComplianceAgent(),
        ReportingAgent(),
    ]

    summary_text = ""

    for agent in agents:
        try:
            async for event in agent.run(context):
                # Send event via WebSocket
                await websocket_send(event)

                # Persist agent event
                agent_event = AgentEvent(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    agent_type=event.get("agent", agent.agent_type),
                    event_type=event.get("type", "unknown"),
                    payload_json=json.dumps(event),
                )
                db.add(agent_event)

                # Capture summary from reporting agent
                if (
                    agent.agent_type == "reporting"
                    and event.get("type") == "agent_complete"
                ):
                    summary_text = event.get("data", {}).get("summary", "")

        except Exception as exc:
            logger.exception("Agent %s crashed", agent.agent_type)
            error_event = {
                "type": "agent_error",
                "agent": agent.agent_type,
                "error": f"Agent crashed: {str(exc)[:200]}",
            }
            await websocket_send(error_event)

    # Persist extracted records to database
    for rec in context.records:
        db_record = ExtractedRecord(
            id=str(uuid.uuid4()),
            document_id=document_id,
            conversation_id=conversation_id,
            date=rec.get("date"),
            amount=rec.get("amount"),
            vendor=rec.get("vendor"),
            description=rec.get("description"),
            gst_code=rec.get("gst_code"),
            confidence=rec.get("confidence"),
            notes=rec.get("notes"),
            source_page=rec.get("_source"),
        )
        db.add(db_record)

    # Save assistant message with summary
    if summary_text:
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            agent_type="reporting",
            content=summary_text,
        )
        db.add(msg)

        await websocket_send({
            "type": "message",
            "role": "assistant",
            "content": summary_text,
        })

    await db.commit()

    # Send pipeline_done event
    total_amount = sum(
        float(r["amount"]) for r in context.records if r.get("amount") is not None
    )
    await websocket_send({
        "type": "pipeline_done",
        "summary": {
            "total_records": len(context.records),
            "total_amount": round(total_amount, 2),
        },
    })
