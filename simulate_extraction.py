"""
simulate_extraction.py — Test output generation WITHOUT needing Ollama running.

Creates realistic sample records covering all edge cases:
  - Perfect extraction (high confidence)
  - GST-free medical service
  - Handwritten receipt (low confidence, missing date)
  - Bank statement transaction line
  - Complete extraction failure (confidence 0.0)
  - OCR fallback record

Writes:
  test_output.xlsx  — full Excel workbook with Summary + Extracted Data sheets
  test_output.pdf   — landscape A4 PDF report

Run from project root:
  python simulate_extraction.py

No Ollama required — directly calls output.py generators.
"""

import json
from output import generate_excel, generate_pdf_report

# Realistic sample records mirroring real extractor.py output
SAMPLE_RECORDS = [
    {
        # Perfect extraction — Woolworths retail receipt
        "date": "15/03/2026",
        "amount": 125.40,
        "vendor": "Woolworths Supermarkets",
        "description": "Grocery shopping — office snacks and cleaning supplies",
        "gst_code": "10%",
        "confidence": 0.97,
        "notes": "",
        "_source": "image",
    },
    {
        # GST-free medical service — high confidence
        "date": "14/03/2026",
        "amount": 350.00,
        "vendor": "Dr. Sarah Chen Medical Centre",
        "description": "GP consultation and blood test referral — bulk billed",
        "gst_code": "0%",
        "confidence": 0.94,
        "notes": "GST-free medical service",
        "_source": "image",
    },
    {
        # Handwritten receipt — missing date, lower confidence
        "date": None,
        "amount": 89.99,
        "vendor": "JB Hi-Fi",
        "description": "USB-C hub and HDMI 2.1 cable",
        "gst_code": "10%",
        "confidence": 0.68,
        "notes": "missing date; handwritten document; date smudged",
        "_source": "page 1",
    },
    {
        # Bank statement transaction line — multi-page PDF
        "date": "12/03/2026",
        "amount": 1240.00,
        "vendor": "Bunnings Warehouse",
        "description": "Building materials — kitchen renovation project",
        "gst_code": "10%",
        "confidence": 0.91,
        "notes": "bank statement line",
        "_source": "page 2",
    },
    {
        # Insurance payment — GST-free
        "date": "10/03/2026",
        "amount": 420.00,
        "vendor": "Medibank Private",
        "description": "Hospital cover premium — monthly payment",
        "gst_code": "0%",
        "confidence": 0.89,
        "notes": "missing ABN",
        "_source": "page 2",
    },
    {
        # Completely unclear handwritten receipt
        "date": "10/03/2026",
        "amount": None,
        "vendor": None,
        "description": "Handwritten receipt — vendor and amount unreadable",
        "gst_code": "unknown",
        "confidence": 0.41,
        "notes": "missing amount; missing vendor; low quality scan; handwritten document",
        "_source": "page 3",
    },
    {
        # OCR fallback record
        "date": "08/03/2026",
        "amount": 55.00,
        "vendor": "City Parking Pty Ltd",
        "description": "Parking — CBD Melbourne",
        "gst_code": "10%",
        "confidence": 0.58,
        "notes": "OCR fallback (vision unavailable); amount approximate",
        "_source": "page 3",
    },
    {
        # Complete extraction failure — both vision and OCR failed
        "date": None,
        "amount": None,
        "vendor": None,
        "description": "Extraction failed — page 4",
        "gst_code": "unknown",
        "confidence": 0.0,
        "notes": "Vision error: Connection timeout; OCR error: Tesseract returned empty text",
        "_source": "page 4",
    },
]

if __name__ == "__main__":
    print("=" * 55)
    print("Smartify Plus — Output Generation Test")
    print("=" * 55)

    print(f"\n📊 Processing {len(SAMPLE_RECORDS)} sample records...")

    # ── Generate Excel ────────────────────────────────────────────────────
    print("\nGenerating Excel workbook...")
    xl_bytes = generate_excel(SAMPLE_RECORDS)
    with open("test_output.xlsx", "wb") as f:
        f.write(xl_bytes)
    print(f"  ✅ test_output.xlsx — {len(xl_bytes):,} bytes")

    # ── Generate PDF ──────────────────────────────────────────────────────
    print("\nGenerating PDF report...")
    pdf_bytes = generate_pdf_report(SAMPLE_RECORDS)
    with open("test_output.pdf", "wb") as f:
        f.write(pdf_bytes)
    print(f"  ✅ test_output.pdf  — {len(pdf_bytes):,} bytes")

    # ── Show summary ──────────────────────────────────────────────────────
    total = sum(r["amount"] for r in SAMPLE_RECORDS if r.get("amount"))
    n_10  = sum(1 for r in SAMPLE_RECORDS if r["gst_code"] == "10%")
    n_0   = sum(1 for r in SAMPLE_RECORDS if r["gst_code"] == "0%")
    n_unk = sum(1 for r in SAMPLE_RECORDS if r["gst_code"] == "unknown")
    n_low = sum(1 for r in SAMPLE_RECORDS if float(r.get("confidence", 0)) < 0.85)

    print("\n" + "─" * 40)
    print("Expected extraction summary:")
    print(f"  Total amount   : ${total:,.2f}")
    print(f"  10% GST        : {n_10} records")
    print(f"  0%  GST        : {n_0} records")
    print(f"  Unknown GST    : {n_unk} records")
    print(f"  Low confidence : {n_low} records (<85%)")
    print("─" * 40)

    print("\nSample perfect-extraction JSON (what Ollama returns for a clear receipt):")
    print(json.dumps({k: v for k, v in SAMPLE_RECORDS[0].items() if not k.startswith("_")}, indent=2))

    print("\n✅ Done — open test_output.xlsx and test_output.pdf to verify output.")
