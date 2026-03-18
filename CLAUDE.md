# Smartify Plus — Claude Code Instructions

You are working on **Smartify Plus Phase Zero**, an AI-powered receipt/invoice/bank statement
extraction tool for Australian accounting firms.

---

## MANDATORY STARTUP (every session, in order)

1. Read vault context:
   - `vault__read_note` path `memory/context`
   - `vault__read_note` path `memory/infrastructure`
   - `vault__read_note` path `projects/smartify-plus/context`
   - `vault__read_note` path `projects/smartify-plus/decisions`
2. Run `git status` and `git log --oneline -10` to understand current state
3. Read ALL source files before touching anything:
   - `app.py`, `extractor.py`, `output.py`, `simulate_extraction.py`
   - `Dockerfile`, `docker-compose.yml`, `requirements.txt`

Do NOT skip these steps. Do NOT assume you know the state — always verify first.

---

## PROJECT IDENTITY

```
Name:    Smartify Plus Phase Zero
Repo:    https://github.com/navidrast/smartify-plus
Local:   ~/projects/smartify-plus  (Mac)  |  ~/projects/smartify-plus  (Linux CT)
Branch:  main
Stack:   Python 3.12, Streamlit, Ollama qwen2.5-vl:7b-instruct, PyMuPDF, ReportLab
Purpose: Upload receipt/invoice/bank PDF → AI extracts JSON → ATO GST rules → Excel + PDF download
```

---

## FILE OWNERSHIP (strict — do not cross boundaries)

| File | Owner | What it does |
|------|-------|-------------|
| `app.py` | UI layer | Streamlit upload/display/download — no extraction logic here |
| `extractor.py` | Core engine | PDF→image, Ollama vision API, JSON parse, GST rules, Tesseract fallback |
| `output.py` | Output layer | Excel (openpyxl 2 sheets) + PDF (ReportLab landscape A4) generators |
| `simulate_extraction.py` | Test utility | Generates test_output.xlsx + test_output.pdf without Ollama |
| `Dockerfile` | Container | Python 3.12-slim + tesseract-ocr system dep |
| `docker-compose.yml` | Orchestration | ollama service (auto-pull model) + app service (health-check depends_on) |
| `requirements.txt` | Dependencies | All pinned — do NOT upgrade without testing |
| `.env.example` | Config template | OLLAMA_API_BASE, OLLAMA_MODEL |

---

## PHASE ZERO SCOPE (STRICT — DO NOT DEVIATE)

### ✅ IN SCOPE
- PDF + image upload (PDF/PNG/JPG/TIFF/BMP/WebP)
- Ollama vision extraction → strict JSON schema
- ATO GST rules (10% / 0% / unknown) with keyword cross-check
- Confidence scoring + missing field flagging (<0.85 = low confidence)
- Excel download: 2 sheets (Extracted Data + Summary)
- PDF download: landscape A4 with colour-coded GST rows
- Tesseract OCR fallback when vision API fails
- Docker Compose local deployment

### ❌ OUT OF SCOPE — refuse if asked to add these
- Chat interface or conversational UI
- Voice input/output
- Multi-agent systems
- Telegram / WhatsApp / Slack integration
- CI/CD pipelines (GitHub Actions etc.)
- Advanced fraud detection or ML training
- User authentication or multi-tenancy
- Database persistence
- Any external API except the Ollama endpoint

If the user asks to add anything from the ❌ list, respond:
> "That's Phase One scope. I'll note it in the vault for the next phase but won't implement it now."

---

## EXTRACTED JSON SCHEMA (enforced — never change this)

```json
{
  "date":        "DD/MM/YYYY or null",
  "amount":      12.50,
  "vendor":      "string or null",
  "description": "string or null",
  "gst_code":    "10%" | "0%" | "unknown",
  "confidence":  0.96,
  "notes":       "semicolon-separated flags or empty string"
}
```

**GST rules (hardcoded, no ML):**
- `"10%"` — retail, food service, fuel, hardware, electronics, professional services
- `"0%"` — medical, education, insurance, residential rent, fresh food, exports
- `"unknown"` — insufficient info; keyword engine also can't determine

**Confidence rules:**
- Model sets confidence 0.0–1.0
- Cap at 0.70 if date OR amount is null (missing critical fields)
- Flag `<0.85` as "low confidence" in UI and reports

---

## ARCHITECTURE DECISIONS (do not reverse without approval)

| Decision | Rationale |
|----------|-----------|
| DPI=250 for PDF render | Handwriting legibility vs API payload balance |
| temperature=0.05 | Near-deterministic JSON; 0.0 can cause model freezes on some Ollama versions |
| GST keywords only override "unknown" | Never second-guess model's confident 10%/0% |
| Tesseract is lazy-import | App runs without pytesseract; fallback just silently unavailable |
| In-memory PNG via tobytes() | No intermediate disk writes for PDF→image conversion |
| Paragraph cells in ReportLab table | Plain strings don't word-wrap; descriptions/notes need wrapping |
| health-check depends_on in compose | Prevents app starting before 5 GB model finishes downloading |

---

## DEVELOPMENT WORKFLOW

### Before making any change:
1. Read the file you're about to change
2. Understand what calls it and what it calls
3. Check `projects/smartify-plus/decisions` vault note — decision may already be made

