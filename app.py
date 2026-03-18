"""
app.py — Smartify Plus Phase Zero Demo
Main Streamlit application.

Flow:
  1. User uploads PDF or image
  2. File written to secure temp path
  3. extractor.py processes via Ollama vision (with fallback)
  4. Results displayed as styled DataFrame + raw JSON expander
  5. Excel + PDF downloads available immediately
"""

import json
import logging
import os
import tempfile
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from extractor import extract_from_file
from output import generate_excel, generate_pdf_report

# Load .env for local development — no-op inside Docker (env vars injected directly)
load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv("OLLAMA_API_BASE", "http://localhost:11434/v1")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL",    "qwen2.5-vl:7b-instruct")
ALLOWED_EXTS    = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
MAX_FILE_MB     = 50

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ─── Page setup ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Smartify Plus — Phase Zero",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Light CSS tweaks — minimal, no framework conflicts
st.markdown("""
<style>
  .block-container { padding-top: 1.5rem; }
  div[data-testid="stDownloadButton"] button { width: 100%; margin-top: 4px; }
</style>
""", unsafe_allow_html=True)

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ Configuration")
    st.code(f"Endpoint:\n{OLLAMA_BASE_URL}", language="text")
    st.code(f"Model:\n{OLLAMA_MODEL}",       language="text")
    st.divider()
    st.markdown("**GST Colour Legend**")
    st.markdown("🟢 **10%** — Taxable supply")
    st.markdown("🟡 **0%** — GST-free supply")
    st.markdown("🔴 **Unknown** — Needs accountant review")
    st.divider()
    st.markdown("**Supported documents**")
    st.markdown("- Receipts & invoices (PDF/image)\n- Handwritten notes ✍️\n- Bank statement PDFs\n- Scanned documents")
    st.divider()
    st.caption("Smartify Plus Phase Zero\nFor demonstration purposes only.")

# ─── Header ───────────────────────────────────────────────────────────────────
st.title("📊 Smartify Plus — Phase Zero Demo")
st.markdown(
    "Upload a receipt, invoice, handwritten note, or bank statement. "
    "AI vision extracts structured data and applies Australian ATO GST rules automatically."
)

# ─── File upload ──────────────────────────────────────────────────────────────
uploaded = st.file_uploader(
    "Choose a document to process",
    type=["pdf", "png", "jpg", "jpeg", "tiff", "bmp", "webp"],
    help="PDF (multi-page bank statements supported) · PNG/JPG · Handwritten documents ✍️",
)

if uploaded is None:
    st.info("👆 Upload a document above to begin extraction.")
    st.stop()

# Validate extension
ext = Path(uploaded.name).suffix.lower()
if ext not in ALLOWED_EXTS:
    st.error(f"❌ Unsupported format `{ext}`. Please upload a PDF or image file.")
    st.stop()

# Validate size
size_mb = uploaded.size / (1024 * 1024)
if size_mb > MAX_FILE_MB:
    st.error(f"❌ File too large ({size_mb:.1f} MB). Maximum allowed: {MAX_FILE_MB} MB.")
    st.stop()

st.success(f"✅ Loaded: **{uploaded.name}** — {size_mb:.1f} MB")

# ─── Process button ───────────────────────────────────────────────────────────
if not st.button("🚀 Process File", type="primary", use_container_width=True):
    st.stop()

# ─── Extraction ───────────────────────────────────────────────────────────────
# Write to a secure temp file; always deleted in finally block
records: list[dict] = []
err_msg: str | None = None
tmp_path: str | None = None

try:
    with tempfile.NamedTemporaryFile(
        suffix=ext, delete=False, prefix="smartify_upload_"
    ) as tmp:
        tmp.write(uploaded.read())
        tmp_path = tmp.name

    with st.spinner(
        "🤖 Analysing with AI vision model… "
        "This takes 30–90 s per page depending on hardware."
    ):
        records = extract_from_file(
            file_path=tmp_path,
            file_ext=ext,
            ollama_base_url=OLLAMA_BASE_URL,
            ollama_model=OLLAMA_MODEL,
        )

except ConnectionRefusedError:
    err_msg = (
        f"❌ Cannot connect to Ollama at `{OLLAMA_BASE_URL}`. "
        "Ensure Ollama is running and the model is pulled. "
        "Run: `ollama pull qwen2.5-vl:7b-instruct`"
    )
