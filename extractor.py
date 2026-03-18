"""
extractor.py — Core extraction engine for Smartify Plus Phase Zero

Responsibilities:
  1. PDF  → per-page PNG via PyMuPDF at 250 DPI for handwriting clarity
  2. Image → PNG normalisation via Pillow (handles JPG/TIFF/BMP/WebP)
  3. Base64 encode for Ollama vision API transport (in-memory, no disk I/O)
  4. Ollama API call via OpenAI-compatible client with strict JSON prompt
  5. JSON parsing + normalisation with multi-layer rescue on malformed output
  6. ATO GST rule engine — keyword cross-check on top of model classification
  7. Confidence flagging when critical fields (date/amount/vendor) are missing
  8. Tesseract OCR + LLM-cleanup fallback when vision API fails or times out
"""

import base64
import io
import json
import logging
import re
import tempfile
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF — PDF rendering; package name is pymupdf, import name is fitz
from openai import OpenAI
from PIL import Image

logger = logging.getLogger(__name__)


# ─── Vision Model Prompts ─────────────────────────────────────────────────────

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
    retail, groceries, electronics, hardware, fuel, restaurants, cafés,
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


# ─── ATO GST Rule Engine ──────────────────────────────────────────────────────
# These keywords cross-check the model's gst_code.
# Model's "10%" or "0%" → trusted (model saw the full document context).
# Model's "unknown"     → resolved by keyword matching if possible.

_GST_10_KEYWORDS: frozenset[str] = frozenset({
    # Major Australian retailers
    "woolworths", "coles", "aldi", "iga", "costco", "harris farm", "foodworks",
    "officeworks", "bunnings", "harvey norman", "jb hi-fi", "kmart",
    "target", "big w", "the good guys", "myer", "david jones", "rebel sport",
    # Food service
    "mcdonald", "kfc", "subway", "domino", "pizza hut", "hungry jacks",
    "uber eats", "deliveroo", "doordash", "menulog", "cafe", "restaurant",
    "bakery", "butcher", "deli", "takeaway", "food court", "coffee", "espresso",
    # Fuel & convenience
    "bp", "shell", "caltex", "ampol", "7-eleven", "puma energy",
    "united petroleum", "petrol", "diesel", "fuel", "servo",
    # Trades / construction
    "mitre 10", "total tools", "sydney tools", "plumber", "electrician",
    "builder", "tradie", "hardware", "scaffolding", "concreter",
    # Professional services (taxable)
    "xero", "myob", "quickbooks", "accountant", "bookkeeper",
    "solicitor", "lawyer", "consultant", "marketing", "advertising", "it support",
    # Transport
    "uber", "didi", "ola", "taxi", "toll", "parking", "e-toll",
    # General taxable
    "grocery", "supermarket", "retail", "clothing", "shoes", "apparel",
    "electronics", "software", "stationery", "equipment", "tools", "furniture",
    "cleaning", "laundry", "gym", "fitness", "subscription",
})

_GST_FREE_KEYWORDS: frozenset[str] = frozenset({
    # Medical / health
    "medical centre", "medicare", "doctor", "gp clinic", "hospital",
    "pharmacy", "chemist warehouse", "priceline pharmacy", "terry white",
    "dentist", "dental", "optometrist", "physiotherapist", "physio",
    "chiropractor", "psychologist", "pathology", "radiology", "mri", "specialist",
    "bulk billing", "health fund", "medibank", "bupa", "hcf", "nib",
    # Education
    "school", "university", "tafe", "college", "tuition", "course fee",
    "training", "childcare", "preschool", "kindergarten", "daycare",
    # Finance / banking
    "bank fee", "account keeping fee", "bank charge", "interest charge",
    "loan repayment", "mortgage", "atm fee", "bpay fee",
    # Insurance
    "insurance premium", "life insurance", "income protection",
    "car insurance", "home insurance", "building insurance",
    # Housing
    "residential rent", "rent payment", "lease",
    # Fresh food (GST-free in Australia)
    "fresh fruit", "fresh vegetable", "fruit market", "vegetable market",
    "unprocessed meat", "fish market", "seafood market", "farmers market",
    # Exports
    "export", "overseas freight", "international shipping", "customs duty",
})


