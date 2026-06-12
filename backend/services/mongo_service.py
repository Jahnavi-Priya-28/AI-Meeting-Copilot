"""
services/mongo_service.py
──────────────────────────
Async MongoDB helpers using Motor (async PyMongo wrapper).
All other services call these functions instead of touching the DB directly.
"""

from datetime import datetime
from typing import Optional
import motor.motor_asyncio
from bson import ObjectId

from config.settings import settings


# ── Client singleton ──────────────────────────────────────────────────────────
# Motor clients are thread-safe and should be shared across requests.

_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None


def get_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db():
    return get_client()[settings.mongodb_db_name]


def get_meetings_collection():
    return get_db()["meetings"]


# ── CRUD helpers ──────────────────────────────────────────────────────────────

async def create_meeting(meeting_data: dict) -> str:
    """
    Insert a new meeting document.
    Returns the string representation of the inserted _id.
    """
    collection = get_meetings_collection()
    result = await collection.insert_one({
        **meeting_data,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return str(result.inserted_id)


async def get_meeting(meeting_id: str) -> Optional[dict]:
    """
    Fetch a meeting by its string meeting_id field (not MongoDB _id).
    Returns the raw dict or None.
    """
    collection = get_meetings_collection()
    doc = await collection.find_one({"meeting_id": meeting_id})
    if doc:
        doc["_id"] = str(doc["_id"])  # Serialize ObjectId to string
    return doc


async def update_meeting(meeting_id: str, update_data: dict) -> bool:
    """
    Partial update a meeting document.
    Returns True if a document was modified.
    """
    collection = get_meetings_collection()
    result = await collection.update_one(
        {"meeting_id": meeting_id},
        {"$set": {**update_data, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


async def get_all_meetings(limit: int = 50) -> list[dict]:
    """
    Return the most recent `limit` meetings (for dashboard history view).
    """
    collection = get_meetings_collection()
    cursor = collection.find({}).sort("created_at", -1).limit(limit)
    docs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        docs.append(doc)
    return docs


async def delete_meeting(meeting_id: str) -> bool:
    """Delete a meeting document. Returns True if deleted."""
    collection = get_meetings_collection()
    result = await collection.delete_one({"meeting_id": meeting_id})
    return result.deleted_count > 0


async def close_connection():
    """Gracefully close the MongoDB connection on app shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
