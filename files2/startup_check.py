"""
utils/startup_check.py
───────────────────────
Validates that all required environment variables are set before the app
starts accepting requests.

Called from main.py lifespan startup hook.
Prints a clear error table and raises SystemExit if critical vars are missing.
"""

from config.settings import settings


# Keys that must be non-empty for the app to work at all
REQUIRED_VARS = [
    ("openai_api_key",          "OPENAI_API_KEY",          "GPT summarization + embeddings"),
    ("google_translate_api_key","GOOGLE_TRANSLATE_API_KEY", "Translation (can skip if source is English)"),
]

# Keys that are optional but worth warning about
OPTIONAL_VARS = [
    ("mongodb_uri",   "MONGODB_URI",   "MongoDB (defaults to localhost:27017)"),
    ("upload_dir",    "UPLOAD_DIR",    "Upload directory (defaults to ./uploads)"),
]


def check_env() -> None:
    """
    Print a startup config summary.
    Raises SystemExit if any REQUIRED var is missing.
    """
    print("\n" + "─" * 55)
    print("  AI Meeting Copilot — startup check")
    print("─" * 55)

    missing = []

    for attr, env_name, description in REQUIRED_VARS:
        value = getattr(settings, attr, "")
        ok = bool(value and value.strip())
        icon = "✅" if ok else "❌"
        masked = (value[:6] + "…") if ok else "NOT SET"
        print(f"  {icon}  {env_name:<35} {masked}")
        if not ok:
            missing.append((env_name, description))

    for attr, env_name, description in OPTIONAL_VARS:
        value = getattr(settings, attr, "")
        ok = bool(value)
        icon = "✅" if ok else "⚠️ "
        print(f"  {icon}  {env_name:<35} {value or 'using default'}")

    print(f"\n  Whisper model : {settings.whisper_model_size}")
    print(f"  OpenAI model  : {settings.openai_model}")
    print(f"  MongoDB URI   : {settings.mongodb_uri}")
    print("─" * 55 + "\n")

    if missing:
        print("  ⛔ Missing required environment variables:")
        for name, desc in missing:
            print(f"     • {name}  ({desc})")
        print("\n  Add them to backend/.env — see .env.example for reference.\n")
        raise SystemExit(1)
