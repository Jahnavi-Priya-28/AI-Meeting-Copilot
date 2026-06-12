# AI Meeting Copilot

> Upload a meeting recording → get a transcript, translation, summary, action items,
> and a chat interface to ask questions about it — powered by Whisper, GPT-4, and FAISS.

---

## Quick start (local dev — 3 terminals)

```bash
# 1. Clone
git clone <your-repo> && cd ai-meeting-copilot

# 2. Configure API keys
cp backend/.env.example backend/.env
# → open backend/.env and fill in OPENAI_API_KEY + GOOGLE_TRANSLATE_API_KEY

# 3. Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongo mongo:7

# 4. Terminal A — Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 5. Terminal B — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — drop in an MP3 or WAV and the full pipeline runs.

---

## Quick start (Docker Compose — one command)

```bash
cp backend/.env.example backend/.env   # fill in API keys
docker compose up --build
```

| Service  | URL                         |
|----------|-----------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8000        |
| API docs | http://localhost:8000/docs   |
| MongoDB  | localhost:27017              |

---

## Prerequisites (local dev)

| Tool    | Version | Notes |
|---------|---------|-------|
| Python  | 3.10+   | 3.11 recommended |
| Node.js | 18+     | 20 LTS recommended |
| MongoDB | 6+      | or use Docker one-liner above |
| ffmpeg  | any     | **required** by Whisper |

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows (winget)
winget install ffmpeg
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | GPT summarization + text-embedding-3-small |
| `GOOGLE_TRANSLATE_API_KEY` | ⚠️ Recommended | Google Translate v2 REST API key |
| `MONGODB_URI` | No | Defaults to `mongodb://localhost:27017` |
| `WHISPER_MODEL_SIZE` | No | `tiny` / `base` / `small` / `medium` / `large` |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `MAX_FILE_SIZE_MB` | No | Defaults to `100` |
| `CORS_ORIGINS` | No | Defaults to `http://localhost:5173` |

**Getting API keys:**

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Translate**: https://console.cloud.google.com → enable "Cloud Translation API" → Credentials → Create API Key

---

## Project Structure

```
ai-meeting-copilot/
├── docker-compose.yml          # Full-stack one-command deploy
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example            ← copy to .env and fill in keys
│   ├── requirements.txt
│   ├── main.py                 # FastAPI app entry point
│   │
│   ├── config/
│   │   └── settings.py         # Pydantic-settings env config
│   │
│   ├── models/
│   │   └── schemas.py          # All Pydantic request/response schemas
│   │
│   ├── routers/
│   │   ├── upload.py           # POST   /api/v1/upload
│   │   ├── transcribe.py       # POST   /api/v1/transcribe
│   │   ├── translate.py        # POST   /api/v1/translate
│   │   ├── summarize.py        # POST   /api/v1/summarize
│   │   ├── ask.py              # POST   /api/v1/ask
│   │   ├── meetings.py         # GET/DELETE /api/v1/meetings
│   │   └── rag.py              # GET/POST/DELETE /api/v1/rag
│   │
│   ├── services/
│   │   ├── whisper_service.py  # Whisper STT (cached model, thread-pool)
│   │   ├── translate_service.py # Google Translate REST + langdetect fallback
│   │   ├── gpt_service.py      # GPT summarization + embeddings + RAG answers
│   │   ├── rag_service.py      # FAISS chunking, indexing, hybrid search
│   │   └── mongo_service.py    # Async MongoDB CRUD (Motor)
│   │
│   └── utils/
│       ├── file_utils.py       # File validation, UUID naming, path helpers
│       └── startup_check.py    # Env var validation on boot
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # Nginx proxy + SPA fallback
    ├── package.json
    ├── vite.config.js          # Dev server + /api proxy
    ├── tailwind.config.js
    │
    └── src/
        ├── App.jsx             # Root: routing + global state
        ├── main.jsx
        ├── index.css           # Tailwind + custom design tokens
        │
        ├── services/
        │   └── api.js          # Axios client (retry, error normalisation)
        │
        ├── hooks/
        │   ├── useMeeting.js   # Pipeline state machine
        │   └── useHealth.js    # Backend health polling
        │
        ├── pages/
        │   ├── Dashboard.jsx   # Upload + pipeline + results
        │   └── History.jsx     # Past meetings grid
        │
        └── components/
            ├── layout/
            │   └── Sidebar.jsx
            └── ui/
                ├── UploadZone.jsx
                ├── PipelineStepper.jsx
                ├── TranscriptPanel.jsx
                ├── SummaryPanel.jsx
                ├── ChatPanel.jsx
                ├── RagIndexBadge.jsx
                ├── ConnectionBanner.jsx
                ├── ErrorBoundary.jsx
                └── Spinner.jsx
```

---

## API Reference

Base URL: `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/docs`

### POST `/upload`
Upload an audio file (multipart/form-data, field name: `file`).
```json
{ "meeting_id": "uuid4", "filename": "standup.mp3", "size_bytes": 4194304 }
```

### POST `/transcribe`
Run Whisper STT. Also builds the FAISS index automatically.
```json
// body
{ "meeting_id": "uuid4" }
// response
{ "transcript": "...", "detected_language": "en", "duration_seconds": 180.4 }
```

### POST `/translate`
Translate transcript via Google Translate.
```json
// body
{ "meeting_id": "uuid4", "target_language": "en" }
// response
{ "translated_text": "...", "original_language": "hi", "target_language": "en" }
```

