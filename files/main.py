"""
main.py
────────
FastAPI application entry point.

Registers all routers, configures CORS, mounts startup/shutdown lifecycle hooks,
and exposes a health-check endpoint.

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from services import mongo_service
from routers import upload, transcribe, translate, summarize, ask


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: verify MongoDB connection.
    Shutdown: close MongoDB client gracefully.
    """
    # Startup
    try:
        client = mongo_service.get_client()
        await client.admin.command("ping")
        print("[MongoDB] Connection established.")
    except Exception as exc:
        print(f"[MongoDB] WARNING: Could not connect — {exc}")

    yield  # App is running

    # Shutdown
    await mongo_service.close_connection()
    print("[MongoDB] Connection closed.")


# ── App instance ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Meeting Copilot",
    description=(
        "Real-Time Multilingual Meeting Transcription, Translation, "
        "Summarization, and RAG-powered Q&A."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(upload.router,     prefix=API_PREFIX)
app.include_router(transcribe.router, prefix=API_PREFIX)
app.include_router(translate.router,  prefix=API_PREFIX)
app.include_router(summarize.router,  prefix=API_PREFIX)
app.include_router(ask.router,        prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Quick liveness probe — returns 200 if the server is running."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/v1/meetings", tags=["Meetings"])
async def list_meetings(limit: int = 20):
    """Return the most recent meetings for the dashboard history view."""
    from services import mongo_service as ms
    meetings = await ms.get_all_meetings(limit=limit)
    return {"meetings": meetings, "count": len(meetings)}


@app.get("/api/v1/meetings/{meeting_id}", tags=["Meetings"])
async def get_meeting(meeting_id: str):
    """Fetch a single meeting by ID (full document)."""
    from fastapi import HTTPException
    from services import mongo_service as ms
    meeting = await ms.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return meeting