def classify_gst(vendor: str | None, description: str | None, model_code: str) -> str:
    """
    Cross-check model's GST classification using Australian keyword rules.

    Logic:
      - Model said "10%" or "0%" → trust it (model has full document context)
      - Model said "unknown"     → attempt keyword resolution on vendor + description
      - No keyword match         → stay "unknown" (accountant must review)

    Args:
        vendor:     Extracted vendor name (may be None).
        description: Extracted description of goods/services (may be None).
        model_code:  GST code returned by the vision model.

    Returns:
        Validated/resolved GST code string: "10%", "0%", or "unknown".
    """
    if model_code in ("10%", "0%"):
        return model_code  # Model was confident — don't second-guess it

    # Build search text from available fields (lowercase for matching)
    search = " ".join(filter(None, [vendor, description])).lower()

    if any(kw in search for kw in _GST_10_KEYWORDS):
        return "10%"
    if any(kw in search for kw in _GST_FREE_KEYWORDS):
        return "0%"

    return "unknown"  # Genuinely ambiguous — requires accountant review


def _flag_missing_fields(record: dict[str, Any]) -> dict[str, Any]:
    """
    Append human-readable notes for missing critical fields and apply a
    confidence penalty (capped at 0.70) when date or amount is absent.
    This enforces the spec requirement: confidence < 0.85 if fields missing.
    """
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
        # Penalise: critical fields missing → cannot be high confidence
        record["confidence"] = min(float(record.get("confidence") or 0.5), 0.70)

    return record


# ─── PDF → Images (in-memory, no intermediate disk writes) ───────────────────

def pdf_to_images_b64(pdf_path: str, dpi: int = 250) -> list[str]:
    """
    Render each page of a PDF to PNG and return as a list of base64 strings.

    Uses PyMuPDF (fitz) for high-quality rendering.
    DPI 250 chosen as sweet spot: good handwriting legibility, manageable payload.
    Increase to 300 for very small print; decrease to 150 for faster processing.

    Args:
        pdf_path: Absolute path to the PDF file.
        dpi:      Target render resolution in dots-per-inch.

    Returns:
        List of base64-encoded PNG strings, one per page, in page order.
    """
    zoom = dpi / 72.0            # PyMuPDF default is 72 DPI; scale to target
    matrix = fitz.Matrix(zoom, zoom)

    doc = fitz.open(pdf_path)
    pages_b64: list[str] = []

    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render to RGB pixmap (alpha=False reduces PNG size by ~25%)
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
            # tobytes("png") converts directly to PNG bytes — no disk I/O needed
            png_bytes = pix.tobytes("png")
            pages_b64.append(base64.b64encode(png_bytes).decode("utf-8"))
            logger.debug(
                "Rendered PDF page %d/%d → %d bytes PNG",
                page_num + 1, len(doc), len(png_bytes),
            )
    finally:
        doc.close()  # Always close fitz document to release file handle

    return pages_b64


def image_file_to_b64(image_path: str) -> str:
    """
    Load any image format (JPG, TIFF, BMP, WebP, PNG) and return as base64 PNG.

    Converts to RGB first to ensure consistent format for the vision API
    (handles RGBA, grayscale, palette modes without colour space errors).
    Uses an in-memory BytesIO buffer — no temp file created.

    Args:
        image_path: Absolute path to the image file.

    Returns:
        Base64-encoded PNG string.
    """
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")  # Normalise: RGBA/grayscale/palette → RGB
        buf = io.BytesIO()
        img_rgb.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")


# ─── Ollama Vision API Call ───────────────────────────────────────────────────

def _call_ollama_vision(
    client: OpenAI,
    model: str,
    image_b64: str,
    timeout: int = 120,
) -> str:
    """
    Send a base64-encoded PNG to Ollama's vision API endpoint.

    Uses the OpenAI-compatible /v1/chat/completions format with image_url
    content type — Ollama supports this for all vision models.

    Args:
        client:    OpenAI client configured with Ollama base URL.
        model:     Ollama model name (e.g. "qwen2.5vl:7b").
        image_b64: Base64-encoded PNG as a plain string (no data URI prefix).
        timeout:   API call timeout in seconds.

    Returns:
        Raw text response from the model (expected to be JSON).

    Raises:
        Various OpenAI/httpx exceptions on API or network errors — caller handles fallback.
    """
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            # Ollama accepts RFC 2397 data URIs in this field
                            "url": f"data:image/png;base64,{image_b64}",
                        },
                    },
                    {"type": "text", "text": EXTRACTION_USER_PROMPT},
                ],
            },
        ],
        temperature=0.05,   # Near-zero for deterministic structured output
        max_tokens=2048,    # Sufficient for ~50 bank transaction lines per page
        timeout=timeout,
    )
    return response.choices[0].message.content or ""


# ─── JSON Parsing + Normalisation ────────────────────────────────────────────

