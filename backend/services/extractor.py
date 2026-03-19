"""
services/extractor.py -- Config shim + verbatim copy of root extractor.py.

The shim maps QWEN_* env vars to OLLAMA_* so the extraction engine works
with both local Ollama and cloud Qwen endpoints without code changes.
"""

import os

if not os.getenv("OLLAMA_API_KEY") and os.getenv("QWEN_API_KEY"):
    os.environ["OLLAMA_API_KEY"] = os.getenv("QWEN_API_KEY")
if not os.getenv("OLLAMA_API_BASE") and os.getenv("QWEN_API_BASE"):
    os.environ["OLLAMA_API_BASE"] = os.getenv("QWEN_API_BASE")
if not os.getenv("OLLAMA_MODEL") and os.getenv("QWEN_VISION_MODEL"):
    os.environ["OLLAMA_MODEL"] = os.getenv("QWEN_VISION_MODEL")

# ── Everything below is verbatim from root extractor.py ──────────────────────

import base64
import io
import json
import logging
import re
import tempfile
from pathlib import Path
from typing import Any

import fitz
from openai import OpenAI
from PIL import Image

logger = logging.getLogger(__name__)


EXTRACTION_SYSTEM_PROMPT = """You are a precise financial document extraction engine for Australian accounting firms.
Your task: Extract structured data from receipts, invoices, handwritten notes, and bank statements.

HANDWRITING RULES:
- Carefully read messy cursive and printed handwriting; ignore smudges, folds, and stains.
- Prioritise dollar amounts, dates (DD/MM/YYYY), ABNs (11-digit numbers), and vendor names.
- When a character is ambiguous (e.g. 0 vs O, 1 vs I), use financial context to decide.
- Be conservative — use null rather than guess incorrectly.

OUTPUT RULES (NON-NEGOTIABLE):
1. Return ONLY valid JSON — no markdown, no explanation, no surrounding text.
2. Your FIRST character MUST be { or [ — nothing before it.
3. Null fields must be JSON null, not the string "null" or "N/A".
4. For single receipts/invoices → return a single JSON object {}.
5. For bank statements with multiple transaction lines → return a JSON array [].
6. If a page is blank or completely unreadable → return:
   {"date":null,"amount":null,"vendor":null,"description":"unreadable page","gst_code":"unknown","confidence":0.1,"notes":"page unreadable or blank"}

SINGLE DOCUMENT SCHEMA:
{
  "date": "DD/MM/YYYY string, or null if not found",
  "amount": float total amount including GST (e.g. 12.50), or null,
  "vendor": "business or person name string, or null",
  "description": "brief description of goods or services, or null",
  "gst_code": "10%" | "0%" | "unknown",
  "confidence": float between 0.0 and 1.0,
  "notes": "optional flags: missing ABN, handwritten, low quality scan, etc. Empty string if none."
}

BANK STATEMENT ARRAY SCHEMA:
[ { ...same fields as above per transaction line... } ]"""

EXTRACTION_USER_PROMPT = """Extract ALL financial transactions or document data visible in this image.

AUSTRALIAN GST CLASSIFICATION GUIDE:
- "10%" (taxable supplies):
    retail, groceries, electronics, hardware, fuel, restaurants, cafes,
    clothing, office supplies, software, accounting services, tradesperson work,
    car repairs, cleaning services, parking, taxis, ride-share, courier fees

- "0%" (GST-free supplies):
    fresh/unprocessed food, medical/health services, education/tuition,
    insurance premiums, residential rent, exported goods, bank interest/fees,
    childcare, certain government charges

- "unknown": insufficient information to classify with confidence

AMOUNT RULES:
- Extract the TOTAL amount including GST, not the GST-exclusive subtotal.
- If only a GST-exclusive amount is shown and gst_code is "10%", multiply by 1.1.
- Strip $ signs and commas; return as a plain float (e.g. 1234.50 not "$1,234.50").

NOTES FLAGS (add any that apply, semicolon-separated):
  "missing ABN" | "handwritten document" | "low quality scan" |
  "missing date" | "missing amount" | "amount unclear" | "multiple pages" | "OCR fallback"

Return ONLY the JSON. First character must be { or [."""


