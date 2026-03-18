"""Reconciliation agent -- detects duplicate records within the conversation."""

import logging
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.base import BaseAgent, PipelineContext
from models.record import ExtractedRecord

logger = logging.getLogger(__name__)


def _similarity_key(record: dict) -> tuple:
    """Create a normalised key for duplicate detection."""
    date = (record.get("date") or "").strip().lower()
    amount = record.get("amount")
    amount_key = round(float(amount), 2) if amount is not None else None
    vendor = (record.get("vendor") or "").strip().lower()[:30]
    return (date, amount_key, vendor)


class ReconciliationAgent(BaseAgent):
    agent_type = "reconciliation"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Checking for duplicates...",
        }

        if not context.records:
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"duplicates": 0},
            }
            return

        try:
            # Get existing records for this conversation
            stmt = select(ExtractedRecord).where(
                ExtractedRecord.conversation_id == context.conversation_id
            )
            result = await self.db.execute(stmt)
            existing = result.scalars().all()

            existing_keys = set()
            for rec in existing:
                key = _similarity_key({
                    "date": rec.date,
                    "amount": rec.amount,
                    "vendor": rec.vendor,
                })
                existing_keys.add(key)

            duplicates = []
            for i, rec in enumerate(context.records):
                key = _similarity_key(rec)
                if key in existing_keys and key[1] is not None:
                    duplicates.append({
                        "index": i,
                        "date": rec.get("date"),
                        "amount": rec.get("amount"),
                        "vendor": rec.get("vendor"),
                    })
                    existing_notes = rec.get("notes", "")
                    rec["notes"] = "; ".join(
                        filter(None, [existing_notes, "potential duplicate"])
                    )

            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {
                    "duplicates": len(duplicates),
                    "duplicate_records": duplicates,
                },
            }
        except Exception as exc:
            logger.exception("Reconciliation agent failed")
            yield {
                "type": "agent_error",
                "agent": self.agent_type,
                "error": str(exc)[:200],
            }