### POST `/summarize`
GPT-4 extraction of summary, key points, action items.
```json
// body
{ "meeting_id": "uuid4" }
// response
{
  "summary_output": {
    "summary": "The team discussed...",
    "key_points": ["Alice owns the redesign", "Budget shortfall of $50k"],
    "action_items": ["Bob to send budget proposal by Friday"]
  }
}
```

### POST `/ask`
RAG Q&A — FAISS retrieval + GPT grounded answer.
```json
// body
{ "meeting_id": "uuid4", "question": "Who is responsible for the API refactor?" }
// response
{ "answer": "David confirmed...", "source_chunks": ["..."] }
```

### GET `/meetings?limit=20`
List recent meetings.

### GET `/meetings/{id}`
Get a full meeting document.

### DELETE `/meetings/{id}`
Delete meeting document + audio file + FAISS index.

### GET `/rag/{id}`
FAISS index metadata (chunk count, build time, avg chunk size).

### POST `/rag/{id}/rebuild`
Force-rebuild the FAISS index from the stored transcript.

### DELETE `/rag/{id}`
Delete only the FAISS index files (keeps MongoDB doc + audio).

---

## Pipeline Flow

```
User drops MP3/WAV
       │
       ▼
POST /upload ──────────────── saves file to disk
       │                      creates MongoDB doc
       │                      returns meeting_id
       ▼
POST /transcribe ───────────── Whisper (local, CPU)
       │                       detects language
       │                       builds FAISS index (OpenAI embeddings)
       │                       stores transcript in MongoDB
       ▼
POST /translate ────────────── Google Translate API
       │                       stores translated_text in MongoDB
       ▼
POST /summarize ────────────── GPT-4o-mini (JSON mode)
       │                       extracts summary + key_points + action_items
       │                       stores in MongoDB
       ▼
POST /ask (any time) ───────── embeds question (OpenAI)
                               FAISS cosine search (top-5 candidates)
                               keyword re-rank (hybrid BM25 blend)
                               GPT-4o-mini grounded answer
```

---

## Performance Tuning

### Whisper model sizes

| Model  | Size   | Speed (CPU) | Accuracy |
|--------|--------|-------------|----------|
| tiny   | 75 MB  | ~10x RT     | Low      |
| base   | 145 MB | ~7x RT      | OK       |
| small  | 465 MB | ~4x RT      | Good     |
| medium | 1.5 GB | ~2x RT      | Great    |
| large  | 3 GB   | ~1x RT      | Best     |

Set `WHISPER_MODEL_SIZE=base` for development. Use `small` or `medium` for production.
For GPU inference, install `openai-whisper` with CUDA and set `fp16=True` in `whisper_service.py`.

### GPT model options

| Model         | Cost  | Quality |
|---------------|-------|---------|
| gpt-4o-mini   | Low   | Good    |
| gpt-4o        | Medium | Great |
| gpt-4-turbo   | High  | Great   |

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'whisper'`**
```bash
pip install openai-whisper
```

**`ffmpeg not found`**
```bash
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Whisper requires ffmpeg for audio decoding.
```

**`GOOGLE_TRANSLATE_API_KEY` 403 error**
1. Go to https://console.cloud.google.com
2. Enable the "Cloud Translation API"
3. Create an API key under Credentials
4. Restrict it to the Translation API only

**`FileNotFoundError: No FAISS index found`**
The index is built automatically during `/transcribe`. If it's missing:
```bash
# Rebuild via API
curl -X POST http://localhost:8000/api/v1/rag/<meeting_id>/rebuild
```

**MongoDB `ServerSelectionTimeoutError`**
```bash
# Check MongoDB is running
docker ps | grep mongo
# Or start it
docker run -d -p 27017:27017 --name mongo mongo:7
```

**CORS error in browser**
Add your frontend URL to `CORS_ORIGINS` in `.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

**Frontend shows "Backend offline" banner**
The backend isn't running or the Vite proxy isn't configured.
Check `vite.config.js` has `proxy: { '/api': 'http://localhost:8000' }`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Fonts | DM Serif Display, DM Sans, JetBrains Mono |
| Backend | FastAPI 0.111, Uvicorn, Python 3.11 |
| Speech-to-Text | OpenAI Whisper (local model) |
| Translation | Google Cloud Translate API v2 |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Vector search | FAISS IndexFlatIP (cosine similarity) |
| Database | MongoDB 7 (async via Motor) |
| Containerisation | Docker, Docker Compose, Nginx |

---

## Production deployment checklist

- [ ] Set `APP_ENV=production` in `.env`
- [ ] Use a strong, unique `SECRET_KEY` if you add auth
- [ ] Restrict `CORS_ORIGINS` to your actual domain
- [ ] Set `WHISPER_MODEL_SIZE=small` or higher
- [ ] Set `OPENAI_MODEL=gpt-4o` for better summaries
- [ ] Mount a persistent volume for `uploads/` in Docker
- [ ] Add a reverse proxy (Nginx / Caddy) with TLS in front of port 8000
- [ ] Set MongoDB auth (`MONGODB_URI=mongodb://user:pass@host:27017/db`)
- [ ] Add rate limiting to `/upload` and `/transcribe` (e.g. slowapi)
- [ ] Set up log aggregation (stdout → CloudWatch / Datadog)
- [ ] Add `uvicorn --workers 4` (or use Gunicorn with Uvicorn workers)
