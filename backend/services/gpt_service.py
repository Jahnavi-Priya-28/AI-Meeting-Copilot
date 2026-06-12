"""
services/gpt_service.py
────────────────────────
OpenAI GPT wrapper for:
  1. Summarization → returns summary, key_points, action_items
  2. RAG answer generation → takes retrieved context chunks + user question
"""

import json
import re
from typing import Optional
from openai import AsyncOpenAI

from config.settings import settings
from models.schemas import SummaryOutput


# Async OpenAI client (reused across requests)
_openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


# ── Summarization ─────────────────────────────────────────────────────────────

SUMMARIZE_SYSTEM_PROMPT = """You are an expert meeting analyst.
Given a meeting transcript, extract and return ONLY valid JSON with exactly these keys:
{
  "summary": "<2-4 sentence paragraph>",
  "key_points": ["<point 1>", "<point 2>", ...],
  "action_items": ["<action 1>", "<action 2>", ...]
}
Be concise. Key points: 4-8 bullets. Action items: only explicit tasks/commitments.
Return ONLY the JSON object — no markdown fences, no extra text."""


async def summarize_transcript(transcript: str) -> SummaryOutput:
    """
    Use GPT to extract a structured summary from a meeting transcript.
    Raises ValueError if the model returns malformed JSON.
    """
    client = get_openai_client()

    # Truncate to ~12,000 tokens worth of characters to stay within context limits
    truncated = transcript[:48000]

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Meeting transcript:\n\n{truncated}"},
        ],
        temperature=0.3,   # Low temperature for factual extraction
        max_tokens=1500,
        response_format={"type": "json_object"},  # Enforce JSON mode (GPT-4o family)
    )

    raw = response.choices[0].message.content or "{}"

    try:
        parsed = json.loads(raw)
        return SummaryOutput(
            summary=parsed.get("summary", ""),
            key_points=parsed.get("key_points", []),
            action_items=parsed.get("action_items", []),
        )
    except json.JSONDecodeError as exc:
        raise ValueError(f"GPT returned invalid JSON: {exc}\nRaw: {raw[:500]}")


# ── RAG Answer Generation ─────────────────────────────────────────────────────

RAG_SYSTEM_PROMPT = """You are a helpful meeting assistant.
Answer the user's question using ONLY the provided meeting transcript excerpts.
If the answer is not in the excerpts, say: "I couldn't find that information in this meeting."
Be concise and direct. Do not make up information."""


async def answer_question(question: str, context_chunks: list[str]) -> str:
    """
    Generate an answer to `question` grounded in `context_chunks` (from FAISS).

    Args:
        question:       The user's natural language question.
        context_chunks: List of relevant transcript passages retrieved by FAISS.

    Returns:
        A string answer grounded in the provided context.
    """
    client = get_openai_client()

    # Format retrieved chunks as a numbered list for the prompt
    context_text = "\n\n".join(
        f"[Excerpt {i+1}]\n{chunk}" for i, chunk in enumerate(context_chunks)
    )

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": RAG_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Meeting excerpts:\n{context_text}\n\n"
                    f"Question: {question}"
                ),
            },
        ],
        temperature=0.2,
        max_tokens=600,
    )

    return (response.choices[0].message.content or "").strip()


# ── Embeddings (used by rag_service.py) ──────────────────────────────────────

async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate OpenAI text embeddings for a list of strings.
    Returns a list of float vectors (one per input text).
    """
    client = get_openai_client()

    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )

    return [item.embedding for item in response.data]
