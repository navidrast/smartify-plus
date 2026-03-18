"""
agent_pipeline.py -- Orchestrates all 6 agents sequentially, emitting WS events.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.ext.asyncio import AsyncSession

from agents.base import PipelineContext
from agents.extraction import ExtractionAgent
from agents.gst import GSTAgent
from agents.abn import ABNAgent
from agents.reconciliation import ReconciliationAgent
from agents.compliance import ComplianceAgent
from agents.reporting import ReportingAgent
from models.record import AgentEvent, ExtractedRecord
from models.document import Message

logger = logging.getLogger(__name__)


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
    Run the full 6-agent pipeline sequentially.

    Each agent yields WebSocket event dicts which are sent to the client
    and persisted as agent_events in the database.
    """
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
