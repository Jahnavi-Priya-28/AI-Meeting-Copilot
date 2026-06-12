"""
routers/transcribe.py
──────────────────────
POST /transcribe  — Run Whisper on the uploaded audio, store the transcript,
                   and automatically build the FAISS RAG index.
"""

from fastapi import APIRouter, HTTPException

from models.schemas import TranscribeRequest, TranscribeResponse
from services import mongo_service, whisper_service, rag_service

router = APIRouter(prefix="/transcribe", tags=["Transcribe"])


@router.post("", response_model=TranscribeResponse, summary="Transcribe audio to text")
async def transcribe_audio(body: TranscribeRequest):
    """
    Transcribe a previously uploaded audio file using Whisper.

    Side effects:
    - Saves `transcript` and `detected_language` to MongoDB.
    - Builds a FAISS vector index for RAG (used by /ask).
    """

    # ── 1. Fetch meeting from DB ──────────────────────────────────────────────
    meeting = await mongo_service.get_meeting(body.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail=f"Meeting '{body.meeting_id}' not found.")

    file_path = meeting.get("file_path")
    if not file_path:
        raise HTTPException(status_code=400, detail="No audio file associated with this meeting.")

    # ── 2. Run Whisper ────────────────────────────────────────────────────────
    try:
        result = await whisper_service.transcribe_audio(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Audio file not found at '{file_path}'.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Whisper transcription failed: {str(exc)}")

    transcript = result["text"]
    language = result["language"]
    duration = result.get("duration")

    # ── 3. Store transcript in MongoDB ────────────────────────────────────────
    await mongo_service.update_meeting(body.meeting_id, {
        "transcript": transcript,
        "detected_language": language,
        "duration_seconds": duration,
    })

    # ── 4. Build FAISS index for RAG (non-blocking; errors are logged not raised) ──
    try:
        chunk_count = await rag_service.build_index(body.meeting_id, transcript)
        print(f"[RAG] Built index for meeting {body.meeting_id} with {chunk_count} chunks.")
    except Exception as exc:
        # RAG index failure shouldn't fail the transcription response
        print(f"[RAG] Warning: index build failed for {body.meeting_id}: {exc}")

    return TranscribeResponse(
        meeting_id=body.meeting_id,
        transcript=transcript,
        detected_language=language,
        duration_seconds=duration,
    )
