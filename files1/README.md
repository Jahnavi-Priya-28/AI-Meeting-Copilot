# AI Meeting Copilot

> Real-time multilingual meeting transcription, translation, summarization, and RAG-powered Q&A.

---

## Architecture

```
Frontend (React + Vite)  →  FastAPI Backend  →  Whisper / GPT / Google Translate
                                             →  MongoDB (transcripts + summaries)
                                             →  FAISS (vector RAG index)
```

API base: `http://localhost:8000/api/v1`
Frontend: `http://localhost:5173`

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10+ | python.org |
| Node.js | 18+ | nodejs.org |
| MongoDB | 6+ | mongodb.com or use Docker |
| ffmpeg | any | Required by Whisper |

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows
winget install ffmpeg
```

### MongoDB via Docker (easiest)

```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

---

## Step 1 — Clone & configure

```bash
git clone <your-repo>
cd ai-meeting-copilot
```

Copy and fill in the environment file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your keys:

```env
OPENAI_API_KEY=sk-...
GOOGLE_TRANSLATE_API_KEY=...
MONGODB_URI=mongodb://localhost:27017
WHISPER_MODEL_SIZE=base        # tiny | base | small | medium | large
```

---

## Step 2 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# First run downloads the Whisper model (~140 MB for 'base')
# This happens automatically on first transcription request.
```

### Start the backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's running:
```
http://localhost:8000/health       → {"status": "ok"}
http://localhost:8000/docs         → Swagger UI (all endpoints)
```

---

## Step 3 — Frontend setup

```bash
cd frontend

npm install

npm run dev
```

Open: **http://localhost:5173**

---

## Step 4 — Use the app

1. **Upload** — Drag and drop an MP3 or WAV file onto the upload zone.
2. The pipeline runs automatically: Transcribe → Translate → Summarize.
3. View the **Transcript** panel (toggle between original and translated).
4. Read the **Summary**, **Key Points**, and **Action Items**.
5. Use the **Chat** panel to ask questions about the meeting (RAG).
6. Browse **History** in the sidebar to reload past meetings.

### Manual step mode

Toggle **Auto-run pipeline** off to run each step individually:
- Click **Transcribe** → **Translate** → **Summarize** in sequence.

---

## API Reference

All endpoints are under `/api/v1`. Interactive docs at `/docs`.

### POST `/upload`
Upload an audio file (multipart/form-data).
```json
Response: { "meeting_id": "uuid", "filename": "...", "size_bytes": 0 }
```

### POST `/transcribe`
Run Whisper STT + build FAISS index.
```json
Body:     { "meeting_id": "uuid" }
Response: { "transcript": "...", "detected_language": "en", "duration_seconds": 120 }
```

### POST `/translate`
Translate transcript via Google Translate.
```json
Body:     { "meeting_id": "uuid", "target_language": "en" }
Response: { "translated_text": "...", "original_language": "hi" }
```

### POST `/summarize`
Generate summary + key points + action items via GPT.
```json
Body:     { "meeting_id": "uuid" }
Response: { "summary_output": { "summary": "...", "key_points": [], "action_items": [] } }
```

### POST `/ask`
RAG Q&A: FAISS retrieval + GPT answer generation.
```json
Body:     { "meeting_id": "uuid", "question": "Who owns the action items?" }
Response: { "answer": "...", "source_chunks": ["..."] }
```

### GET `/meetings`
List all meetings (history).

### GET `/meetings/{meeting_id}`
Get a single meeting document.

---

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL_SIZE` | `base` | `tiny`=fastest, `large`=most accurate |
| `OPENAI_MODEL` | `gpt-4o-mini` | Swap to `gpt-4o` for better summaries |
| `MAX_FILE_SIZE_MB` | `100` | Max upload size |
| `CORS_ORIGINS` | `localhost:5173` | Comma-separated allowed origins |

---

## Project Structure

```
ai-meeting-copilot/
├── backend/
│   ├── main.py                  # FastAPI app + router registration
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/settings.py       # Env-var config (pydantic-settings)
│   ├── models/schemas.py        # Pydantic request/response schemas
│   ├── routers/
│   │   ├── upload.py            # POST /upload
│   │   ├── transcribe.py        # POST /transcribe
│   │   ├── translate.py         # POST /translate
│   │   ├── summarize.py         # POST /summarize
│   │   └── ask.py               # POST /ask
│   ├── services/
│   │   ├── whisper_service.py   # Whisper STT (thread-pool)
│   │   ├── translate_service.py # Google Translate REST
│   │   ├── gpt_service.py       # OpenAI GPT summarization + embeddings
│   │   ├── rag_service.py       # FAISS vector index + RAG pipeline
│   │   └── mongo_service.py     # Async MongoDB CRUD (Motor)
│   └── utils/file_utils.py      # File validation + path helpers
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx              # Root: routing + global state
        ├── main.jsx             # React entry point
        ├── index.css            # Tailwind + custom design tokens
        ├── services/api.js      # All Axios API calls
        ├── hooks/useMeeting.js  # Pipeline state machine
        ├── pages/
        │   ├── Dashboard.jsx    # Upload + pipeline controls
        │   └── History.jsx      # Past meetings grid
        └── components/
            ├── layout/Sidebar.jsx
            └── ui/
                ├── UploadZone.jsx
                ├── PipelineStepper.jsx
                ├── TranscriptPanel.jsx
                ├── SummaryPanel.jsx
                └── ChatPanel.jsx
```

---

## Troubleshooting

**Whisper is slow**
→ Use `WHISPER_MODEL_SIZE=tiny` for development. `base` is a good balance.
→ For production speed, run on a GPU instance.

**Google Translate 403 error**
→ Enable "Cloud Translation API" in your GCP project.
→ Ensure the API key has the Translation API scope.

**MongoDB connection refused**
→ Check MongoDB is running: `mongosh` or `docker ps`
→ Verify `MONGODB_URI` in `.env`

**FAISS index not found on /ask**
→ Run `/transcribe` first — it builds the index automatically.
→ Check the `uploads/faiss_indices/` directory exists.

**CORS errors in browser**
→ Add your frontend URL to `CORS_ORIGINS` in `.env`

---

## Production Deployment

For production, replace the Vite dev proxy with an Nginx config:

```nginx
location /api/ {
    proxy_pass http://backend:8000;
}
location / {
    root /app/dist;
    try_files $uri /index.html;
}
```

Build the frontend:
```bash
cd frontend && npm run build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Uvicorn |
| STT | OpenAI Whisper (local) |
| Translation | Google Cloud Translate API v2 |
| Summarization | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | FAISS (IndexFlatIP, cosine similarity) |
| Database | MongoDB (async via Motor) |
| Fonts | DM Serif Display, DM Sans, JetBrains Mono |