except Exception as exc:
    logger.exception("Extraction pipeline failed")
    err_msg = (
        f"❌ Processing failed: {str(exc)[:200]}. "
        "Try a clearer scan or check the Ollama connection."
    )
finally:
    # Secure cleanup — runs regardless of exception
    if tmp_path:
        Path(tmp_path).unlink(missing_ok=True)

if err_msg:
    st.error(err_msg)
    st.stop()

if not records:
    st.warning(
        "⚠️ No data extracted from the document. "
        "Try a higher-quality scan, or ensure the Ollama model is fully loaded."
    )
    st.stop()

# ─── Summary metrics ──────────────────────────────────────────────────────────
st.success(f"✅ Extraction complete — **{len(records)} record(s)** found.")
st.divider()

total_amt = sum(float(r["amount"]) for r in records if r.get("amount") is not None)
n_10      = sum(1 for r in records if r.get("gst_code") == "10%")
n_0       = sum(1 for r in records if r.get("gst_code") == "0%")
n_low     = sum(1 for r in records if float(r.get("confidence") or 0) < 0.85)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Amount",    f"${total_amt:,.2f}")
c2.metric("10% GST Records", n_10)
c3.metric("0% GST Records",  n_0)
c4.metric(
    "Needs Review",
    n_low,
    delta="low confidence" if n_low > 0 else "all clear",
    delta_color="inverse" if n_low > 0 else "normal",
)

st.divider()

# ─── Data table ───────────────────────────────────────────────────────────────
st.subheader("📋 Extracted Data")

# Build display rows
display_rows = []
for i, rec in enumerate(records, 1):
    conf = float(rec.get("confidence") or 0)
    display_rows.append({
        "#":           i,
        "Date":        rec.get("date")        or "—",
        "Vendor":      rec.get("vendor")      or "—",
        "Description": rec.get("description") or "—",
        "Amount ($)":  f"${float(rec['amount']):,.2f}" if rec.get("amount") is not None else "—",
        "GST Code":    rec.get("gst_code", "unknown"),
        "Confidence":  f"{conf * 100:.0f}%",
        "Notes":       rec.get("notes") or "",
    })

df = pd.DataFrame(display_rows)


def _style_gst(val: str) -> str:
    """Return CSS background colour for GST code cells."""
    return {
        "10%":     "background-color: #d4edda",
        "0%":      "background-color: #fff3cd",
        "unknown": "background-color: #f8d7da",
    }.get(val, "")


def _style_confidence(val: str) -> str:
    """Return CSS colour for confidence cells — red if below 85%."""
    try:
        return "color: #c0392b; font-weight: bold" if float(val.strip("%")) < 85 else "color: #27ae60"
    except (ValueError, AttributeError):
        return ""


styled_df = (
    df.style
    .map(_style_gst,        subset=["GST Code"])     # .map replaces deprecated .applymap
    .map(_style_confidence, subset=["Confidence"])
)

st.dataframe(styled_df, use_container_width=True, hide_index=True)

# ── Raw JSON expander ─────────────────────────────────────────────────────────
with st.expander("🔍 View Raw JSON Output"):
    st.json(records)

st.divider()

# ─── Download buttons ─────────────────────────────────────────────────────────
st.subheader("⬇️ Download Results")
base_name = uploaded.name.rsplit(".", 1)[0]

dl_col1, dl_col2 = st.columns(2)

with dl_col1:
    try:
        xl_bytes = generate_excel(records)
        st.download_button(
            label="📥 Download Excel (.xlsx)",
            data=xl_bytes,
            file_name=f"smartify_{base_name}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
    except Exception as exc:
        st.error(f"Excel generation failed: {exc}")

with dl_col2:
    try:
        pdf_bytes = generate_pdf_report(records)
        st.download_button(
            label="📄 Download PDF Report",
            data=pdf_bytes,
            file_name=f"smartify_{base_name}.pdf",
            mime="application/pdf",
            use_container_width=True,
        )
    except Exception as exc:
        st.error(f"PDF generation failed: {exc}")

# ─── Disclaimer ───────────────────────────────────────────────────────────────
st.divider()
st.caption(
    "⚠️ AI extraction results must be reviewed by a qualified accountant. "
    "GST codes are indicative only and do not constitute tax advice. "
    "Always verify against original source documents before lodging with the ATO. "
    "Smartify Plus Phase Zero — For demonstration purposes."
)