_GST_10_KEYWORDS: frozenset[str] = frozenset({
    "woolworths", "coles", "aldi", "iga", "costco", "harris farm", "foodworks",
    "officeworks", "bunnings", "harvey norman", "jb hi-fi", "kmart",
    "target", "big w", "the good guys", "myer", "david jones", "rebel sport",
    "mcdonald", "kfc", "subway", "domino", "pizza hut", "hungry jacks",
    "uber eats", "deliveroo", "doordash", "menulog", "cafe", "restaurant",
    "bakery", "butcher", "deli", "takeaway", "food court", "coffee", "espresso",
    "bp", "shell", "caltex", "ampol", "7-eleven", "puma energy",
    "united petroleum", "petrol", "diesel", "fuel", "servo",
    "mitre 10", "total tools", "sydney tools", "plumber", "electrician",
    "builder", "tradie", "hardware", "scaffolding", "concreter",
    "xero", "myob", "quickbooks", "accountant", "bookkeeper",
    "solicitor", "lawyer", "consultant", "marketing", "advertising", "it support",
    "uber", "didi", "ola", "taxi", "toll", "parking", "e-toll",
    "grocery", "supermarket", "retail", "clothing", "shoes", "apparel",
    "electronics", "software", "stationery", "equipment", "tools", "furniture",
    "cleaning", "laundry", "gym", "fitness", "subscription",
})

_GST_FREE_KEYWORDS: frozenset[str] = frozenset({
    "medical centre", "medicare", "doctor", "gp clinic", "hospital",
    "pharmacy", "chemist warehouse", "priceline pharmacy", "terry white",
    "dentist", "dental", "optometrist", "physiotherapist", "physio",
    "chiropractor", "psychologist", "pathology", "radiology", "mri", "specialist",
    "bulk billing", "health fund", "medibank", "bupa", "hcf", "nib",
    "school", "university", "tafe", "college", "tuition", "course fee",
    "training", "childcare", "preschool", "kindergarten", "daycare",
    "bank fee", "account keeping fee", "bank charge", "interest charge",
    "loan repayment", "mortgage", "atm fee", "bpay fee",
    "insurance premium", "life insurance", "income protection",
    "car insurance", "home insurance", "building insurance",
    "residential rent", "rent payment", "lease",
    "fresh fruit", "fresh vegetable", "fruit market", "vegetable market",
    "unprocessed meat", "fish market", "seafood market", "farmers market",
    "export", "overseas freight", "international shipping", "customs duty",
})


def classify_gst(vendor: str | None, description: str | None, model_code: str) -> str:
    if model_code in ("10%", "0%"):
        return model_code
    search = " ".join(filter(None, [vendor, description])).lower()
    if any(kw in search for kw in _GST_10_KEYWORDS):
        return "10%"
    if any(kw in search for kw in _GST_FREE_KEYWORDS):
        return "0%"
    return "unknown"


def _flag_missing_fields(record: dict[str, Any]) -> dict[str, Any]:
    flags: list[str] = []
    if record.get("date") is None:
        flags.append("missing date")
    if record.get("amount") is None:
        flags.append("missing amount")
    if record.get("vendor") is None:
        flags.append("missing vendor")
    if flags:
        existing = (record.get("notes") or "").strip().rstrip(";")
        record["notes"] = "; ".join(filter(None, [existing] + flags))
        record["confidence"] = min(float(record.get("confidence") or 0.5), 0.70)
    return record


def pdf_to_images_b64(pdf_path: str, dpi: int = 250) -> list[str]:
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    doc = fitz.open(pdf_path)
    pages_b64: list[str] = []
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
            png_bytes = pix.tobytes("png")
            pages_b64.append(base64.b64encode(png_bytes).decode("utf-8"))
            logger.debug("Rendered PDF page %d/%d", page_num + 1, len(doc))
    finally:
        doc.close()
    return pages_b64


def image_file_to_b64(image_path: str) -> str:
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        buf = io.BytesIO()
        img_rgb.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")


def _call_ollama_vision(client: OpenAI, model: str, image_b64: str, timeout: int = 120) -> str:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                    {"type": "text", "text": EXTRACTION_USER_PROMPT},
                ],
            },
        ],
        temperature=0.05,
        max_tokens=2048,
        timeout=timeout,
    )
    return response.choices[0].message.content or ""