def _strip_markdown_fences(text: str) -> str:
    """
    Strip ```json ... ``` or ``` ... ``` wrappers that some models emit
    despite being instructed not to. Safe no-op if no fences present.
    """
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _rescue_json(text: str) -> str:
    """
    Last-resort JSON rescue: find the first complete [ ... ] or { ... } block
    in the response text using regex. Handles models that prepend prose despite
    the strict system prompt.

    Tries array first (bank statements are more common multi-record responses),
    then falls back to single object.

    Raises:
        ValueError if no JSON structure is found at all.
    """
    for pattern in (r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"):
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    raise ValueError(
        f"No JSON structure found in model response. "
        f"First 400 chars: {text[:400]!r}"
    )


def _normalise_record(rec: dict[str, Any]) -> dict[str, Any]:
    """
    Enforce correct field types, apply defaults, validate GST code,
    cross-check with keyword rules, and flag low-confidence conditions.

    Safe to call on partially-populated dicts from the model.
    """
    # Ensure all required keys exist with safe defaults
    rec.setdefault("date",        None)
    rec.setdefault("amount",      None)
    rec.setdefault("vendor",      None)
    rec.setdefault("description", None)
    rec.setdefault("gst_code",    "unknown")
    rec.setdefault("confidence",  0.5)
    rec.setdefault("notes",       "")

    # Coerce amount: model sometimes returns "$1,234.50" instead of 1234.50
    if rec["amount"] is not None:
        try:
            cleaned_amt = str(rec["amount"]).replace("$", "").replace(",", "").strip()
            rec["amount"] = round(float(cleaned_amt), 2)
        except (ValueError, TypeError):
            rec["amount"] = None  # Unrecoverable — will be flagged below

    # Clamp confidence to valid [0.0, 1.0] range
    try:
        rec["confidence"] = round(max(0.0, min(1.0, float(rec["confidence"]))), 3)
    except (ValueError, TypeError):
        rec["confidence"] = 0.5

    # Validate gst_code value
    if rec["gst_code"] not in ("10%", "0%", "unknown"):
        rec["gst_code"] = "unknown"

    # Cross-check with keyword engine (only overrides "unknown", not confident codes)
    rec["gst_code"] = classify_gst(rec["vendor"], rec["description"], rec["gst_code"])

    # Flag missing critical fields + apply confidence penalty
    rec = _flag_missing_fields(rec)

    return rec


def _parse_model_response(raw_text: str) -> list[dict[str, Any]]:
    """
    Parse the vision model's raw text response into a list of normalised records.

    Resilience layers:
      1. Strip markdown code fences
      2. Standard json.loads
      3. Regex rescue if parse fails (find first JSON block in prose)
      4. Normalise each record via _normalise_record

    Args:
        raw_text: Raw string returned by the Ollama API call.

    Returns:
        List of normalised record dicts.

    Raises:
        ValueError if all parsing attempts fail.
    """
    cleaned = _strip_markdown_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Attempt to extract JSON from within surrounding prose
        try:
            cleaned = _rescue_json(cleaned)
            parsed = json.loads(cleaned)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(
                f"Unparseable model response after all rescue attempts. "
                f"Raw response (first 500 chars): {raw_text[:500]!r}"
            ) from exc

    # Normalise: accept both single object and array responses
    raw_list: list[dict] = parsed if isinstance(parsed, list) else [parsed]
    return [_normalise_record(r) for r in raw_list if isinstance(r, dict)]


# ─── Tesseract OCR Fallback ───────────────────────────────────────────────────

def _tesseract_ocr(image_path: str) -> str:
    """
    Extract text from an image file via Tesseract OCR.

    This is a fallback path — the vision model is strongly preferred.
    Tesseract cannot understand layout/context the way a VLM can,
    so accuracy on handwriting and complex receipts will be lower.

    Args:
        image_path: Absolute path to a PNG/JPG file.

    Returns:
        Extracted text string, or "" if Tesseract unavailable or fails.
    """
    try:
        import pytesseract  # noqa: PLC0415 — optional dep, lazy import
        text = pytesseract.image_to_string(
            Image.open(image_path),
            # psm 6 = assume a single uniform block of text
            # oem 3 = use LSTM neural net engine (most accurate mode)
            config="--psm 6 --oem 3",
        )
        logger.info("Tesseract OCR extracted %d chars", len(text.strip()))
        return text.strip()
    except ImportError:
        logger.warning("pytesseract not installed — OCR fallback path unavailable")
        return ""
    except Exception as exc:
        logger.warning("Tesseract OCR failed: %s", exc)
        return ""


def _llm_ocr_cleanup(client: OpenAI, model: str, ocr_text: str) -> str:
    """
    Send raw OCR text to the LLM (text-only mode, no image) for structured extraction.

    OCR text is often garbled with line breaks, misread characters, and
    formatting artefacts. The LLM cleans this up and maps it to the schema.

    Args:
        client:   OpenAI client pointing at Ollama.
        model:    Ollama model name (same model, text mode only).
        ocr_text: Raw text from Tesseract OCR.

    Returns:
        Raw JSON string from the model.
    """
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


# ─── Main Extraction Entry Point ──────────────────────────────────────────────

def extract_from_file(
    file_path: str,
    file_ext: str,
    ollama_base_url: str,
    ollama_model: str,
) -> list[dict[str, Any]]:
    """
    Top-level extraction function. Called directly by app.py.

    Handles PDF (multi-page) and all major image formats.
    Applies vision API per page with automatic Tesseract + LLM fallback.

    Processing flow per page:
      1. Try Ollama vision API → parse JSON → normalise
      2. On failure → Tesseract OCR → LLM text cleanup → parse JSON → normalise
      3. On double-failure → create error placeholder record (confidence=0.0)

    Args:
        file_path:       Absolute path to the uploaded/temp file.
        file_ext:        File extension with dot (e.g. ".pdf", ".jpg").
        ollama_base_url: Ollama OpenAI-compatible base URL.
        ollama_model:    Ollama model identifier string.

    Returns:
        List of normalised extraction record dicts. Never raises — failed pages
        produce placeholder records so the UI always has something to display.
    """
    # api_key="ollama" is a dummy value — Ollama ignores it but the client requires it
    client = OpenAI(base_url=ollama_base_url, api_key="ollama")
    all_records: list[dict[str, Any]] = []

    # Build uniform list of (label, image_b64) tuples for processing
    pages: list[tuple[str, str]] = []

    if file_ext.lower() == ".pdf":
        logger.info("Converting PDF → images at 250 DPI...")
        pages_b64 = pdf_to_images_b64(file_path, dpi=250)
        logger.info("PDF has %d page(s) to process", len(pages_b64))
        pages = [(f"page {i+1}", b64) for i, b64 in enumerate(pages_b64)]
    else:
        logger.info("Loading %s image...", file_ext)
        img_b64 = image_file_to_b64(file_path)
        pages = [("image", img_b64)]

    # Process each page through the extraction + fallback chain
    for label, img_b64 in pages:
        logger.info("Processing %s via vision API...", label)
        records: list[dict[str, Any]] = []

        # ── Primary path: Ollama vision model ─────────────────────────────
        try:
            raw = _call_ollama_vision(client, ollama_model, img_b64)
            records = _parse_model_response(raw)
            logger.info("  %s → %d record(s) extracted via vision", label, len(records))

        except Exception as vision_exc:
            logger.warning("Vision API failed on %s: %s", label, vision_exc)

            # ── Fallback: Tesseract OCR + LLM text cleanup ────────────────
            logger.info("  Attempting Tesseract OCR fallback for %s...", label)
            tmp_path: str | None = None

            try:
                # Tesseract needs a file path — decode base64 back to temp PNG
                with tempfile.NamedTemporaryFile(
                    suffix=".png", delete=False, prefix="smartify_ocr_"
                ) as tmp:
                    tmp.write(base64.b64decode(img_b64))
                    tmp_path = tmp.name

                ocr_text = _tesseract_ocr(tmp_path)

                if not ocr_text:
                    raise RuntimeError("Tesseract returned empty text — image may be blank or unreadable")

                raw = _llm_ocr_cleanup(client, ollama_model, ocr_text)
                records = _parse_model_response(raw)

                # Mark OCR-fallback records: lower confidence cap + notes
                for r in records:
                    r["confidence"] = min(float(r.get("confidence") or 0.5), 0.60)
                    existing = (r.get("notes") or "").rstrip(";")
                    r["notes"] = "; ".join(filter(None, [existing, "OCR fallback (vision unavailable)"]))

                logger.info("  %s → %d record(s) via OCR fallback", label, len(records))

            except Exception as fallback_exc:
                # Both paths failed — create an error placeholder record
                logger.error(
                    "Both vision and OCR failed for %s. Vision: %s | OCR: %s",
                    label, vision_exc, fallback_exc,
                )
                records = [{
                    "date": None,
                    "amount": None,
                    "vendor": None,
                    "description": f"Extraction failed — {label}",
                    "gst_code": "unknown",
                    "confidence": 0.0,
                    "notes": (
                        f"Vision error: {str(vision_exc)[:100]}; "
                        f"OCR error: {str(fallback_exc)[:100]}"
                    ),
                }]

            finally:
                # Always clean up the Tesseract temp file
                if tmp_path:
                    Path(tmp_path).unlink(missing_ok=True)

        # Tag each record with its source page label for traceability
        for r in records:
            r["_source"] = label

        all_records.extend(records)

    return all_records
