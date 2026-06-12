"""
routers/rag.py
───────────────
RAG index management endpoints.

  GET    /rag/{meeting_id}          → index metadata (chunk count, build time)
  POST   /rag/{meeting_id}/rebuild  → force-rebuild the FAISS index
  DELETE /rag/{meeting_id}          → delete the FAISS index files

The /ask endpoint (actual Q&A) lives in routers/ask.py.
These routes are for inspection and maintenance.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import mongo_service
from services.rag_service import (
    build_index,
    get_index_info,
    delete_index,
)

router = APIRouter(prefix="/rag", tags=["RAG"])


# ── Response schemas ──────────────────────────────────────────────────────────

class IndexInfoResponse(BaseModel):
    meeting_id:    str
    chunk_count:   int
    built_at:      str
    embedding_dim: int
    avg_chunk_chars: float
    status:        str = "ready"


class RebuildResponse(BaseModel):
    meeting_id:  str
    chunk_count: int
    message:     str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{meeting_id}", response_model=IndexInfoResponse,
            summary="Get FAISS index metadata for a meeting")
async def get_rag_info(meeting_id: str):
    """
    Returns metadata about the FAISS index: chunk count, build timestamp,
    average chunk size. Does NOT load the full index into memory.
    """
    meeting = await mongo_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    info = await get_index_info(meeting_id)
    if not info:
        raise HTTPException(
            status_code=404,
            detail="No FAISS index found for this meeting. Run /transcribe first."
        )

    chunk_sizes  = info.get("chunk_sizes", [])
    avg_chars    = sum(chunk_sizes) / len(chunk_sizes) if chunk_sizes else 0

    return IndexInfoResponse(
        meeting_id    = meeting_id,
        chunk_count   = info["chunk_count"],
        built_at      = info["built_at"],
        embedding_dim = info["embedding_dim"],
        avg_chunk_chars = round(avg_chars, 1),
    )


@router.post("/{meeting_id}/rebuild", response_model=RebuildResponse,
             summary="Force-rebuild the FAISS index for a meeting")
async def rebuild_rag_index(meeting_id: str):
    """
    Deletes and rebuilds the FAISS index from the stored transcript.
    Useful if the transcript was edited or if the index became corrupted.

    Re-embeds all chunks via OpenAI — incurs API cost proportional to
    the transcript length.
    """
    meeting = await mongo_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    transcript = meeting.get("transcript")
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript found. Run /transcribe first."
        )

    try:
        chunk_count = await build_index(
            meeting_id    = meeting_id,
            transcript    = transcript,
            force_rebuild = True,          # Always re-embed
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Index rebuild failed: {exc}")

    return RebuildResponse(
        meeting_id  = meeting_id,
        chunk_count = chunk_count,
        message     = f"Index rebuilt with {chunk_count} chunks.",
    )


@router.delete("/{meeting_id}", summary="Delete the FAISS index for a meeting")
async def delete_rag_index(meeting_id: str):
    """
    Deletes the FAISS index files (.faiss, _chunks.json, _meta.json)
    for the specified meeting. The MongoDB document and audio file are
    kept intact — only the vector index is removed.
    """
    meeting = await mongo_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    deleted = await delete_index(meeting_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="No index files found for this meeting."
        )

    return {"deleted": True, "meeting_id": meeting_id}
