"""ExtractedRecord Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class RecordOut(BaseModel):
    id: str
    document_id: str | None
    conversation_id: str
    date: str | None
    amount: float | None
    vendor: str | None
    description: str | None
    gst_code: str | None
    confidence: float | None
    notes: str | None
    source_page: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
