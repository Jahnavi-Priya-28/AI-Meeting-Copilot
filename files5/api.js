/**
 * services/api.js  (v2 — enhanced)
 * ──────────────────────────────────
 * Centralised Axios client with:
 *   - Auto-retry on network errors / 5xx (up to 2 retries, exponential back-off)
 *   - Normalised error messages for every HTTP status code
 *   - /health check endpoint for the connection status banner
 *   - Per-endpoint timeout tuning (upload = 2 min, Whisper = 5 min)
 */

import axios from 'axios'

const BASE_URL = '/api/v1'

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000,   // 5 min default — Whisper can be slow
})

// ── Retry config ──────────────────────────────────────────────────────────────
const MAX_RETRIES = 2

const isRetryable = (error) => {
  if (!error.response) return true                    // Pure network error
  const s = error.response.status
  return s >= 500 && s < 600                          // Server-side errors only
}

// ── Request interceptor — attach retry counter ────────────────────────────────
api.interceptors.request.use((config) => {
  config._retryCount = config._retryCount ?? 0
  return config
})

// ── Response interceptor — retry + error normalisation ───────────────────────
api.interceptors.response.use(
  (res) => res.data,                                  // Unwrap .data automatically
  async (err) => {
    const config = err.config

    // Retry on network / 5xx
    if (config && isRetryable(err) && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1
      const backoff = config._retryCount * 1200       // 1.2 s, 2.4 s
      await new Promise((r) => setTimeout(r, backoff))
      return api(config)
    }

    // Human-readable error messages keyed by status code
    const statusMessages = {
      400: 'Bad request — check your input.',
      404: 'Not found. Make sure you ran the previous pipeline step first.',
      413: 'File too large — maximum upload size is 100 MB.',
      422: 'Validation error — the request format is incorrect.',
      500: 'Internal server error — check the backend logs.',
      503: 'Service unavailable — a required API key may not be configured.',
    }

    const status  = err.response?.status
    const detail  = err.response?.data?.detail        // FastAPI error shape
    const message = detail || statusMessages[status] || err.message || 'Unexpected error'
    return Promise.reject(new Error(message))
  }
)

// ── Health ────────────────────────────────────────────────────────────────────
/**
 * Ping the backend health endpoint.
 * Uses plain axios (not the intercepted instance) so errors don't get retried.
 */
export const checkHealth = () =>
  axios.get('/health', { timeout: 4000 }).then((r) => r.data)

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadAudio = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
}

// ── Pipeline steps ────────────────────────────────────────────────────────────
export const transcribeAudio    = (meetingId) =>
  api.post('/transcribe', { meeting_id: meetingId })

export const translateTranscript = (meetingId, targetLanguage = 'en') =>
  api.post('/translate', { meeting_id: meetingId, target_language: targetLanguage })

export const summarizeMeeting   = (meetingId) =>
  api.post('/summarize', { meeting_id: meetingId })

// ── RAG Q&A ───────────────────────────────────────────────────────────────────
export const askQuestion = (meetingId, question) =>
  api.post('/ask', { meeting_id: meetingId, question })

// ── Meeting CRUD ──────────────────────────────────────────────────────────────
export const getMeetings = (limit = 20) =>
  api.get(`/meetings?limit=${limit}`)

export const getMeeting  = (meetingId) =>
  api.get(`/meetings/${meetingId}`)

export default api

export const deleteMeeting = (meetingId) =>
  api.delete(`/meetings/${meetingId}`)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser  = (data)  => api.post('/auth/register', data)
export const loginUser     = (data)  => api.post('/auth/login',    data, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  transformRequest: [(d) => new URLSearchParams({ username: d.email, password: d.password }).toString()],
})
export const getMe = () => api.get('/auth/me')

// ── Insights / Diarization ────────────────────────────────────────────────────
export const diarizeMeeting   = (id) => api.post(`/insights/${id}/diarize`)
export const getAnalytics     = (id) => api.get(`/insights/${id}/analytics`)
export const getSpeakers      = (id) => api.get(`/insights/${id}/speakers`)
export const getTimeline      = (id) => api.get(`/insights/${id}/timeline`)
export const getFullInsights  = (id) => api.get(`/insights/${id}`)

// ── Export ────────────────────────────────────────────────────────────────────
export const getExportFormats = (id)        => api.get(`/export/${id}`)
export const exportMeeting    = (id, fmt)   => {
  // Returns a blob — use raw axios (not the intercepted instance)
  return import('axios').then(({ default: axios }) =>
    axios.get(`/api/v1/export/${id}/${fmt}`, { responseType: 'blob' })
  )
}

// ── WebSocket live transcription ──────────────────────────────────────────────
export const createLiveTranscriptWS = (meetingId) => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host  = window.location.hostname
  return new WebSocket(`${proto}://${host}:8000/ws/transcribe/${meetingId}`)
}
