"""
config/settings.py
──────────────────
Centralised configuration loaded from environment variables / .env file.
All other modules import `settings` from here — never from os.environ directly.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── OpenAI ─────────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # ── Google Translate ────────────────────────────────────────────────────────
    google_translate_api_key: str = ""
    google_project_id: str = ""
    google_application_credentials: str = ""

    # ── MongoDB ─────────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "meeting_copilot"

    # ── Whisper ─────────────────────────────────────────────────────────────────
    whisper_model_size: str = "base"

    # ── File Uploads ────────────────────────────────────────────────────────────
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 100

    # ── App ─────────────────────────────────────────────────────────────────────
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a Python list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache()  # Instantiated once; reused across the app lifecycle
def get_settings() -> Settings:
    return Settings()


# Module-level singleton for convenient imports:  `from config.settings import settings`
settings = get_settings()
