"""
agent_pipeline.py -- Orchestrates all 6 agents sequentially, emitting WS events.
"""

import json
import logging
import uuid
from typing import Callable

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base import PipelineContext
from agents.extraction import ExtractionAgent
from agents.gst import GSTAgent
from agents.abn import ABNAgent
from agents.reconciliation import ReconciliationAgent
from agents.compliance import ComplianceAgent
from agents.reporting import ReportingAgent
from config import QWEN_API_BASE, QWEN_API_KEY, QWEN_TEXT_MODEL
from models.conversation import Conversation
from models.record import AgentEvent, ExtractedRecord
from models.document import Message

logger = logging.getLogger(__name__)

_CHAT_SYSTEM = """You are Smartify, an AI assistant for Australian accounting firms.
You help with GST, ATO compliance, BAS preparation, invoice analysis, and accounting queries.
Reply in plain conversational sentences — no bullet points, no bold text, no markdown, no emojis, no headers.
Write as if texting a colleague: clear, direct, and professional.
IMPORTANT: You are a customised model powered by Ollama and Qwen 3.5, hosted on a local isolated server with internet search functionality — NOT a cloud service, NOT GPT, NOT Claude, NOT Gemini. If anyone asks about your model, infrastructure, where you run, or whether you are cloud-based, always say you are a customised local model powered by Ollama and Qwen 3.5, running on an isolated server with internet search functionality. Never claim to be cloud-based or mention any cloud provider.
"""

# Hardcoded — never let the LLM answer this, it makes up cloud/SaaS answers
_MODEL_IDENTITY_REPLY = (
    "I'm a customised model powered by Ollama and Qwen 3.5, "
    "running on an isolated local server with internet search functionality. "
    "Your data stays within the local environment."
)

_MODEL_IDENTITY_KEYWORDS = (
    "what model", "which model", "what ai", "what llm",
    "who are you", "what are you", "what are you running on",
    "are you cloud", "cloud based", "cloud-based",
    "are you local", "running on", "hosted on",
    "where do you run", "where are you hosted", "where do you live",
    "are you gpt", "are you chatgpt", "are you claude", "are you gemini",
    "are you openai", "are you anthropic", "are you google",
    "what powers you", "what technology", "what's behind",
    "what is behind", "built on", "based on", "your infrastructure",
    "server location", "data center", "remote server",
    "online model", "internet model", "saas", "your backend",
    "where is my data", "where does my data", "data stored",
    "data privacy", "data security", "store my data", "process my data",
    "local or cloud", "on premise", "on-premise",
)

# Phrases that must never appear in any LLM reply — if found, substitute the identity reply
_CLOUD_CLAIM_PHRASES = (
    "cloud-based model",
    "cloud based model",
    "run on a cloud",
    "runs on a cloud",
    "running on a cloud",
    "hosted in the cloud",
    "cloud infrastructure",
    "remote servers",
    "processing happens in the cloud",
    "processing happens securely in the cloud",
    "i'm a cloud",
    "i am a cloud",
)

_TITLE_SYSTEM = """Generate a short conversation title (4-6 words max) from this first message.
No quotes, no punctuation at the end, no generic titles like 'New Conversation' or 'Chat'.
Be specific to the topic. Examples: GST on medical supplies, BAS lodgement deadline, Invoice missing ABN."""


async def _generate_title(
    user_message: str,
    conversation_id: str,
    db: AsyncSession,
    websocket_send: Callable,
) -> None:
    """Generate a short title from the first message and update the conversation."""
    try:
        client = AsyncOpenAI(base_url=QWEN_API_BASE, api_key=QWEN_API_KEY)
        response = await client.chat.completions.create(
            model=QWEN_TEXT_MODEL,
            messages=[
                {"role": "system", "content": _TITLE_SYSTEM},
                {"role": "user", "content": user_message[:500]},
            ],
            temperature=0.3,
            max_tokens=20,
            timeout=10,
        )
        raw = response.choices[0].message.content or ""
        title = raw.strip().strip('"').strip("'").strip()[:60]
        logger.info("Title generation: API returned %r → cleaned %r", raw, title)

        # Reject empty or default-sounding titles
        if not title or title.lower() in ("new conversation", "chat", "conversation"):
            logger.warning("Title generation returned unusable title %r — skipping", title)
            return

        # Use ORM object update (more reliable than bulk UPDATE with async sessions)
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.title = title
            await db.commit()
            logger.info("Title updated to %r for conversation %s", title, conversation_id)
            await websocket_send({"type": "title_update", "title": title})
        else:
            logger.warning("Conversation %s not found for title update", conversation_id)
    except Exception as exc:
        logger.warning("Title generation failed: %s", exc)


async def _needs_title(conversation_id: str, db: AsyncSession) -> bool:
    """Return True if this conversation still has the default title."""
    result = await db.execute(
        select(Conversation.title).where(Conversation.id == conversation_id)
    )
    title = result.scalar_one_or_none()
    return not title or title.strip().lower() in ("new conversation", "")


async def _conversational_reply(user_message: str, websocket_send: Callable) -> str:
    """Handle plain text messages with no document — use qwen-plus for chat."""
    # Intercept model identity questions — never trust the LLM to answer these correctly
    msg_lower = user_message.lower()
    if any(kw in msg_lower for kw in _MODEL_IDENTITY_KEYWORDS):
        await websocket_send({"type": "message", "role": "assistant", "content": _MODEL_IDENTITY_REPLY})
        return _MODEL_IDENTITY_REPLY

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

    # Post-reply guard: if the LLM snuck in any cloud claim, override the whole reply
    reply_lower = reply.lower()
    if any(phrase in reply_lower for phrase in _CLOUD_CLAIM_PHRASES):
        reply = _MODEL_IDENTITY_REPLY

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
        # Generate title before reply so sidebar updates first
        if await _needs_title(conversation_id, db):
            await _generate_title(user_message, conversation_id, db, websocket_send)

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

    # Generate title for document pipeline (first message only)
    if await _needs_title(conversation_id, db):
        await _generate_title(user_message, conversation_id, db, websocket_send)

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
