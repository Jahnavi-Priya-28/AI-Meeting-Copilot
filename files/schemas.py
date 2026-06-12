"""
models/schemas.py
─────────────────
All Pydantic v2 request and response schemas used across the API.
Keeping them in one place makes it easy to track the API contract.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Shared ─────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


# ── /upload ────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    meeting_id: str = Field(..., description="Unique meeting identifier (MongoDB _id)")
    filename: str
    file_path: str
    size_bytes: int
    message: str = "File uploaded successfully"


# ── /transcribe ────────────────────────────────────────────────────────────────

class TranscribeRequest(BaseModel):
    meeting_id: str = Field(..., description="Meeting ID returned from /upload")


class TranscribeResponse(BaseModel):
    meeting_id: str
    transcript: str = Field(..., description="Raw transcript from Whisper")
    detected_language: str = Field(..., description="ISO 639-1 language code, e.g. 'en', 'hi'")
    duration_seconds: Optional[float] = None
    message: str = "Transcription complete"


# ── /translate ─────────────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    meeting_id: str
    target_language: str = Field(default="en", description="ISO 639-1 target language code")


class TranslateResponse(BaseModel):
    meeting_id: str
    original_language: str
    target_language: str
    translated_text: str
    message: str = "Translation complete"


# ── /summarize ─────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    meeting_id: str


class SummaryOutput(BaseModel):
    summary: str = Field(..., description="Concise paragraph summary")
    key_points: list[str] = Field(..., description="Bullet-point key takeaways")
    action_items: list[str] = Field(..., description="Actionable tasks identified")


class SummarizeResponse(BaseModel):
    meeting_id: str
    summary_output: SummaryOutput
    message: str = "Summarization complete"


# ── /ask (RAG) ─────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    meeting_id: str
    question: str = Field(..., min_length=3, max_length=500)


class AskResponse(BaseModel):
    meeting_id: str
    question: str
    answer: str
    source_chunks: list[str] = Field(
        default_factory=list,
        description="Relevant transcript chunks used to generate the answer"
    )


# ── Meeting (MongoDB document shape) ──────────────────────────────────────────

class MeetingDocument(BaseModel):
    """Mirrors the MongoDB document structure for type safety."""
    meeting_id: str
    filename: str
    file_path: str
    size_bytes: int
    transcript: Optional[str] = None
    detected_language: Optional[str] = None
    translated_text: Optional[str] = None
    target_language: Optional[str] = None
    summary: Optional[str] = None
    key_points: Optional[list[str]] = None
    action_items: Optional[list[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
