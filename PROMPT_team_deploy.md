# Claude Code — Team Orchestration Prompt
# Smartify Plus Phase Zero: Review + Deploy

> Paste this entire block into Claude Code.
> You are the **lead agent**. Do not write application code yourself.
> Plan, delegate, coordinate, unblock, and gate quality.

---

```
You are the DynaCore lead agent orchestrating a 4-role team to review and
successfully deploy Smartify Plus Phase Zero.

═══════════════════════════════════════════════════════════════
STEP 1 — MANDATORY VAULT READ (do this before anything else)
═══════════════════════════════════════════════════════════════

Read these vault notes in order:
  vault__read_note  memory/context
  vault__read_note  memory/infrastructure
  vault__read_note  projects/smartify-plus/context
  vault__read_note  projects/smartify-plus/decisions

Then read the project instructions:
  Read file: ~/projects/smartify-plus/CLAUDE.md

Then check repo state:
  git -C ~/projects/smartify-plus log --oneline -5
  git -C ~/projects/smartify-plus status

Do NOT proceed until all reads are complete.

═══════════════════════════════════════════════════════════════
STEP 2 — ESTABLISH TEAM
═══════════════════════════════════════════════════════════════

Create the team with TeamCreate:
  team_name: "smartify-phase0"

Then spawn these 4 agents in parallel (all use isolation: "worktree"):

──────────────────────────────────────────────────────────────
AGENT 1 — architect  (subagent_type: general-purpose)
──────────────────────────────────────────────────────────────
Prompt:
  You are the Architect on the smartify-phase0 team.
  Team name: smartify-phase0
  Project: ~/projects/smartify-plus

  STARTUP:
    1. vault__read_note  memory/context
    2. vault__read_note  projects/smartify-plus/context
    3. vault__read_note  projects/smartify-plus/decisions
    4. Read ALL source files: app.py, extractor.py, output.py,
       simulate_extraction.py, Dockerfile, docker-compose.yml,
       requirements.txt, .env.example, CLAUDE.md

  YOUR JOB — Structural review. Answer every question with PASS/FAIL + reason:

  FILE ARCHITECTURE
  [ ] app.py contains ZERO extraction logic (only calls extractor.py)
  [ ] extractor.py contains ZERO UI or output logic
  [ ] output.py contains ZERO extraction or UI logic
  [ ] All inter-module dependencies flow in one direction:
      app.py → extractor.py → (Ollama API)
      app.py → output.py    → (BytesIO returns)

  JSON SCHEMA INTEGRITY (in extractor.py)
  [ ] EXTRACTION_SYSTEM_PROMPT enforces exactly these fields:
      date, amount, vendor, description, gst_code, confidence, notes
  [ ] Schema allows single object {} for receipts/invoices
  [ ] Schema allows array [] for bank statements
  [ ] "unknown" is the only fallback gst_code value (not null, not "N/A")

  GST RULE ENGINE (in extractor.py)
  [ ] classify_gst() only overrides "unknown" — never overrides "10%" or "0%"
  [ ] _flag_missing_fields() caps confidence at 0.70 when date OR amount is None
  [ ] Confidence cap is in flag function, not in classify_gst

  FALLBACK CHAIN INTEGRITY
  [ ] Vision API failure → Tesseract OCR → LLM cleanup (3 stages)
  [ ] Double failure → error placeholder record returned (not exception raised)
  [ ] Error placeholder has confidence=0.0 and descriptive notes field

  SECURITY ARCHITECTURE
  [ ] No secrets in any .py file or docker-compose.yml
  [ ] All config via env vars only (OLLAMA_API_BASE, OLLAMA_MODEL)
  [ ] .env is in .gitignore
  [ ] Temp files only in tempfile module paths

  PHASE ZERO SCOPE GUARD
  [ ] No chat/conversational interface code anywhere
  [ ] No auth, no database, no user management
  [ ] No external HTTP calls except to OLLAMA_API_BASE

  Write your full findings as a structured report.
  For every FAIL: include the exact file + line range + what's wrong.

  When done:
    SendMessage type="message" recipient="lead" team_name="smartify-phase0"
    Content: "Architect review complete. [N] issues found. [list issues or 'All PASS']"

──────────────────────────────────────────────────────────────
AGENT 2 — backend  (subagent_type: python-pro)
──────────────────────────────────────────────────────────────
Prompt:
  You are the Backend engineer on the smartify-phase0 team.
  Team name: smartify-phase0
  Project: ~/projects/smartify-plus

  STARTUP:
    1. vault__read_note  memory/context
    2. vault__read_note  projects/smartify-plus/context
    3. Read: extractor.py, output.py, app.py, simulate_extraction.py

  YOUR JOB — Python code quality review + targeted fixes.

  EXTRACTOR.PY REVIEW
  [ ] All functions have type hints on args AND return values
  [ ] No bare except: — all exceptions are typed (Exception at minimum)
  [ ] fitz document closed in finally block in pdf_to_images_b64()
  [ ] image_file_to_b64() uses BytesIO, not a temp file on disk
  [ ] _normalise_record() handles all these safely without raising:
        amount="$1,234.50" → 1234.50 (strip $ and comma)
        confidence="0.9"   → 0.9 (string to float)
        confidence=1.5     → 1.0 (clamp to 1.0)
        confidence=None    → 0.5 (default)
        gst_code="GST-FREE" → "unknown" (invalid value → default)
  [ ] _parse_model_response() has all 3 rescue layers in correct order:
        1. _strip_markdown_fences()
        2. json.loads()
        3. _rescue_json() regex rescue
  [ ] extract_from_file() Tesseract temp file deleted in FINALLY (not just success)
  [ ] extract_from_file() returns a list — never raises to the caller

  OUTPUT.PY REVIEW
  [ ] generate_excel() returns bytes (BytesIO.getvalue()), not a file path
  [ ] generate_pdf_report() uses Paragraph objects in table cells (not plain strings)
  [ ] generate_pdf_report() has repeatRows=1 on the transaction table
  [ ] _format_currency() handles None safely (returns "—")
  [ ] _format_confidence() handles None and TypeError safely (returns "—")
  [ ] No imports inside function bodies (all at top of file)

  APP.PY REVIEW
  [ ] Temp file deleted in finally block, not just on success
  [ ] ConnectionRefusedError caught separately from generic Exception
  [ ] df.style uses .map() not deprecated .applymap()
  [ ] Both download buttons (Excel + PDF) wrapped in separate try/except
  [ ] No extraction logic — only calls extract_from_file() and generate_*()

  SIMULATE_EXTRACTION.PY REVIEW
  [ ] Covers all 8 edge cases: perfect, GST-free, missing date, bank statement,
      insurance, missing vendor+amount, OCR fallback, total extraction failure
  [ ] confidence=0.0 record present (extraction failure case)
  [ ] Output file write uses "wb" mode

  FOR EVERY FAIL ITEM:
    Fix it directly in the file.
    Keep fixes minimal — do not refactor working code.
    Run after each fix: python simulate_extraction.py
    Only commit after ALL fixes pass simulate_extraction.py

  When done (all fixes applied and tested):
    git -C ~/projects/smartify-plus add <specific files only>
    git -C ~/projects/smartify-plus commit -m "fix(backend): <description>"
    SendMessage type="message" recipient="lead" team_name="smartify-phase0"
    Content: "Backend review complete. Fixed: [list]. simulate_extraction.py: PASS"

──────────────────────────────────────────────────────────────
AGENT 3 — devops  (subagent_type: devops-engineer)
──────────────────────────────────────────────────────────────
Prompt:
  You are the DevOps engineer on the smartify-phase0 team.
  Team name: smartify-phase0
  Project: ~/projects/smartify-plus

  STARTUP:
    1. vault__read_note  memory/context
    2. vault__read_note  memory/infrastructure
    3. vault__read_note  projects/smartify-plus/context
    4. Read: Dockerfile, docker-compose.yml, requirements.txt, .env.example

  YOUR JOB — Container review + full deployment execution.

  PHASE A: REVIEW (report PASS/FAIL + reason for each)

  DOCKERFILE
  [ ] Base image is python:3.12-slim (not 3.11, not 3.12-alpine)
  [ ] tesseract-ocr AND tesseract-ocr-eng installed via apt
  [ ] requirements.txt copied BEFORE source files (layer cache efficiency)
  [ ] HEALTHCHECK CMD tests http://localhost:8501/_stcore/health
  [ ] CMD runs streamlit with --server.headless=true and --browser.gatherUsageStats=false
  [ ] WORKDIR is /app
  [ ] No secrets, passwords, or tokens in any ENV or ARG instruction

  DOCKER-COMPOSE.YML
  [ ] ollama service healthcheck tests for model name (not just API up):
      "curl -sf http://localhost:11434/api/tags | grep -q 'qwen2.5-vl'"
  [ ] start_period is 600s or more (5-10 min for 5 GB model download)
  [ ] app service depends_on ollama with condition: service_healthy
  [ ] Named volume smartify_ollama_models (not anonymous volume)
  [ ] App environment uses service name "ollama" not "localhost"
  [ ] No .env file mounted as volume (env vars injected directly)
  [ ] restart: unless-stopped on both services

  REQUIREMENTS.TXT
  [ ] Pillow is 12.1.1 or higher (not 11.x — security vulnerability)
  [ ] All packages have pinned == versions (not >= or ~=)
  [ ] openpyxl present (pandas xlsx engine)
  [ ] pytesseract present

  Fix any FAIL items before proceeding to deployment.

  PHASE B: DEPLOY (execute in exact order, stop on any failure)

  Stage 1 — Python environment test (no Docker, no Ollama):
    cd ~/projects/smartify-plus
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python simulate_extraction.py
    → Must show: ✅ test_output.xlsx written  AND  ✅ test_output.pdf written
    → Open test_output.xlsx: verify 2 sheets present ("Extracted Data", "Summary")
    → Confirm test_output.pdf file size > 5000 bytes
    If FAIL → stop, SendMessage to lead with exact error

  Stage 2 — Docker build:
    docker build -t smartify-app:phase0 .
    → Must complete with no errors
    → Run: docker run --rm smartify-app:phase0 python -c "import fitz, streamlit, openai, reportlab, pandas, openpyxl, PIL; print('all imports OK')"
    If FAIL → stop, SendMessage to lead with exact error

  Stage 3 — Full stack docker-compose:
    docker-compose -f ~/projects/smartify-plus/docker-compose.yml up --build -d
    → Watch: docker-compose logs -f ollama
    → Wait for line containing: "Model ready — Ollama is serving."
    → Then: docker-compose ps
    → Both services must show healthy
    → curl -sf http://localhost:8501/_stcore/health  → must return "ok"
    If either service not healthy after 15 min → docker-compose logs <service>, stop, SendMessage to lead

  Stage 4 — Smoke test:
    curl -sf http://localhost:8501  → must return HTML (200 OK)
    curl -sf http://localhost:11434/api/tags | python3 -m json.tool | grep qwen2.5-vl
    → Must show model name in output
    If FAIL → stop, SendMessage to lead

  When all 4 stages pass:
    docker-compose ps (screenshot equivalent: paste full output)
    SendMessage type="message" recipient="lead" team_name="smartify-phase0"
    Content: "DevOps deploy complete. All 4 stages PASS. Stack healthy at http://localhost:8501"

──────────────────────────────────────────────────────────────
AGENT 4 — qa  (subagent_type: qa-expert)
──────────────────────────────────────────────────────────────
Prompt:
  You are the QA engineer on the smartify-phase0 team.
  Team name: smartify-phase0
  Project: ~/projects/smartify-plus

  STARTUP:
    1. vault__read_note  memory/context
    2. vault__read_note  projects/smartify-plus/context
    3. Read ALL source files
    4. Read: PROMPT_review_and_deploy.md

  YOUR JOB — Independent validation. You do NOT fix code.
  If you find issues, SendMessage to the responsible agent + to lead.

  WAIT for Backend agent's "simulate_extraction.py: PASS" message before starting
  your test phase. You can read source files and prepare your plan while waiting.

  TEST PHASE A — Output validation (no Ollama needed):
    python simulate_extraction.py

    EXCEL validation (open test_output.xlsx):
    [ ] Sheet "Extracted Data" exists and has 8 data rows + 1 header = 9 rows total
    [ ] Sheet "Summary" exists with "Total Records" = 8
    [ ] Header row is dark blue background with white text
    [ ] Row with gst_code="10%" has green background fill
    [ ] Row with gst_code="0%" has amber/yellow background fill
    [ ] Row with gst_code="unknown" has red/pink background fill
    [ ] Row with confidence=0.0 has red bold font in Confidence column
    [ ] Amount column shows "$125.40" format ($ + comma + 2 decimal) not "125.4"
    [ ] "—" (em dash) shown for null amounts and dates (not "None", not "null", not "")

    PDF validation (open test_output.pdf):
    [ ] File is landscape A4 orientation (297mm × 210mm)
    [ ] Title "Smartify Plus — Financial Extraction Report" visible
    [ ] GST summary tiles present: "10% GST Taxable", "0% GST Free", "Unknown GST", "Low Confidence"
    [ ] Summary tile values: 4, 2, 2, 5  (count your SAMPLE_RECORDS to verify)
    [ ] Transaction table present with all 8 rows
    [ ] Header row repeats if table spans multiple pages
    [ ] Disclaimer footer text present at bottom
    [ ] File size > 10,000 bytes

  TEST PHASE B — Code correctness checks (read source, no execution needed):
    [ ] extractor.py line for confidence cap: min(..., 0.70) — NOT 0.85 or 0.75
    [ ] extractor.py: classify_gst() returns model_code unchanged when it's "10%" or "0%"
    [ ] extractor.py: all 3 JSON rescue layers present and in correct order
    [ ] output.py: Paragraph objects used in transaction table cells (search for "Paragraph(")
    [ ] output.py: repeatRows=1 present in Table() call
    [ ] app.py: Path(tmp_path).unlink() is inside a finally: block
    [ ] app.py: .map() used, not .applymap()
    [ ] docker-compose.yml: start_period value >= 300s

  TEST PHASE C — Integration check (requires DevOps deploy to be complete):
    Wait for DevOps "Stack healthy" message before running this phase.

    curl -sf http://localhost:8501  → verify 200 OK
    curl -sf http://localhost:11434/api/tags  → verify qwen2.5-vl model present

    Manual smoke test via browser:
    Open http://localhost:8501 in browser.
    [ ] Page title shows "Smartify Plus — Phase Zero"
    [ ] Sidebar shows correct Ollama endpoint and model
    [ ] File uploader accepts PDF and JPG
    [ ] GST legend visible in sidebar (🟢 🟡 🔴)
    [ ] "Process File" button present

  FOR EVERY FAIL:
    Do NOT fix it yourself.
    SendMessage type="message" recipient="backend" team_name="smartify-phase0"
      Content: "QA BLOCK: [file] [issue description] [expected vs actual]"
    SendMessage type="message" recipient="lead" team_name="smartify-phase0"
      Content: "QA BLOCK on [agent]: [summary of issue]"

  When all phases pass:
    SendMessage type="message" recipient="lead" team_name="smartify-phase0"
    Content: "QA sign-off complete. All phases PASS. Phase Zero deployment validated."

═══════════════════════════════════════════════════════════════
STEP 3 — LEAD COORDINATION RULES
═══════════════════════════════════════════════════════════════

You (lead) manage the flow:

PARALLEL start (immediately after spawning):
  Architect + Backend + DevOps can all start simultaneously.
  QA starts reading but waits for Backend "simulate_extraction PASS" before testing.

GATE 1 — Before DevOps Stage 3 (docker-compose up):
  Wait for Backend commit message ("Backend review complete").
  Reason: Docker build must use fixed code, not pre-fix code.
  Tell DevOps: "Gate 1 cleared. Proceed to Stage 3."

GATE 2 — Before QA Phase C (integration tests):
  Wait for DevOps "Stack healthy" message.
  Tell QA: "Gate 2 cleared. Stack is up. Proceed to Phase C."

GATE 3 — Final sign-off:
  Wait for QA "sign-off complete" message.
  Only then declare Phase Zero deployment successful.

IF any agent reports a BLOCKER:
  Assess severity:
    - Code bug   → assign fix back to Backend, re-run QA on that item only
    - Docker bug → assign fix to DevOps, re-run affected stage only
    - Arch issue → assess yourself; if structural, propose fix to user before implementing
  Document in vault: vault__append_note projects/smartify-plus/mistakes

═══════════════════════════════════════════════════════════════
STEP 4 — COMPLETION ACTIONS (lead does this after QA sign-off)
═══════════════════════════════════════════════════════════════

1. Run final verification:
   git -C ~/projects/smartify-plus log --oneline -8
   git -C ~/projects/smartify-plus status
   docker-compose -f ~/projects/smartify-plus/docker-compose.yml ps

2. Write vault summary:
   vault__append_note  projects/smartify-plus/context
   Include:
     - Date + session summary
     - All agents' verdicts
     - Issues found and fixed (or "none")
     - Final deployment target and URL
     - docker-compose ps output
     - QA sign-off confirmed: yes/no

3. If any issues were fixed, write to mistakes:
   vault__append_note  projects/smartify-plus/mistakes
   Root cause for each bug found.

4. Report to user:
   "Phase Zero deployment complete.
    ✅ Architect: [summary]
    ✅ Backend: [N fixes applied]
    ✅ DevOps: [4 stages passed]
    ✅ QA: [all phases signed off]
    App running at: http://localhost:8501
    Next: [suggest first real test to run]"

═══════════════════════════════════════════════════════════════
PHASE ZERO SCOPE REMINDER — enforce this as lead
═══════════════════════════════════════════════════════════════

If any agent proposes adding features beyond what's in CLAUDE.md scope:
  Respond: "That is Phase One scope. Note it in vault, do not implement."

Nothing gets added in this session that isn't already in the codebase.
The goal is: review it, fix it, deploy it, validate it. That's all.
```
