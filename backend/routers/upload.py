"""Upload router -- POST /api/upload for multipart file uploads."""

import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.document import Document
from schemas.document import UploadResponse

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp", ".xlsx", ".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")

    # Save to temp file for extraction pipeline
    tmp = tempfile.NamedTemporaryFile(
        suffix=ext, delete=False, prefix="smartify_upload_"
    )
    tmp.write(contents)
    tmp.close()

    doc_id = str(uuid.uuid4())
    doc = Document(
        id=doc_id,
        conversation_id=conversation_id,
        filename=file.filename,
        file_type=ext,
        file_size_bytes=len(contents),
    )
    db.add(doc)
    await db.commit()

    return UploadResponse(
        document_id=doc_id,
        filename=file.filename,
        file_type=ext,
        file_size_bytes=len(contents),
    )
