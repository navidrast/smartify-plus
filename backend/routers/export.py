"""Export router -- GET /api/export/excel and /api/export/pdf."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.record import ExtractedRecord
from services.output import generate_excel, generate_pdf_report

router = APIRouter(prefix="/api/export", tags=["export"])


async def _get_records_as_dicts(
    conversation_id: str, db: AsyncSession
) -> list[dict]:
    stmt = (
        select(ExtractedRecord)
        .where(ExtractedRecord.conversation_id == conversation_id)
        .order_by(ExtractedRecord.created_at.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [
        {
            "date": r.date,
            "amount": r.amount,
            "vendor": r.vendor,
            "description": r.description,
            "gst_code": r.gst_code,
            "confidence": r.confidence,
            "notes": r.notes,
        }
        for r in records
    ]


@router.get("/excel")
async def export_excel(
    conversation_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    records = await _get_records_as_dicts(conversation_id, db)
    if not records:
        return Response(content="No records found", status_code=404)

    excel_bytes = generate_excel(records)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=smartify_export.xlsx"},
    )


@router.get("/pdf")
async def export_pdf(
    conversation_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    records = await _get_records_as_dicts(conversation_id, db)
    if not records:
        return Response(content="No records found", status_code=404)

    pdf_bytes = generate_pdf_report(records)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=smartify_report.pdf"},
    )
