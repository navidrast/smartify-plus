"""
config.py -- Centralised configuration for Smartify Plus Phase One backend.

All values read from environment variables with sensible defaults.
"""

import os

QWEN_API_BASE: str = os.getenv(
    "QWEN_API_BASE", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
)
QWEN_VISION_MODEL: str = os.getenv("QWEN_VISION_MODEL", "qwen-vl-max")
QWEN_TEXT_MODEL: str = os.getenv("QWEN_TEXT_MODEL", "qwen-plus")
QWEN_API_KEY: str = os.getenv("QWEN_API_KEY", "")

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./smartify.db")

DEMO_USER_ID: str = os.getenv("DEMO_USER_ID", "demo-user-001")
DEMO_USER_EMAIL: str = "demo@smartify.ai"
DEMO_USER_NAME: str = "Demo User"

ABR_GUID: str = os.getenv("ABR_GUID", "")

CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://192.168.86.63:3000",
]
