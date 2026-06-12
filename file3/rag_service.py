"""
services/rag_service.py  (v2 — production hardened)
─────────────────────────────────────────────────────
FAISS-based Retrieval-Augmented Generation pipeline.

Improvements over v1:
  1. Sentence-aware chunking  — splits on '. ', '! ', '? ' so sentences
     are never cut in half. Falls back to character chunking for very long
     sentences (e.g. raw ASR output without punctuation).
  2. Persistent index cache   — checks disk before re-embedding; skips
     OpenAI API call if the index is already built for this meeting.
  3. Metadata sidecar         — stores chunk positions and word counts
     alongside the FAISS index so we can surface richer source info.
  4. Hybrid re-ranking        — combines cosine similarity from FAISS with
     a lightweight BM25-style keyword overlap score. Pure semantic search
     can miss exact names/dates; the keyword boost fixes this.
  5. Min-score filtering      — chunks below a similarity threshold are
     dropped so low-quality matches don't pollute the GPT context.
  6. Index health check       — `get_index_info()` lets the /rag router
     expose index metadata without loading the full FAISS object.

Flow:
  build_index(meeting_id, transcript)
    → chunk → embed (OpenAI) → normalize → FAISS IndexFlatIP → persist

  search_index(meeting_id, query, top_k)
    → embed query → FAISS search → keyword re-rank → filter by score → return

  answer_with_rag(meeting_id, question)
    → search_index → gpt_service.answer_question → return answer + sources
"""

import re
import json
import asyncio
import math
import numpy as np
from pathlib import Path
from typing import Optional
from datetime import datetime
import faiss

from config.settings import settings
from services.gpt_service import get_embeddings, answer_question


# ── Constants ─────────────────────────────────────────────────────────────────

INDEX_DIR   = Path(settings.upload_dir) / "faiss_indices"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

EMBEDDING_DIM   = 1536      # text-embedding-3-small
CHUNK_SIZE      = 450       # target characters per chunk
CHUNK_OVERLAP   = 100       # overlap between adjacent chunks
MIN_CHUNK_CHARS = 30        # discard trivially short chunks
MIN_SCORE       = 0.20      # cosine similarity threshold (0-1)
KEYWORD_WEIGHT  = 0.25      # blend weight for keyword overlap score


# ── Path helpers ──────────────────────────────────────────────────────────────

def _index_path(mid: str)    -> Path: return INDEX_DIR / f"{mid}.faiss"
def _chunks_path(mid: str)   -> Path: return INDEX_DIR / f"{mid}_chunks.json"
def _meta_path(mid: str)     -> Path: return INDEX_DIR / f"{mid}_meta.json"


