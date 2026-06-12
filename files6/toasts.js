/**
 * utils/toasts.js
 * ────────────────
 * Wrapper around react-hot-toast with consistent messaging for every
 * pipeline action. Import and call these instead of using toast() directly
 * so all messages stay consistent across components.
 */

import toast from 'react-hot-toast'

// ── Pipeline toasts ────────────────────────────────────────────────────────────

export const toastUploadStart   = (filename) => toast.loading(`Uploading ${filename}…`, { id: 'upload' })
export const toastUploadDone    = (filename) => toast.success(`${filename} uploaded`, { id: 'upload' })
export const toastUploadError   = (msg)      => toast.error(`Upload failed: ${msg}`, { id: 'upload' })

export const toastTranscribeStart = () => toast.loading('Transcribing audio with Whisper…', { id: 'transcribe', duration: Infinity })
export const toastTranscribeDone  = (lang) => toast.success(`Transcript ready — detected language: ${lang.toUpperCase()}`, { id: 'transcribe' })
export const toastTranscribeError = (msg)  => toast.error(`Transcription failed: ${msg}`, { id: 'transcribe' })

export const toastTranslateStart = (lang) => toast.loading(`Translating to ${lang.toUpperCase()}…`, { id: 'translate', duration: Infinity })
export const toastTranslateDone  = ()     => toast.success('Translation complete', { id: 'translate' })
export const toastTranslateError = (msg)  => toast.error(`Translation failed: ${msg}`, { id: 'translate' })

export const toastSummarizeStart = () => toast.loading('Generating summary with GPT…', { id: 'summarize', duration: Infinity })
export const toastSummarizeDone  = () => toast.success('Summary, key points and action items ready', { id: 'summarize' })
export const toastSummarizeError = (msg) => toast.error(`Summarization failed: ${msg}`, { id: 'summarize' })

// ── Feature toasts ─────────────────────────────────────────────────────────────

export const toastDiarizeStart = ()       => toast.loading('Identifying speakers…', { id: 'diarize', duration: Infinity })
export const toastDiarizeDone  = (count)  => toast.success(`Diarization complete — ${count} speakers found`, { id: 'diarize' })
export const toastDiarizeError = (msg)    => toast.error(`Diarization failed: ${msg}`, { id: 'diarize' })

export const toastAnalyticsStart = ()    => toast.loading('Computing analytics…', { id: 'analytics', duration: Infinity })
export const toastAnalyticsDone  = ()    => toast.success('Analytics ready', { id: 'analytics' })
export const toastAnalyticsError = (msg) => toast.error(`Analytics failed: ${msg}`, { id: 'analytics' })

export const toastExportStart = (fmt) => toast.loading(`Preparing ${fmt.toUpperCase()} export…`, { id: 'export', duration: Infinity })
export const toastExportDone  = (fmt) => toast.success(`${fmt.toUpperCase()} downloaded`, { id: 'export' })
export const toastExportError = (msg) => toast.error(`Export failed: ${msg}`, { id: 'export' })

export const toastRagBuild  = (n)   => toast.success(`FAISS index built — ${n} chunks`, { id: 'rag' })
export const toastRagRebuild = ()   => toast.loading('Rebuilding FAISS index…', { id: 'rag', duration: Infinity })
export const toastRagError   = (msg) => toast.error(`RAG error: ${msg}`, { id: 'rag' })

// ── Auth toasts ────────────────────────────────────────────────────────────────

export const toastLoginDone    = (name) => toast.success(`Welcome back, ${name}!`)
export const toastRegisterDone = (name) => toast.success(`Account created — welcome, ${name}!`)
export const toastLogout       = ()     => toast.success('Logged out')

// ── Generic ────────────────────────────────────────────────────────────────────

export const toastCopied  = ()    => toast.success('Copied to clipboard', { duration: 1500 })
export const toastSaved   = ()    => toast.success('Settings saved')
export const toastDeleted = (label) => toast.success(`${label} deleted`)
export const toastError   = (msg) => toast.error(msg)
export const toastInfo    = (msg) => toast(msg, { icon: 'ℹ️' })
