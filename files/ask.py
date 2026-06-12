"""
routers/ask.py
───────────────
POST /ask  — RAG-powered Q&A: find relevant transcript chunks via FAISS,
             then generate a grounded answer with GPT.
"""

from fastapi import APIRouter, HTTPException

from models.schemas import AskRequest, AskResponse
from services import mongo_service, rag_service

router = APIRouter(prefix="/ask", tags=["Ask"])


@router.post("", response_model=AskResponse, summary="Ask a question about the meeting (RAG)")
async def ask_question(body: AskRequest):
    """
    Answer a natural language question about the meeting content.

    Uses FAISS for semantic retrieval of relevant transcript passages,
    then passes them to GPT to generate a grounded, factual answer.

    The FAISS index is built automatically during /transcribe.
    """

    # ── 1. Verify meeting exists ──────────────────────────────────────────────
    meeting = await mongo_service.get_meeting(body.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail=f"Meeting '{body.meeting_id}' not found.")

    if not meeting.get("transcript"):
        raise HTTPException(
            status_code=400,
            detail="No transcript found. Please run /transcribe first."
        )

    # ── 2. Run RAG pipeline ───────────────────────────────────────────────────
    try:
        result = await rag_service.answer_with_rag(
            meeting_id=body.meeting_id,
            question=body.question,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG pipeline failed: {str(exc)}")

    return AskResponse(
        meeting_id=body.meeting_id,
        question=body.question,
        answer=result["answer"],
        source_chunks=result["source_chunks"],
    )
