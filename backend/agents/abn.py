"""ABN agent -- validates ABN format and optionally looks up via ABR API."""

import logging
import re
from typing import AsyncGenerator

import aiohttp

from agents.base import BaseAgent, PipelineContext
from config import ABR_GUID

logger = logging.getLogger(__name__)

_ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]


def _validate_abn_checksum(abn: str) -> bool:
    """Validate an Australian Business Number using the modulus 89 algorithm."""
    digits = re.sub(r"\s", "", abn)
    if len(digits) != 11 or not digits.isdigit():
        return False
    nums = [int(d) for d in digits]
    nums[0] -= 1  # subtract 1 from the first digit per ATO algorithm
    total = sum(w * n for w, n in zip(_ABN_WEIGHTS, nums))
    return total % 89 == 0


def _extract_abns(text: str) -> list[str]:
    """Find potential ABN-like 11-digit sequences in text."""
    candidates = re.findall(r"\b(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})\b", text)
    return [re.sub(r"\s", "", c) for c in candidates if _validate_abn_checksum(c)]


class ABNAgent(BaseAgent):
    agent_type = "abn"

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Validating ABNs...",
        }

        all_text = " ".join(
            " ".join(
                filter(
                    None,
                    [r.get("vendor", ""), r.get("description", ""), r.get("notes", "")],
                )
            )
            for r in context.records
        )

        abns = _extract_abns(all_text)

        if not abns:
            for r in context.records:
                existing_notes = r.get("notes", "")
                if "missing ABN" not in existing_notes:
                    r["notes"] = "; ".join(filter(None, [existing_notes, "missing ABN"]))
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"abns_found": 0, "message": "No valid ABNs found in records"},
            }
            return

        lookup_results: dict[str, dict] = {}

        if ABR_GUID:
            try:
                async with aiohttp.ClientSession() as session:
                    for abn in abns[:5]:  # cap lookups to prevent abuse
                        url = (
                            f"https://abr.business.gov.au/json/AbnDetails.aspx"
                            f"?abn={abn}&guid={ABR_GUID}"
                        )
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                            if resp.status == 200:
                                text = await resp.text()
                                # ABR returns JSONP: callback({...})
                                text = re.sub(r"^[^(]+\(", "", text).rstrip(")")
                                import json
                                data = json.loads(text)
                                entity_name = ""
                                if data.get("EntityName"):
                                    entity_name = data["EntityName"]
                                elif data.get("BusinessName") and len(data["BusinessName"]) > 0:
                                    entity_name = data["BusinessName"][0].get("Name", "")
                                lookup_results[abn] = {
                                    "abn": abn,
                                    "entity_name": entity_name,
                                    "status": data.get("EntityStatus", ""),
                                    "gst_registered": bool(data.get("Gst")),
                                }
            except Exception as exc:
                logger.warning("ABR lookup failed: %s", exc)
        else:
            logger.info("ABR_GUID not set, skipping ABR API lookups")

        yield {
            "type": "agent_complete",
            "agent": self.agent_type,
            "data": {
                "abns_found": len(abns),
                "abns": abns,
                "lookups": lookup_results,
            },
        }
