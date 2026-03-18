# Smartify Plus — Phase Zero POC

> AI-powered receipt, invoice & bank statement extraction for Australian accounting firms.
> Upload any document → Ollama Qwen2.5-VL extracts structured data → ATO GST rules applied → Excel + PDF download.

---

## What it does

| Input | Processing | Output |
|-------|-----------|--------|
| Receipt (PDF/PNG/JPG) | Ollama `qwen2.5vl:7b` vision model | Excel `.xlsx` (2 sheets) |
| Invoice (scanned/handwritten) | Strict JSON schema extraction | PDF report (landscape A4) |
| Bank statement PDF (multi-page) | ATO GST keyword cross-check | Colour-coded GST summary |
| Any messy/blurry scan | Tesseract OCR fallback if vision fails | Per-record confidence scores |

---

## Quickstart (Docker)

```bash
# First run — downloads qwen2.5vl:7b (~5 GB, allow 5–10 min)
docker-compose up --build

# Open in browser
open http://localhost:8501
```

> **Subsequent runs:** `docker-compose up` — model is cached, starts in seconds.

---

## Quickstart (Local)

```bash
# Prerequisites
brew install ollama tesseract          # macOS
# OR: apt install ollama tesseract-ocr tesseract-ocr-eng  # Ubuntu

ollama pull qwen2.5vl:7b
ollama serve &

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env                   # edit OLLAMA_API_BASE if needed
streamlit run app.py
```

---

## Test Without Ollama

```bash
python simulate_extraction.py
# Writes: test_output.xlsx  test_output.pdf
```

---

## Architecture

```
User → Streamlit (app.py)
  → extractor.py
      PDF  → PyMuPDF → PNG per page → base64
      Image → Pillow → PNG buffer → base64
      → Ollama vision API (qwen2.5vl:7b)
      → JSON parse + normalise + GST classify
      → Tesseract OCR fallback (if vision fails)
  → output.py
      → pandas + openpyxl → .xlsx
      → ReportLab → .pdf
  → Download buttons
```

---

## Extracted JSON Schema

```json
{
  "date":        "DD/MM/YYYY or null",
  "amount":      12.50,
  "vendor":      "Woolworths",
  "description": "Grocery items",
  "gst_code":    "10%",
  "confidence":  0.96,
  "notes":       ""
}
```

`gst_code` values:
- `"10%"` — Taxable supply (GST applies)
- `"0%"` — GST-free supply
- `"unknown"` — Insufficient info, accountant must review

---

## Files

| File | Purpose |
|------|---------|
| `app.py` | Streamlit UI — upload, display, download |
| `extractor.py` | PDF/image → Ollama → JSON + GST rules + fallback |
| `output.py` | Excel (openpyxl) + PDF (ReportLab) generators |
| `simulate_extraction.py` | Test output generation without Ollama |
| `Dockerfile` | Python 3.12 + Tesseract app container |
| `docker-compose.yml` | Ollama + Streamlit app services |
| `requirements.txt` | Pinned Python dependencies |
| `.env.example` | Ollama endpoint configuration |

---

## GPU Acceleration

Uncomment the `deploy` section in `docker-compose.yml` if you have NVIDIA Container Toolkit:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

---

## Disclaimer

> This tool is AI-generated output for demonstration purposes only.
> All GST classifications must be reviewed by a qualified accountant before lodging with the ATO.

---

*Smartify Plus Phase Zero — Built with Ollama + Qwen2.5-VL + Streamlit*
