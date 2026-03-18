# Claude Code — Review & Deploy Prompt for Smartify Plus Phase Zero

> **How to use:** Paste the block below into a new Claude Code session opened at
> `~/projects/smartify-plus` (or after `cd ~/projects/smartify-plus`).
> It works on Mac, Linux CT 5301, or any machine with the repo cloned.

---

```
You are reviewing and deploying the Smartify Plus Phase Zero project.

This is a Python 3.12 Streamlit app that uses Ollama + Qwen2.5-VL vision model
to extract structured financial data from receipts, invoices, and bank statements
for Australian accounting firms, then generates Excel + PDF reports.

## STARTUP — do these first, in order:

1. Read vault notes:
   - vault__read_note  memory/context
   - vault__read_note  memory/infrastructure
   - vault__read_note  projects/smartify-plus/context
   - vault__read_note  projects/smartify-plus/decisions

2. Read ALL source files:
   - app.py, extractor.py, output.py, simulate_extraction.py
   - Dockerfile, docker-compose.yml, requirements.txt, .env.example

3. Run: git log --oneline -10
4. Run: git status

Do NOT skip any of these steps.

---

## REVIEW CHECKLIST

Work through every item below. Fix any issues found before proceeding to deployment.
For each item write a one-line verdict: ✅ PASS or ❌ FAIL: <what's wrong>.

### Python Code Quality
- [ ] All imports are used — no dead imports in any file
- [ ] No hardcoded secrets, endpoints, or credentials in source files
- [ ] All temp files are cleaned up in `finally` blocks (not just on success paths)
- [ ] Type hints are present on all function signatures
- [ ] No bare `except:` clauses — all exceptions are typed or at minimum `except Exception`
- [ ] Logging uses `logger.xxx()` not `print()` for non-UI output
- [ ] All functions have docstrings explaining args and return values

### extractor.py (core engine — review most carefully)
- [ ] `pdf_to_images_b64()`: uses in-memory tobytes("png"), no disk writes, closes fitz doc in finally
- [ ] `image_file_to_b64()`: converts to RGB before saving, uses BytesIO not temp file
- [ ] `_call_ollama_vision()`: temperature=0.05, max_tokens=2048, timeout parameter used
- [ ] `_parse_model_response()`: has 3 rescue layers (strip fences → json.loads → regex rescue)
- [ ] `_normalise_record()`: handles all type coercions safely (amount str→float, confidence clamp)
- [ ] `classify_gst()`: only overrides "unknown" — never overrides model's "10%" or "0%"
- [ ] `_flag_missing_fields()`: caps confidence at 0.70 when date or amount is None
- [ ] `extract_from_file()`: Tesseract temp file deleted in finally, error placeholder returned on double-failure
- [ ] GST keyword lists cover major Australian retailers, medical, education, insurance

### output.py
- [ ] `generate_excel()`: produces BytesIO (not file), has 2 sheets, header styled blue+white
- [ ] `generate_excel()`: GST colour fills applied per row (green/amber/red)
- [ ] `generate_excel()`: low confidence cells are red bold
- [ ] `generate_pdf_report()`: uses landscape(A4), Paragraph cells (not plain strings) for word wrap
- [ ] `generate_pdf_report()`: repeatRows=1 on transaction table (header repeats across pages)
- [ ] `generate_pdf_report()`: disclaimer footer present
- [ ] Both functions return bytes, not file paths

### app.py
- [ ] Temp file deleted in `finally` block (not only on success)
- [ ] File extension validated before processing
- [ ] File size checked (50 MB limit)
- [ ] ConnectionRefusedError caught separately with helpful Ollama error message
- [ ] Styled DataFrame uses `.map()` not deprecated `.applymap()`
- [ ] Both download buttons wrapped in try/except
- [ ] No extraction logic in app.py — it only calls extractor.py functions

### docker-compose.yml
- [ ] `ollama` service has healthcheck that polls for model name (not just API up)
- [ ] `start_period` is 600s or more (allows for slow model download)
- [ ] `app` service uses `condition: service_healthy` depends_on
- [ ] Named volume `smartify_ollama_models` persists model across container recreations
- [ ] No secrets or .env values hardcoded in compose file

### Dockerfile
- [ ] Base image is python:3.12-slim
- [ ] tesseract-ocr and tesseract-ocr-eng installed via apt
- [ ] requirements.txt copied and installed before source code (layer caching)
- [ ] Healthcheck CMD present for docker-compose depends_on
- [ ] CMD runs streamlit with --server.headless=true

### Security
- [ ] .env is in .gitignore
- [ ] No secrets in any committed file
- [ ] simulate_extraction.py test outputs (test_output.*) are in .gitignore

---

## FIX PHASE

For every ❌ FAIL item found above:
1. Read the relevant file fully before editing
2. Make the minimal fix — do not refactor unrelated code
3. Run `python simulate_extraction.py` after each fix to verify no regressions
4. Commit fixes with: git commit -m "fix: <description>"

---

## DEPLOYMENT — run in this exact order

### Stage 1: Dependency test (no Ollama required, ~30 seconds)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python simulate_extraction.py
```
Expected output:
  ✅ test_output.xlsx written
  ✅ test_output.pdf  written
