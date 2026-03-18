"""Base agent abstract class and shared data structures."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator


@dataclass
class PipelineContext:
    conversation_id: str
    document_id: str | None
    records: list[dict[str, Any]] = field(default_factory=list)
    user_message: str = ""
    extracted_text: str = ""
    file_path: str | None = None
    file_ext: str | None = None


@dataclass
class AgentResult:
    agent_type: str
    success: bool
    data: dict[str, Any]
    message: str


class BaseAgent(ABC):
    agent_type: str = "base"

    @abstractmethod
    async def run(self, context: PipelineContext) -> AsyncGenerator[dict, None]:
        """Yields WebSocket event dicts as the agent processes."""
        yield {}  # pragma: no cover
