"""
routers/meetings.py
────────────────────
Extra meeting-level routes:
  GET  /meetings           → list all (already in main.py, moved here for clarity)
  GET  /meetings/{id}      → single meeting
  DELETE /meetings/{id}    → delete meeting + its FAISS index + audio file
"""

from pathlib import Path
from fastapi import APIRouter, HTTPException

from services import mongo_service
from services.rag_service import INDEX_DIR
from utils.file_utils import delete_file_safely

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.get("", summary="List all meetings")
async def list_meetings(limit: int = 50):
    meetings = await mongo_service.get_all_meetings(limit=limit)
    return {"meetings": meetings, "count": len(meetings)}


@router.get("/{meeting_id}", summary="Get a single meeting")
async def get_meeting(meeting_id: str):
    meeting = await mongo_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return meeting


@router.delete("/{meeting_id}", summary="Delete a meeting and all its artifacts")
async def delete_meeting(meeting_id: str):
    """
    Deletes:
      1. The MongoDB document
      2. The uploaded audio file from disk
      3. The FAISS index + chunk file for this meeting
    """
    meeting = await mongo_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    # Delete audio file
    if file_path := meeting.get("file_path"):
        delete_file_safely(file_path)

    # Delete FAISS index files
    for suffix in [".faiss", "_chunks.json"]:
        delete_file_safely(str(INDEX_DIR / f"{meeting_id}{suffix}"))

    # Delete MongoDB document
    await mongo_service.delete_meeting(meeting_id)

    return {"deleted": True, "meeting_id": meeting_id}
