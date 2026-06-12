"""
routers/translate.py
─────────────────────
POST /translate  — Translate the stored transcript to the target language.
"""

from fastapi import APIRouter, HTTPException

from models.schemas import TranslateRequest, TranslateResponse
from services import mongo_service, translate_service

router = APIRouter(prefix="/translate", tags=["Translate"])


@router.post("", response_model=TranslateResponse, summary="Translate transcript to target language")
async def translate_transcript(body: TranslateRequest):
    """
    Translate the stored meeting transcript.

    - Reads `transcript` from MongoDB.
    - Calls Google Translate API.
    - Persists `translated_text` back to MongoDB.
    """

    # ── 1. Fetch meeting ──────────────────────────────────────────────────────
    meeting = await mongo_service.get_meeting(body.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail=f"Meeting '{body.meeting_id}' not found.")

    transcript = meeting.get("transcript")
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript not found. Please run /transcribe first."
        )

    # ── 2. Skip if already in target language ────────────────────────────────
    detected_language = meeting.get("detected_language", "unknown")
    if detected_language == body.target_language:
        # Store as-is and return early
        await mongo_service.update_meeting(body.meeting_id, {
            "translated_text": transcript,
            "target_language": body.target_language,
        })
        return TranslateResponse(
            meeting_id=body.meeting_id,
            original_language=detected_language,
            target_language=body.target_language,
            translated_text=transcript,
            message="Source and target languages are the same — no translation needed.",
        )

    # ── 3. Translate ──────────────────────────────────────────────────────────
    try:
        result = await translate_service.translate_text(
            text=transcript,
            target_language=body.target_language,
            source_language=detected_language if detected_language != "unknown" else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(exc)}")

    # ── 4. Persist ────────────────────────────────────────────────────────────
    await mongo_service.update_meeting(body.meeting_id, {
        "translated_text": result["translated_text"],
        "target_language": result["target_language"],
    })

    return TranslateResponse(
        meeting_id=body.meeting_id,
        original_language=result["source_language"],
        target_language=result["target_language"],
        translated_text=result["translated_text"],
    )