### Test cycle (always in this order):
```bash
# Step 1: Test output generation (no Ollama needed — fast)
python simulate_extraction.py
# Verify: test_output.xlsx opens correctly, test_output.pdf renders properly

# Step 2: Test with real Ollama (ensure Ollama is running + model pulled)
ollama list | grep qwen2.5-vl
streamlit run app.py
# Upload a real receipt image and verify extraction

# Step 3: Docker full-stack test
docker-compose up --build
# Open http://localhost:8501
# Upload PDF + image, verify both Excel and PDF downloads work
```

### After any change:
```bash
git add <specific files only — never git add .>
git commit -m "type: description\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

### Write to vault after significant work:
```
vault__append_note  projects/smartify-plus/context   ← what you changed + why
vault__append_note  projects/smartify-plus/decisions ← if you made an architectural choice
vault__append_note  projects/smartify-plus/mistakes  ← if something broke (root cause)
```

---

## DEPLOYMENT TARGETS

### Target 1: Local Docker (current)
```bash
cd ~/projects/smartify-plus
docker-compose up --build
# Access: http://localhost:8501
# First run: ~5–10 min for qwen2.5-vl:7b-instruct download (~5 GB)
```

### Target 2: Mac Studio on-prem (future Phase One)
- Ollama already installed on Mac Studio M-series
- Mount ~/projects/smartify-plus, run streamlit directly
- GPU acceleration available natively (no Docker GPU config needed)
- OLLAMA_API_BASE=http://localhost:11434/v1

### Target 3: Linux CT 5301 (claude-ct, 192.168.86.63)
```bash
ssh claude-ct
cd ~/projects && git clone https://github.com/navidrast/smartify-plus
cd smartify-plus
docker-compose up --build -d
# Access: http://192.168.86.63:8501
```

### Target 4: Cloudflare Tunnel (future — expose to accounting firm users)
- Add ingress rule to existing Home tunnel (e04c0d9b)
- Route smartify.yourdomain.com → localhost:8501
- Protected by Cloudflare Access (Zero Trust)

---

## OLLAMA MODEL MANAGEMENT

```bash
# Check if model is available
ollama list

# Pull primary model (~5 GB)
ollama pull qwen2.5-vl:7b-instruct

# Pull lighter model for CPU-only testing (~2 GB)
ollama pull qwen2.5-vl:3b-instruct

# Swap model without code changes
export OLLAMA_MODEL=qwen2.5-vl:3b-instruct
streamlit run app.py

# Check Ollama is serving
curl http://localhost:11434/api/tags | python3 -m json.tool
```

---

## COMMON ISSUES AND FIXES

### Ollama connection refused
```
Error: Cannot connect to Ollama at http://localhost:11434/v1
Fix:   ollama serve  (or docker-compose up ollama)
```

### Model not found (404)
```
Error: model 'qwen2.5-vl:7b-instruct' not found
Fix:   ollama pull qwen2.5-vl:7b-instruct
```

### PyMuPDF import error
```
Error: No module named 'fitz'
Fix:   pip install pymupdf==1.25.3  (NOT pip install fitz — wrong package)
```

### ReportLab font warning on Linux
```
Warning: Can't find font 'Helvetica' ...
Fix:    apt install fonts-liberation  OR  change fontName to "Helvetica" (already set)
        Usually harmless — ReportLab falls back correctly
```

### Docker Compose app starts before model downloads
```
Error: app connects but Ollama returns 503 or model not found
Fix:   health-check in docker-compose.yml polls for model presence — allow 10 min on first run
       Run: docker-compose logs ollama  to see download progress
```

### JSON parse failure from model
```
Error: Unparseable model response after all rescue attempts
Cause: Model returned prose instead of JSON (rare with qwen2.5-vl, more common on 3b)
Fix:   extractor.py has 3-layer rescue (strip fences → json.loads → regex rescue)
       If still failing: check if Ollama model is corrupted — ollama rm + re-pull
```

### Large PDF timeout
```
Error: API call timeout after 120s
Cause: Multi-page PDF with complex pages on CPU-only hardware
Fix:   Increase timeout in _call_ollama_vision() — change timeout=120 to timeout=300
       Or: reduce DPI from 250 to 150 in pdf_to_images_b64()
```

---

## SECURITY RULES (never violate)

1. All temp files use `tempfile.NamedTemporaryFile` + `Path.unlink(missing_ok=True)` in `finally`
2. No hardcoded API keys, credentials, or endpoints anywhere in source files
3. All config via `.env` file or docker-compose environment section
4. No external HTTP calls except to `OLLAMA_API_BASE` (the configured Ollama endpoint)
5. Never commit `.env` (it is in `.gitignore`) — only `.env.example`
6. Uploaded files are never written anywhere except the temp directory

---

## DEFINITION OF DONE (Phase Zero)

A task is complete when ALL of these pass:

- [ ] `python simulate_extraction.py` exits with ✅ and both files open correctly
- [ ] `streamlit run app.py` — upload a real receipt → extraction runs without error
- [ ] Downloaded Excel has 2 sheets with correct data and GST colour coding
- [ ] Downloaded PDF opens in Preview/Acrobat, landscape A4, correct colour rows
- [ ] `docker-compose up --build` → http://localhost:8501 works end-to-end
- [ ] `git status` is clean on main
- [ ] Vault context note updated

---

## PHASE ONE BACKLOG (vault it, don't build it yet)

If user requests these, note them here and append to vault decisions:
- ABN validation via Australian Business Register API
- Batch upload (multiple files per session)
- SQLite persistence for extracted records
- Mac Studio on-prem deployment with systemd/launchd service
- Cloudflare Tunnel exposure for accounting firm access
- Per-client folder structure for document organisation
- Accuracy benchmarking suite (ground truth vs extracted)