# ── Sentence-aware chunking ───────────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """
    Split text on sentence boundaries ('. ', '! ', '? ').
    Returns a flat list of sentence strings.
    """
    # Preserve newlines as boundaries too
    text = re.sub(r'\n+', ' \n ', text)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def chunk_transcript(
    transcript: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int    = CHUNK_OVERLAP,
) -> list[str]:
    """
    Sentence-aware chunker.

    Strategy:
      1. Split transcript into sentences.
      2. Greedily accumulate sentences into a chunk until chunk_size is reached.
      3. Slide forward by (chunk_size - overlap) characters worth of sentences
         to create the next chunk.
      4. If a single sentence exceeds chunk_size (common in ASR output with no
         punctuation), hard-split it at word boundaries.

    Returns a deduplicated list of non-empty chunk strings.
    """
    sentences = _split_sentences(transcript)
    chunks    = []
    current   = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)

        # Single sentence longer than chunk_size → hard-split at word boundary
        if sent_len > chunk_size:
            # Flush current buffer first
            if current:
                chunks.append(' '.join(current))
                current, current_len = [], 0
            # Hard-split the long sentence
            words = sent.split()
            buf, buf_len = [], 0
            for word in words:
                if buf_len + len(word) + 1 > chunk_size and buf:
                    chunks.append(' '.join(buf))
                    # Keep overlap words
                    overlap_words = buf[max(0, len(buf) - 5):]
                    buf     = overlap_words + [word]
                    buf_len = sum(len(w) + 1 for w in buf)
                else:
                    buf.append(word)
                    buf_len += len(word) + 1
            if buf:
                chunks.append(' '.join(buf))
            continue

        # Normal sentence: add to current chunk
        if current_len + sent_len + 1 > chunk_size and current:
            chunks.append(' '.join(current))
            # Roll back to keep overlap
            overlap_acc = 0
            rollback    = []
            for s in reversed(current):
                if overlap_acc + len(s) > overlap:
                    break
                rollback.insert(0, s)
                overlap_acc += len(s) + 1
            current     = rollback
            current_len = overlap_acc

        current.append(sent)
        current_len += sent_len + 1

    if current:
        chunks.append(' '.join(current))

    # Deduplicate while preserving order, filter short chunks
    seen   = set()
    result = []
    for c in chunks:
        c = c.strip()
        if len(c) >= MIN_CHUNK_CHARS and c not in seen:
            seen.add(c)
            result.append(c)

    return result


# ── Keyword overlap scorer (BM25-inspired, no external lib) ──────────────────

def _keyword_score(query: str, chunk: str) -> float:
    """
    Lightweight keyword overlap score between query and chunk.
    Returns a value in [0, 1].

    Uses term frequency capped at 1 (binary presence) for simplicity.
    Filters stopwords to avoid common words dominating.
    """
    STOPWORDS = {
        'the','a','an','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','could',
        'should','may','might','shall','to','of','in','on','at','by',
        'for','with','about','as','into','through','and','or','but',
        'not','this','that','these','those','it','its',
    }

    def tokenize(text: str) -> set[str]:
        tokens = re.findall(r'\b[a-z]{2,}\b', text.lower())
        return {t for t in tokens if t not in STOPWORDS}

    q_tokens = tokenize(query)
    c_tokens = tokenize(chunk)

    if not q_tokens:
        return 0.0

    overlap = len(q_tokens & c_tokens)
    # Jaccard-like: overlap / union, weighted toward query coverage
    query_coverage = overlap / len(q_tokens)
    return min(query_coverage, 1.0)


# ── Index persistence ─────────────────────────────────────────────────────────

def _save_index(mid: str, index: faiss.IndexFlatIP, chunks: list[str]) -> None:
    faiss.write_index(index, str(_index_path(mid)))

    with open(_chunks_path(mid), 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    # Metadata sidecar
    meta = {
        "meeting_id":    mid,
        "chunk_count":   len(chunks),
        "built_at":      datetime.utcnow().isoformat(),
        "embedding_dim": EMBEDDING_DIM,
        "chunk_sizes":   [len(c) for c in chunks],
    }
    with open(_meta_path(mid), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)


def _load_index(mid: str) -> Optional[tuple[faiss.IndexFlatIP, list[str]]]:
    idx_p = _index_path(mid)
    chk_p = _chunks_path(mid)
    if not idx_p.exists() or not chk_p.exists():
        return None
    index = faiss.read_index(str(idx_p))
    with open(chk_p, 'r', encoding='utf-8') as f:
        chunks = json.load(f)
    return index, chunks


def _index_exists(mid: str) -> bool:
    return _index_path(mid).exists() and _chunks_path(mid).exists()


# ── Public API ────────────────────────────────────────────────────────────────

async def build_index(
    meeting_id: str,
    transcript: str,
    force_rebuild: bool = False,
) -> int:
    """
    Build and persist a FAISS index for a meeting transcript.

    Skips embedding if the index already exists (unless force_rebuild=True).

    Args:
        meeting_id:    Unique meeting identifier.
        transcript:    Full meeting transcript string.
        force_rebuild: If True, rebuilds even if index already exists.

    Returns:
        Number of chunks indexed.
    """
    # Skip if already built
    if not force_rebuild and _index_exists(meeting_id):
        _, existing_chunks = _load_index(meeting_id)
        print(f"[RAG] Index already exists for {meeting_id} "
              f"({len(existing_chunks)} chunks) — skipping rebuild.")
        return len(existing_chunks)

    chunks = chunk_transcript(transcript)
    if not chunks:
        raise ValueError("Transcript is empty or too short to index.")

    print(f"[RAG] Building index for {meeting_id}: {len(chunks)} chunks …")

    # Embed in batches of 100 to stay within OpenAI rate limits
    BATCH = 100
    all_embeddings: list[list[float]] = []
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i : i + BATCH]
        embeddings = await get_embeddings(batch)
        all_embeddings.extend(embeddings)
        if len(chunks) > BATCH:
            # Small delay between batches to respect rate limits
            await asyncio.sleep(0.3)

    # Build FAISS inner-product index (cosine after L2 normalization)
    vectors = np.array(all_embeddings, dtype=np.float32)
    faiss.normalize_L2(vectors)

    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(vectors)

    _save_index(meeting_id, index, chunks)
    print(f"[RAG] Index saved for {meeting_id}.")
    return len(chunks)


async def search_index(
    meeting_id: str,
    query: str,
    top_k: int = 5,
) -> list[str]:
    """
    Retrieve top-k relevant transcript chunks for a query using
    hybrid FAISS cosine + keyword overlap re-ranking.

    Args:
        meeting_id: Which meeting's index to search.
        query:      The user's natural language question.
        top_k:      Max number of chunks to return.

    Returns:
        List of ranked transcript chunk strings.
    Raises:
        FileNotFoundError if no index exists for this meeting.
    """
    loaded = _load_index(meeting_id)
    if loaded is None:
        raise FileNotFoundError(
            f"No FAISS index found for meeting '{meeting_id}'. "
            "Run /transcribe first to build the index."
        )

    index, chunks = loaded

    # Embed the query
    q_embeddings = await get_embeddings([query])
    q_vector     = np.array(q_embeddings, dtype=np.float32)
    faiss.normalize_L2(q_vector)

    # Retrieve more candidates than needed for re-ranking
    candidate_k = min(top_k * 3, len(chunks))
    scores, indices = index.search(q_vector, candidate_k)

    # Build candidate list: (chunk, cosine_score)
    candidates = [
        (chunks[i], float(scores[0][rank]))
        for rank, i in enumerate(indices[0])
        if i != -1 and float(scores[0][rank]) >= MIN_SCORE
    ]

    if not candidates:
        # Relax threshold if nothing passes
        candidates = [
            (chunks[i], float(scores[0][rank]))
            for rank, i in enumerate(indices[0])
            if i != -1
        ][:top_k]

    # Hybrid re-ranking: blend cosine + keyword overlap
    reranked = []
    for chunk, cosine_score in candidates:
        kw_score    = _keyword_score(query, chunk)
        final_score = (1 - KEYWORD_WEIGHT) * cosine_score + KEYWORD_WEIGHT * kw_score
        reranked.append((chunk, final_score))

    # Sort by final score descending, return top_k
    reranked.sort(key=lambda x: x[1], reverse=True)
    return [chunk for chunk, _ in reranked[:top_k]]


async def answer_with_rag(meeting_id: str, question: str) -> dict:
    """
    Full RAG pipeline: retrieve → generate grounded answer.

    Returns:
        { "answer": str, "source_chunks": list[str] }
    """
    context_chunks = await search_index(meeting_id, question, top_k=4)
    answer         = await answer_question(question, context_chunks)
    return {
        "answer":        answer,
        "source_chunks": context_chunks,
    }


async def get_index_info(meeting_id: str) -> Optional[dict]:
    """
    Return metadata about the FAISS index for a meeting (no I/O to FAISS).
    Returns None if no index exists.
    """
    meta_p = _meta_path(meeting_id)
    if not meta_p.exists():
        return None
    with open(meta_p, 'r', encoding='utf-8') as f:
        return json.load(f)


async def delete_index(meeting_id: str) -> bool:
    """Delete all FAISS index files for a meeting. Returns True if deleted."""
    deleted = False
    for path in [_index_path(meeting_id), _chunks_path(meeting_id), _meta_path(meeting_id)]:
        if path.exists():
            path.unlink()
            deleted = True
    return deleted
