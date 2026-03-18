"""Compliance agent -- scores each record for ATO compliance risk."""

import logging
from typing import AsyncGenerator

from agents.base import BaseAgent, PipelineContext

logger = logging.getLogger(__name__)


def _score_record(record: dict) -> tuple[int, list[str]]:
    """Score a record 0-10 for ATO compliance risk. Higher = more risky."""
    score = 0
    flags: list[str] = []

    # Missing ABN is a compliance concern
    notes = (record.get("notes") or "").lower()
    if "missing abn" in notes:
        score += 3
        flags.append("missing ABN")

    # Low confidence extraction
    conf = float(record.get("confidence") or 0)
    if conf < 0.7:
        score += 3
        flags.append(f"low confidence ({conf:.0%})")
    elif conf < 0.85:
        score += 1
        flags.append(f"moderate confidence ({conf:.0%})")

    # Unknown GST code
    if record.get("gst_code") == "unknown":
        score += 2
        flags.append("unclassified GST")

    # High amount without ABN
    amount = record.get("amount")
    if amount is not None and float(amount) > 10000:
        if "missing abn" in notes:
            score += 2
            flags.append("high value without ABN (>$10,000)")

    # Missing date
    if record.get("date") is None:
        score += 1
        flags.append("missing date")

    return min(score, 10), flags


class ComplianceAgent(BaseAgent):
    agent_type = "compliance"

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Scoring compliance risk...",
        }

        if not context.records:
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"message": "No records to score"},
            }
            return

        scored_records = []
        high_risk_count = 0

        for i, rec in enumerate(context.records):
            score, flags = _score_record(rec)
            rec["compliance_score"] = score
            rec["compliance_flags"] = flags
            if score >= 6:
                high_risk_count += 1
            scored_records.append({
                "index": i,
                "score": score,
                "flags": flags,
            })

        yield {
            "type": "agent_complete",
            "agent": self.agent_type,
            "data": {
                "scores": scored_records,
                "high_risk_count": high_risk_count,
                "total_scored": len(scored_records),
            },
        }
