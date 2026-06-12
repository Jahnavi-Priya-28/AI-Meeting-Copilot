"""
utils/file_utils.py
────────────────────
Helper functions for file validation, path management, and temp file cleanup.
"""

import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

from config.settings import settings

# Allowed audio MIME types
ALLOWED_MIME_TYPES = {
    "audio/mpeg",           # .mp3
    "audio/mp3",
    "audio/wav",            # .wav
    "audio/wave",
    "audio/x-wav",
    "audio/ogg",            # .ogg (bonus support)
    "audio/mp4",            # .m4a
    "video/mp4",            # some recorders save as mp4
}

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".mp4"}


def validate_audio_file(file: UploadFile) -> None:
    """
    Raise HTTP 400 if the uploaded file is not a valid audio type
    or exceeds the configured size limit.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Content-type check (not foolproof but useful as a first gate)
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type '{file.content_type}'."
        )


def generate_unique_filename(original_filename: str) -> tuple[str, str]:
    """
    Returns (meeting_id, safe_filename) where:
      - meeting_id: UUID4 string used as the MongoDB document ID
      - safe_filename: '<uuid><original_ext>' stored on disk
    """
    meeting_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix.lower()
    safe_name = f"{meeting_id}{ext}"
    return meeting_id, safe_name


def get_upload_path(filename: str) -> Path:
    """Returns the absolute Path for a file inside the configured upload directory."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir / filename


def delete_file_safely(file_path: str) -> bool:
    """
    Delete a file from disk without raising an exception if it doesn't exist.
    Returns True if deleted, False otherwise.
    """
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
    except Exception:
        pass
    return False


def get_file_size(file_path: str) -> int:
    """Return file size in bytes. Returns 0 if file not found."""
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0
