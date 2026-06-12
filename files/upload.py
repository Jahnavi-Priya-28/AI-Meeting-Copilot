"""
routers/upload.py
──────────────────
POST /upload  — Accept an audio file, save it to disk, create a MongoDB record.
"""

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from config.settings import settings
from models.schemas import UploadResponse
from services import mongo_service
from utils.file_utils import (
    validate_audio_file,
    generate_unique_filename,
    get_upload_path,
)

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse, summary="Upload an audio file")
async def upload_audio(file: UploadFile = File(..., description="MP3 or WAV audio file")):
    """
    Upload an audio meeting recording.

    - Validates file type and size.
    - Saves file to the configured upload directory.
    - Creates a MongoDB document for the meeting.
    - Returns a `meeting_id` used by all subsequent endpoints.
    """

    # ── 1. Validate ───────────────────────────────────────────────────────────
    validate_audio_file(file)

    # Read file content into memory for size check and writing
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_file_size_mb} MB limit."
        )

    # ── 2. Generate unique name and save to disk ──────────────────────────────
    meeting_id, safe_filename = generate_unique_filename(file.filename or "recording.mp3")
    save_path = get_upload_path(safe_filename)

    async with aiofiles.open(save_path, "wb") as out_file:
        await out_file.write(content)

    file_path_str = str(save_path)

    # ── 3. Persist to MongoDB ─────────────────────────────────────────────────
    await mongo_service.create_meeting({
        "meeting_id": meeting_id,
        "filename": file.filename,
        "file_path": file_path_str,
        "size_bytes": len(content),
    })

    return UploadResponse(
        meeting_id=meeting_id,
        filename=file.filename or safe_filename,
        file_path=file_path_str,
        size_bytes=len(content),
    )
