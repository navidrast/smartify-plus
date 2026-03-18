"""
main.py -- FastAPI application entry point for Smartify Plus Phase One backend.

Lifespan:
  - Creates all database tables on startup
  - Seeds demo user if not present
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from config import CORS_ORIGINS, DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_USER_NAME
from database import Base, engine, async_session
from models import User  # noqa: F401 -- registers all models with Base

# Import all models so Base.metadata sees them
from models import Conversation, Document, Message, ExtractedRecord, AgentEvent  # noqa: F401

from routers import chat, conversations, export, records, upload

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    # Seed demo user
    async with async_session() as db:
        stmt = select(User).where(User.id == DEMO_USER_ID)
        result = await db.execute(stmt)
        if not result.scalar_one_or_none():
            demo_user = User(
                id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
                display_name=DEMO_USER_NAME,
            )
            db.add(demo_user)
            await db.commit()
            logger.info("Demo user seeded: %s", DEMO_USER_EMAIL)
        else:
            logger.info("Demo user already exists")

    yield

    await engine.dispose()


app = FastAPI(
    title="Smartify Plus API",
    version="1.0.0",
    description="AI-powered receipt/invoice extraction for Australian accounting firms",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(upload.router)
app.include_router(records.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "smartify-plus-backend"}
