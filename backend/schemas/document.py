"""Document Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    conversation_id: str
    filename: str
    file_type: str
    file_size_bytes: int | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size_bytes: int
