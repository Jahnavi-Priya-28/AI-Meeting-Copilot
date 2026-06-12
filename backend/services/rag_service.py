"""
services/rag_service.py
────────────────────────
FAISS-based Retrieval-Augmented Generation (RAG) service.

Flow:
  1. build_index(meeting_id, transcript)
       → chunks transcript → embeds with OpenAI → stores FAISS index on disk
  2. search(meeting_id, query, top_k)
       → embeds query → cosine search in FAISS → returns top-k chunks
  3. answer_with_rag(meeting_id, question)
       → search → pass chunks to gpt_service.answer_question → return answer
"""

import os
import json
import asyncio
import numpy as np
from pathlib import Path
from typing import Optional
import faiss

from config.settings import settings
from services.gpt_service import get_embeddings, answer_question


# ── Constants ─────────────────────────────────────────────────────────────────

# Directory where per-meeting FAISS indices + chunk text files are stored
INDEX_DIR = Path(settings.upload_dir) / "faiss_indices"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = 400       # Characters per chunk
CHUNK_OVERLAP = 80     # Overlap between adjacent chunks
EMBEDDING_DIM = 1536   # text-embedding-3-small output dimension


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_transcript(transcript: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split a long transcript into overlapping text chunks.
    Overlap ensures context isn't lost at chunk boundaries.
    """
    chunks = []
    start = 0
    while start < len(transcript):
        end = min(start + chunk_size, len(transcript))
        chunks.append(transcript[start:end].strip())
        start += chunk_size - overlap  # Slide window with overlap
    return [c for c in chunks if len(c) > 20]  # Drop trivially short chunks


# ── Index Persistence ─────────────────────────────────────────────────────────

def _index_path(meeting_id: str) -> Path:
    return INDEX_DIR / f"{meeting_id}.faiss"


def _chunks_path(meeting_id: str) -> Path:
    return INDEX_DIR / f"{meeting_id}_chunks.json"


def _save_index(meeting_id: str, index: faiss.IndexFlatIP, chunks: list[str]):
    faiss.write_index(index, str(_index_path(meeting_id)))
    with open(_chunks_path(meeting_id), "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)


def _load_index(meeting_id: str) -> Optional[tuple[faiss.IndexFlatIP, list[str]]]:
    idx_path = _index_path(meeting_id)
    chk_path = _chunks_path(meeting_id)
    if not idx_path.exists() or not chk_path.exists():
        return None
    index = faiss.read_index(str(idx_path))
    with open(chk_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    return index, chunks


# ── Public API ────────────────────────────────────────────────────────────────

async def build_index(meeting_id: str, transcript: str) -> int:
    """
    Build and persist a FAISS index for a meeting transcript.

    Args:
        meeting_id: Unique meeting identifier (used as the index filename).
        transcript: Full meeting transcript string.

    Returns:
        Number of chunks indexed.
    """
    chunks = chunk_transcript(transcript)
    if not chunks:
        raise ValueError("Transcript is empty or too short to index.")

    # Embed all chunks (batched by OpenAI API)
    embeddings = await get_embeddings(chunks)

    # Normalize vectors for cosine similarity (IndexFlatIP = inner product)
    vectors = np.array(embeddings, dtype=np.float32)
    faiss.normalize_L2(vectors)

    # Build FAISS flat index (exact search, suitable for meeting-scale data)
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(vectors)

    _save_index(meeting_id, index, chunks)
    return len(chunks)


async def search_index(meeting_id: str, query: str, top_k: int = 4) -> list[str]:
    """
    Retrieve the top-k most relevant transcript chunks for a query.

    Args:
        meeting_id: Which meeting's index to search.
        query:      The user's natural language question.
        top_k:      Number of chunks to retrieve.

    Returns:
        List of transcript chunk strings, ranked by relevance.
    Raises:
        FileNotFoundError if no index exists for this meeting.
    """
    loaded = _load_index(meeting_id)
    if loaded is None:
        raise FileNotFoundError(
            f"No FAISS index found for meeting '{meeting_id}'. "
            "Call /transcribe first to build the index."
        )

    index, chunks = loaded

    # Embed the query
    query_embeddings = await get_embeddings([query])
    query_vector = np.array(query_embeddings, dtype=np.float32)
    faiss.normalize_L2(query_vector)

    # Search
    k = min(top_k, len(chunks))  # Can't retrieve more than we have
    scores, indices = index.search(query_vector, k)

    # Return chunks in relevance order, skipping any -1 (empty) results
    return [chunks[i] for i in indices[0] if i != -1]


async def answer_with_rag(meeting_id: str, question: str) -> dict:
    """
    Full RAG pipeline: retrieve relevant chunks → generate grounded answer.

    Returns:
        {
            "answer": str,
            "source_chunks": list[str]
        }
    """
    context_chunks = await search_index(meeting_id, question, top_k=4)
    answer = await answer_question(question, context_chunks)
    return {
        "answer": answer,
        "source_chunks": context_chunks,
    }
