/**
 * services/api.js
 * ───────────────
 * Centralised Axios-based API client.
 * All components import from here — never use fetch() directly.
 */

import axios from 'axios'

const BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 min — Whisper can be slow on large files
})

// ── Response interceptor: unwrap data, normalise errors ──────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ── Upload ───────────────────────────────────────────────────────────────────
export const uploadAudio = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
}

// ── Transcribe ───────────────────────────────────────────────────────────────
export const transcribeAudio = (meetingId) =>
  api.post('/transcribe', { meeting_id: meetingId })

// ── Translate ────────────────────────────────────────────────────────────────
export const translateTranscript = (meetingId, targetLanguage = 'en') =>
  api.post('/translate', { meeting_id: meetingId, target_language: targetLanguage })

// ── Summarize ────────────────────────────────────────────────────────────────
export const summarizeMeeting = (meetingId) =>
  api.post('/summarize', { meeting_id: meetingId })

// ── Ask (RAG Q&A) ────────────────────────────────────────────────────────────
export const askQuestion = (meetingId, question) =>
  api.post('/ask', { meeting_id: meetingId, question })

// ── Meetings list ────────────────────────────────────────────────────────────
export const getMeetings = (limit = 20) =>
  api.get(`/meetings?limit=${limit}`)

export const getMeeting = (meetingId) =>
  api.get(`/meetings/${meetingId}`)

export default api
