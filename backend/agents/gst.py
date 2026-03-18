"""GST agent -- uses qwen-plus to verify/correct GST classifications per ATO rules."""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from agents.base import BaseAgent, PipelineContext
from config import QWEN_API_BASE, QWEN_API_KEY, QWEN_TEXT_MODEL

logger = logging.getLogger(__name__)

_GST_REVIEW_PROMPT = """You are an Australian GST classification expert. Review these extracted financial records and verify/correct the GST code for each.

ATO GST rules:
- "10%" (taxable): retail, food service, fuel, hardware, electronics, professional services, transport
- "0%" (GST-free): medical/health, education, insurance, residential rent, fresh food, exports, bank fees
- "unknown": insufficient info to classify

For each record, also suggest a BAS (Business Activity Statement) category:
- G1: Total sales
- G10: Capital purchases
- G11: Non-capital purchases
- 1A: GST on sales
- 1B: GST on purchases

Return a JSON array where each element has:
{{"index": 0, "gst_code": "10%", "bas_category": "1B", "reason": "brief reason"}}

Records to review:
{records_json}

Return ONLY the JSON array."""


class GSTAgent(BaseAgent):
    agent_type = "gst"

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Verifying GST classifications...",
        }

        if not context.records:
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"message": "No records to review"},
            }
            return

        try:
            client = AsyncOpenAI(base_url=QWEN_API_BASE, api_key=QWEN_API_KEY)

            records_for_review = [
                {
                    "index": i,
                    "vendor": r.get("vendor"),
                    "description": r.get("description"),
                    "amount": r.get("amount"),
                    "gst_code": r.get("gst_code"),
                }
                for i, r in enumerate(context.records)
            ]

            response = await client.chat.completions.create(
                model=QWEN_TEXT_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": _GST_REVIEW_PROMPT.format(
                            records_json=json.dumps(records_for_review, indent=2)
                        ),
                    }
                ],
                temperature=0.05,
                max_tokens=2048,
                timeout=60,
            )

            raw = response.choices[0].message.content or "[]"
            raw = raw.strip().strip("`").strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()

            try:
                reviews = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("GST agent: could not parse LLM response")
                reviews = []

            updated_count = 0
            for review in reviews:
                idx = review.get("index")
                if idx is not None and 0 <= idx < len(context.records):
                    new_code = review.get("gst_code")
                    if new_code in ("10%", "0%", "unknown"):
                        context.records[idx]["gst_code"] = new_code
                    if review.get("bas_category"):
                        context.records[idx]["bas_category"] = review["bas_category"]
                    updated_count += 1

            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {
                    "records": context.records,
                    "reviewed": updated_count,
                },
            }
        except Exception as exc:
            logger.exception("GST agent failed")
            yield {
                "type": "agent_error",
                "agent": self.agent_type,
                "error": str(exc)[:200],
            }
