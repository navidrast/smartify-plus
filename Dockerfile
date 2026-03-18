# ─── Smartify Plus Phase Zero — App Container ────────────────────────────────
# Python 3.12 slim base
FROM python:3.12-slim

LABEL maintainer="Smartify Plus <navid@dynacore.au>"
LABEL description="Phase Zero POC — AI receipt/invoice extraction for Australian accountants"

# System dependencies:
#   tesseract-ocr + eng data  — fallback OCR engine when vision model fails
#   libglib2.0-0              — required by Pillow/PyMuPDF on slim images
#   libsm6, libxext6          — OpenCV/Pillow rendering dependencies
#   curl                      — Streamlit healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first — Docker layer cache avoids reinstall on code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source files only (not .env — injected by docker-compose)
COPY app.py extractor.py output.py ./

# Streamlit healthcheck — referenced by docker-compose depends_on condition
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD curl --fail http://localhost:8501/_stcore/health || exit 1

EXPOSE 8501

CMD ["streamlit", "run", "app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true", \
     "--browser.gatherUsageStats=false"]
