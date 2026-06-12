"""
services/translate_service.py
──────────────────────────────
Wraps Google Cloud Translation API v2 (REST via API key) for text translation
and language detection. Falls back to langdetect for language detection if
the Google API key is not configured.
"""

import asyncio
from typing import Optional

import httpx
from langdetect import detect as langdetect_detect

from config.settings import settings


async def detect_language(text: str) -> str:
    """
    Detect the language of `text`.
    Uses Google Translate API if key is set, otherwise falls back to langdetect.
    Returns an ISO 639-1 language code (e.g. 'en', 'hi', 'fr').
    """
    if settings.google_translate_api_key:
        return await _google_detect(text)

    # Fallback: run synchronous langdetect in thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, langdetect_detect, text[:500])


async def translate_text(text: str, target_language: str = "en", source_language: Optional[str] = None) -> dict:
    """
    Translate `text` to `target_language`.

    Args:
        text:            The text to translate.
        target_language: ISO 639-1 target code (default "en").
        source_language: ISO 639-1 source code; auto-detected if None.

    Returns:
        {
            "translated_text": str,
            "source_language": str,
            "target_language": str,
        }
    """
    if not settings.google_translate_api_key:
        raise ValueError(
            "GOOGLE_TRANSLATE_API_KEY is not set. "
            "Please add it to your .env file."
        )

    # Detect source language if not provided
    if not source_language:
        source_language = await detect_language(text)

    # No-op: source and target are the same
    if source_language == target_language:
        return {
            "translated_text": text,
            "source_language": source_language,
            "target_language": target_language,
        }

    translated = await _google_translate(text, target_language, source_language)
    return {
        "translated_text": translated,
        "source_language": source_language,
        "target_language": target_language,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _google_detect(text: str) -> str:
    """Call Google Translate detect API and return the language code."""
    url = "https://translation.googleapis.com/language/translate/v2/detect"
    params = {"key": settings.google_translate_api_key}
    payload = {"q": text[:1000]}  # Limit chars sent for detection

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, params=params, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["data"]["detections"][0][0]["language"]


async def _google_translate(text: str, target: str, source: str) -> str:
    """Call Google Translate v2 REST API and return the translated string."""
    url = "https://translation.googleapis.com/language/translate/v2"
    params = {"key": settings.google_translate_api_key}
    payload = {
        "q": text,
        "target": target,
        "source": source,
        "format": "text",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, params=params, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["data"]["translations"][0]["translatedText"]
