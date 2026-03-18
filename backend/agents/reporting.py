"""Reporting agent -- generates natural language summary via qwen-plus."""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from agents.base import BaseAgent, PipelineContext
from config import QWEN_API_BASE, QWEN_API_KEY, QWEN_TEXT_MODEL

logger = logging.getLogger(__name__)

_SUMMARY_PROMPT = """You are a concise financial reporting assistant for Australian accounting firms.

Summarise these extracted financial records in 3-5 sentences for an accountant.
Include:
- Total number of records and total dollar amount
- GST breakdown (how many 10%, 0%, unknown)
- Any compliance flags or concerns (missing ABNs, low confidence, high-risk items)
- Recommendation for next steps

Records:
{records_json}

Write in professional Australian English. Be concise and actionable."""


class ReportingAgent(BaseAgent):
    agent_type = "reporting"

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Generating summary report...",
        }

        if not context.records:
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"summary": "No records to summarise."},
            }
            return

        try:
            client = AsyncOpenAI(base_url=QWEN_API_BASE, api_key=QWEN_API_KEY)

            summary_records = [
                {
                    "vendor": r.get("vendor"),
                    "amount": r.get("amount"),
                    "gst_code": r.get("gst_code"),
                    "confidence": r.get("confidence"),
                    "compliance_score": r.get("compliance_score"),
                    "compliance_flags": r.get("compliance_flags", []),
                    "notes": r.get("notes"),
                }
                for r in context.records
            ]

            response = await client.chat.completions.create(
                model=QWEN_TEXT_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": _SUMMARY_PROMPT.format(
                            records_json=json.dumps(summary_records, indent=2)
                        ),
                    }
                ],
                temperature=0.3,
                max_tokens=512,
                timeout=30,
            )

            summary = response.choices[0].message.content or "Summary generation failed."

            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"summary": summary},
            }
        except Exception as exc:
            logger.exception("Reporting agent failed")
            total_amount = sum(
                float(r["amount"]) for r in context.records if r.get("amount")
            )
            fallback = (
                f"Extracted {len(context.records)} record(s) totalling "
                f"${total_amount:,.2f}. Summary generation encountered an error."
            )
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"summary": fallback},
            }
