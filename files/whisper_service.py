"""
services/whisper_service.py
────────────────────────────
Wraps OpenAI Whisper (local model) for speech-to-text transcription.
The model is loaded once at startup and reused across requests.
"""

import asyncio
from functools import lru_cache
from typing import Optional
import whisper

from config.settings import settings


@lru_cache(maxsize=1)
def _load_model():
    """
    Load the Whisper model once and cache it.
    lru_cache with maxsize=1 ensures a single instance lives in memory.
    """
    print(f"[Whisper] Loading model: {settings.whisper_model_size}")
    model = whisper.load_model(settings.whisper_model_size)
    print("[Whisper] Model loaded successfully")
    return model


async def transcribe_audio(file_path: str) -> dict:
    """
    Transcribe an audio file using the local Whisper model.

    Whisper is CPU-bound; we run it in a thread pool executor so it doesn't
    block the FastAPI event loop.

    Returns:
        {
            "text": str,               # Full transcript
            "language": str,           # Detected ISO 639-1 language code
            "duration": float | None   # Audio duration in seconds
        }
    """
    model = _load_model()

    # Run synchronous Whisper in a background thread
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,  # Uses default ThreadPoolExecutor
        lambda: model.transcribe(
            file_path,
            fp16=False,          # fp16 requires CUDA; disable for CPU
            verbose=False,
        )
    )

    # Extract duration from segments if available
    duration: Optional[float] = None
    if result.get("segments"):
        last_segment = result["segments"][-1]
        duration = last_segment.get("end")

    return {
        "text": result.get("text", "").strip(),
        "language": result.get("language", "unknown"),
        "duration": duration,
    }
