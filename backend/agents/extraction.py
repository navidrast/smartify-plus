"""Extraction agent -- wraps services/extractor.py for the pipeline."""

import asyncio
import logging
from typing import AsyncGenerator

from agents.base import BaseAgent, PipelineContext
from config import QWEN_API_BASE, QWEN_VISION_MODEL
from services.extractor import extract_from_file

logger = logging.getLogger(__name__)


class ExtractionAgent(BaseAgent):
    agent_type = "extraction"

    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        yield {
            "type": "agent_start",
            "agent": self.agent_type,
            "message": "Analysing document...",
        }

        if not context.file_path or not context.file_ext:
            yield {
                "type": "agent_error",
                "agent": self.agent_type,
                "error": "No file provided for extraction",
            }
            return

        try:
            records = await asyncio.to_thread(
                extract_from_file,
                context.file_path,
                context.file_ext,
                QWEN_API_BASE,
                QWEN_VISION_MODEL,
            )

            context.records = records

            yield {
                "type": "agent_progress",
                "agent": self.agent_type,
                "data": {"records_extracted": len(records)},
            }
            yield {
                "type": "agent_complete",
                "agent": self.agent_type,
                "data": {"records": records},
            }
        except Exception as exc:
            logger.exception("Extraction agent failed")
            yield {
                "type": "agent_error",
                "agent": self.agent_type,
                "error": str(exc)[:200],
            }
