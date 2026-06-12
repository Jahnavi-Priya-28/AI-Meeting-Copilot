"""
routers/summarize.py
─────────────────────
POST /summarize  — Generate summary, key points, and action items using GPT.
"""

from fastapi import APIRouter, HTTPException

from models.schemas import SummarizeRequest, SummarizeResponse
from services import mongo_service, gpt_service

router = APIRouter(prefix="/summarize", tags=["Summarize"])


@router.post("", response_model=SummarizeResponse, summary="Generate summary, key points, and action items")
async def summarize_meeting(body: SummarizeRequest):
    """
    Generate a structured meeting summary using GPT.

    Uses the translated transcript if available, otherwise falls back
    to the raw transcript. Results are persisted to MongoDB.
    """

    # ── 1. Fetch meeting ──────────────────────────────────────────────────────
    meeting = await mongo_service.get_meeting(body.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail=f"Meeting '{body.meeting_id}' not found.")

    # Prefer translated text (English) for better GPT results
    text_to_summarize = meeting.get("translated_text") or meeting.get("transcript")
    if not text_to_summarize:
        raise HTTPException(
            status_code=400,
            detail="No transcript found. Please run /transcribe first."
        )

    # ── 2. Summarize with GPT ─────────────────────────────────────────────────
    try:
        summary_output = await gpt_service.summarize_transcript(text_to_summarize)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(exc)}")

    # ── 3. Persist to MongoDB ─────────────────────────────────────────────────
    await mongo_service.update_meeting(body.meeting_id, {
        "summary": summary_output.summary,
        "key_points": summary_output.key_points,
        "action_items": summary_output.action_items,
    })

    return SummarizeResponse(
        meeting_id=body.meeting_id,
        summary_output=summary_output,
    )