Open both files and verify they look correct before proceeding.
If this fails → fix requirements.txt or output.py before proceeding.

### Stage 2: Local Streamlit test (requires Ollama running)
```bash
# Check Ollama is up
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# Pull model if not present
ollama list | grep qwen2.5-vl || ollama pull qwen2.5vl:7b

# Set env and run
cp .env.example .env
streamlit run app.py
```
Test with:
- A clear JPG receipt → expect confidence >0.85
- A PDF (any) → expect it processes all pages
- A blurry/low-res image → expect Tesseract fallback or low-confidence result
If extraction fails → check extractor.py logs for specific error.

### Stage 3: Docker full-stack deployment
```bash
# Build and start (first run pulls ~5 GB model — allow 10 min)
docker-compose up --build

# Watch logs in separate terminal
docker-compose logs -f ollama
# Wait for: "[smartify] Model ready — Ollama is serving."

# Check health
docker-compose ps
# Both services should show: "healthy" or "Up"
```
Access: http://localhost:8501
Test: upload a receipt → verify extraction → download Excel → download PDF.

### Stage 4: Verify and commit deployment state
```bash
docker-compose ps           # both services healthy
docker-compose logs app     # no errors
git status                  # clean
git log --oneline -3        # confirm latest commits
```

---

## DEPLOY TO LINUX CT 5301 (optional — skip if Mac local is sufficient)

```bash
# From Mac, push any local commits first
git push origin main

# SSH into Linux CT
ssh claude-ct

# Clone or pull
cd ~/projects
git clone https://github.com/navidrast/smartify-plus 2>/dev/null || \
  (cd smartify-plus && git pull origin main)

cd smartify-plus

# Deploy
docker-compose up --build -d

# Verify
docker-compose ps
curl -s http://localhost:8501/_stcore/health
```
Access from Mac: http://192.168.86.63:8501

---

## AFTER DEPLOYMENT — write to vault

After successful deployment, write session summary:

vault__append_note  projects/smartify-plus/context
Content:
  ## Session: <date>
  - Reviewed all 7 source files against checklist
  - Issues found: <list or "none">
  - Fixes applied: <list or "none">
  - Deployed to: <Mac local / CT 5301 / both>
  - All deployment stages passed: <yes/no>
  - test_output.xlsx verified: <yes/no>
  - test_output.pdf verified: <yes/no>
  - Docker stack healthy: <yes/no>

If any architectural decision was made during review:
vault__append_note  projects/smartify-plus/decisions

If any bug was found and fixed:
vault__append_note  projects/smartify-plus/mistakes

---

## PHASE ZERO COMPLETION CRITERIA

All of the following must be true before declaring Phase Zero complete:

1. ✅ python simulate_extraction.py — exits cleanly, both files verified
2. ✅ streamlit run app.py — upload real receipt, extraction works, both downloads work
3. ✅ docker-compose up --build — http://localhost:8501 works end-to-end
4. ✅ git status is clean on main branch
5. ✅ No ❌ items remain in the review checklist above
6. ✅ Vault context note updated with session summary

Do NOT mark the deployment complete until every item above is confirmed.
```

---

## Quick reference — key decisions

| Topic | Decision | Why |
|-------|----------|-----|
| PDF DPI | 250 | Handwriting legibility vs token payload balance |
| Model temperature | 0.05 | Near-deterministic JSON; 0.0 can cause freezes |
| GST keyword engine | Only resolves "unknown" | Never override model's confident classification |
| Confidence cap | 0.70 when date/amount null | Missing critical fields = not reliable |
| Tesseract | Lazy import, optional | App works without it; fallback just unavailable |
| JSON rescue layers | 3 (fence strip, json.loads, regex) | Models occasionally emit prose despite instructions |
| Docker health-check | Polls for model name, 600s start_period | 5 GB model download needs time on first run |

---

## Files that must NOT be modified without explicit instruction

- `requirements.txt` — pinned versions tested together; do not auto-upgrade
- The JSON schema in `extractor.py` (`EXTRACTION_SYSTEM_PROMPT`) — changing breaks all downstream parsing
- `classify_gst()` logic in `extractor.py` — keywords and override rules are deliberate
- `docker-compose.yml` healthcheck — start_period of 600s is intentional