def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _rescue_json(text: str) -> str:
    for pattern in (r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"):
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    raise ValueError(f"No JSON structure found. First 400 chars: {text[:400]!r}")


def _normalise_record(rec: dict[str, Any]) -> dict[str, Any]:
    rec.setdefault("date", None)
    rec.setdefault("amount", None)
    rec.setdefault("vendor", None)
    rec.setdefault("description", None)
    rec.setdefault("gst_code", "unknown")
    rec.setdefault("confidence", 0.5)
    rec.setdefault("notes", "")
    if rec["amount"] is not None:
        try:
            cleaned_amt = str(rec["amount"]).replace("$", "").replace(",", "").strip()
            rec["amount"] = round(float(cleaned_amt), 2)
        except (ValueError, TypeError):
            rec["amount"] = None
    try:
        rec["confidence"] = round(max(0.0, min(1.0, float(rec["confidence"]))), 3)
    except (ValueError, TypeError):
        rec["confidence"] = 0.5
    if rec["gst_code"] not in ("10%", "0%", "unknown"):
        rec["gst_code"] = "unknown"
    rec["gst_code"] = classify_gst(rec["vendor"], rec["description"], rec["gst_code"])
    rec = _flag_missing_fields(rec)
    return rec


def _parse_model_response(raw_text: str) -> list[dict[str, Any]]:
    cleaned = _strip_markdown_fences(raw_text)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        try:
            cleaned = _rescue_json(cleaned)
            parsed = json.loads(cleaned)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(
                f"Unparseable model response. Raw (first 500 chars): {raw_text[:500]!r}"
            ) from exc
    raw_list: list[dict] = parsed if isinstance(parsed, list) else [parsed]
    return [_normalise_record(r) for r in raw_list if isinstance(r, dict)]


def _tesseract_ocr(image_path: str) -> str:
    try:
        import pytesseract
        text = pytesseract.image_to_string(
            Image.open(image_path), config="--psm 6 --oem 3"
        )
        logger.info("Tesseract OCR extracted %d chars", len(text.strip()))
        return text.strip()
    except ImportError:
        logger.warning("pytesseract not installed")
        return ""
    except Exception as exc:
        logger.warning("Tesseract OCR failed: %s", exc)
        return ""


def _llm_ocr_cleanup(client: OpenAI, model: str, ocr_text: str) -> str:
    prompt = f"""Extract structured financial data from this OCR-extracted text.
The text may contain OCR errors (garbled characters, broken words, misread numbers).
Apply best-effort interpretation — use null for fields you cannot confidently determine.

OCR TEXT:
{ocr_text}

Return ONLY valid JSON (first character must be {{):
{{
  "date": "DD/MM/YYYY or null",
  "amount": float total amount or null,
  "vendor": "business name string or null",
  "description": "goods/services description or null",
  "gst_code": "10%" | "0%" | "unknown",
  "confidence": 0.0 to 1.0,
  "notes": "OCR fallback used; list uncertain fields here"
}}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=512,
        timeout=60,
    )
    return response.choices[0].message.content or ""


def _extract_from_spreadsheet(
    file_path: str,
    file_ext: str,
    client: OpenAI,
    model: str,
) -> list[dict[str, Any]]:
    """Extract records from xlsx/csv by reading rows and sending to LLM for field mapping."""
    import pandas as pd

    logger.info("Reading spreadsheet %s...", file_ext)

    if file_ext.lower() == ".csv":
        df = pd.read_csv(file_path)
    elif file_ext.lower() == ".xls":
        df = pd.read_excel(file_path, engine="xlrd")
    else:
        df = pd.read_excel(file_path, engine="openpyxl")

    if df.empty:
        return [{
            "date": None, "amount": None, "vendor": None,
            "description": "Empty spreadsheet — no data rows found",
            "gst_code": "unknown", "confidence": 0.0,
            "notes": "Spreadsheet was empty",
        }]

    logger.info("Spreadsheet has %d rows, %d columns: %s", len(df), len(df.columns), list(df.columns))

    all_records: list[dict[str, Any]] = []
    # Process in chunks of 50 rows to stay within LLM context limits
    chunk_size = 50
    for chunk_start in range(0, len(df), chunk_size):
        chunk = df.iloc[chunk_start:chunk_start + chunk_size]
        chunk_csv = chunk.to_csv(index=False)
        label = f"rows {chunk_start + 1}-{chunk_start + len(chunk)}"

        prompt = f"""Extract structured financial records from this spreadsheet data.
Each row likely represents a transaction. Map the columns to the required fields.

SPREADSHEET DATA (CSV format):
{chunk_csv}

Return a JSON array of objects. Each object must have:
{{
  "date": "DD/MM/YYYY or null",
  "amount": float total amount or null,
  "vendor": "business name or null",
  "description": "goods/services description or null",
  "gst_code": "10%" | "0%" | "unknown",
  "confidence": 0.0 to 1.0,
  "notes": "any relevant notes"
}}

Rules:
- Map date columns to DD/MM/YYYY format
- Use the total/amount/debit/credit column for amount
- gst_code: use "10%" if GST is included/mentioned, "0%" if GST-free, "unknown" if not determinable
- Set confidence based on how clearly the data maps (0.90+ for clean structured data)
- Return ONLY the JSON array — no explanation, no markdown"""

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.05,
                max_tokens=4096,
                timeout=120,
            )
            raw = response.choices[0].message.content or ""
            records = _parse_model_response(raw)
            for r in records:
                r["_source"] = label
            all_records.extend(records)
            logger.info("  %s -> %d record(s) from spreadsheet", label, len(records))
        except Exception as exc:
            logger.error("LLM extraction failed for %s: %s", label, exc)
            all_records.append({
                "date": None, "amount": None, "vendor": None,
                "description": f"Extraction failed — {label}",
                "gst_code": "unknown", "confidence": 0.0,
                "notes": f"LLM error: {str(exc)[:200]}",
                "_source": label,
            })

    return all_records


def extract_from_file(
    file_path: str,
    file_ext: str,
    ollama_base_url: str,
    ollama_model: str,
) -> list[dict[str, Any]]:
    client = OpenAI(base_url=ollama_base_url, api_key=os.getenv("OLLAMA_API_KEY", "ollama"))
    all_records: list[dict[str, Any]] = []

    # Spreadsheet path — read structured data directly, no vision needed
    if file_ext.lower() in (".xlsx", ".xls", ".csv"):
        return _extract_from_spreadsheet(file_path, file_ext, client, ollama_model)

    pages: list[tuple[str, str]] = []

    if file_ext.lower() == ".pdf":
        logger.info("Converting PDF to images at 250 DPI...")
        pages_b64 = pdf_to_images_b64(file_path, dpi=250)
        logger.info("PDF has %d page(s)", len(pages_b64))
        pages = [(f"page {i+1}", b64) for i, b64 in enumerate(pages_b64)]
    else:
        logger.info("Loading %s image...", file_ext)
        img_b64 = image_file_to_b64(file_path)
        pages = [("image", img_b64)]

    for label, img_b64 in pages:
        logger.info("Processing %s via vision API...", label)
        records: list[dict[str, Any]] = []

        try:
            raw = _call_ollama_vision(client, ollama_model, img_b64)
            records = _parse_model_response(raw)
            logger.info("  %s -> %d record(s) via vision", label, len(records))
        except Exception as vision_exc:
            logger.warning("Vision API failed on %s: %s", label, vision_exc)
            logger.info("  Attempting Tesseract OCR fallback for %s...", label)
            tmp_path: str | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    suffix=".png", delete=False, prefix="smartify_ocr_"
                ) as tmp:
                    tmp.write(base64.b64decode(img_b64))
                    tmp_path = tmp.name
                ocr_text = _tesseract_ocr(tmp_path)
                if not ocr_text:
                    raise RuntimeError("Tesseract returned empty text")
                raw = _llm_ocr_cleanup(client, ollama_model, ocr_text)
                records = _parse_model_response(raw)
                for r in records:
                    r["confidence"] = min(float(r.get("confidence") or 0.5), 0.60)
                    existing = (r.get("notes") or "").rstrip(";")
                    r["notes"] = "; ".join(filter(None, [existing, "OCR fallback (vision unavailable)"]))
                logger.info("  %s -> %d record(s) via OCR fallback", label, len(records))
            except Exception as fallback_exc:
                logger.error("Both vision and OCR failed for %s", label)
                records = [{
                    "date": None, "amount": None, "vendor": None,
                    "description": f"Extraction failed — {label}",
                    "gst_code": "unknown", "confidence": 0.0,
                    "notes": f"Vision error: {str(vision_exc)[:100]}; OCR error: {str(fallback_exc)[:100]}",
                }]
            finally:
                if tmp_path:
                    Path(tmp_path).unlink(missing_ok=True)

        for r in records:
            r["_source"] = label
        all_records.extend(records)

    return all_records
