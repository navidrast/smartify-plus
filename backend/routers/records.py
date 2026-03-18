"""Records router -- GET /api/records."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.record import ExtractedRecord
from schemas.record import RecordOut

router = APIRouter(prefix="/api", tags=["records"])


@router.get("/records", response_model=list[RecordOut])
async def list_records(
    conversation_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ExtractedRecord)
        .where(ExtractedRecord.conversation_id == conversation_id)
        .order_by(ExtractedRecord.created_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
