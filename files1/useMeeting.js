/**
 * hooks/useMeeting.js
 * ────────────────────
 * Central state machine for the meeting processing pipeline.
 * Tracks each step's status and holds all API results.
 *
 * Steps: upload → transcribe → translate → summarize
 * The "ask" flow is separate (chat-style, not part of this pipeline).
 */

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  uploadAudio,
  transcribeAudio,
  translateTranscript,
  summarizeMeeting,
} from '../services/api'

// Step status values
export const STATUS = {
  IDLE:    'idle',
  LOADING: 'loading',
  DONE:    'done',
  ERROR:   'error',
}

const INITIAL_STATE = {
  meetingId:      null,
  filename:       null,

  // Per-step status
  uploadStatus:     STATUS.IDLE,
  transcribeStatus: STATUS.IDLE,
  translateStatus:  STATUS.IDLE,
  summarizeStatus:  STATUS.IDLE,

  // Upload progress (0-100)
  uploadProgress: 0,

  // Step results
  transcript:      null,
  detectedLanguage: null,
  durationSeconds: null,
  translatedText:  null,
  targetLanguage:  'en',
  summary:         null,
  keyPoints:       [],
  actionItems:     [],
}

export function useMeeting() {
  const [state, setState] = useState(INITIAL_STATE)

  const update = useCallback((patch) =>
    setState((prev) => ({ ...prev, ...patch })), [])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => setState(INITIAL_STATE), [])

  // ── Load existing meeting from history ────────────────────────────────────
  const loadMeeting = useCallback((doc) => {
    setState({
      ...INITIAL_STATE,
      meetingId:        doc.meeting_id,
      filename:         doc.filename,
      uploadStatus:     STATUS.DONE,
      transcribeStatus: doc.transcript     ? STATUS.DONE : STATUS.IDLE,
      translateStatus:  doc.translated_text ? STATUS.DONE : STATUS.IDLE,
      summarizeStatus:  doc.summary         ? STATUS.DONE : STATUS.IDLE,
      transcript:       doc.transcript       || null,
      detectedLanguage: doc.detected_language || null,
      durationSeconds:  doc.duration_seconds || null,
      translatedText:   doc.translated_text  || null,
      targetLanguage:   doc.target_language  || 'en',
      summary:          doc.summary          || null,
      keyPoints:        doc.key_points        || [],
      actionItems:      doc.action_items      || [],
    })
  }, [])

  // ── Step 1: Upload ────────────────────────────────────────────────────────
  const runUpload = useCallback(async (file) => {
    update({ uploadStatus: STATUS.LOADING, uploadProgress: 0 })
    try {
      const res = await uploadAudio(file, (pct) =>
        update({ uploadProgress: pct })
      )
      update({
        meetingId:    res.meeting_id,
        filename:     res.filename,
        uploadStatus: STATUS.DONE,
        uploadProgress: 100,
      })
      toast.success('File uploaded successfully')
      return res.meeting_id
    } catch (err) {
      update({ uploadStatus: STATUS.ERROR })
      toast.error(`Upload failed: ${err.message}`)
      throw err
    }
  }, [update])

  // ── Step 2: Transcribe ────────────────────────────────────────────────────
  const runTranscribe = useCallback(async (meetingId) => {
    update({ transcribeStatus: STATUS.LOADING })
    try {
      const res = await transcribeAudio(meetingId)
      update({
        transcribeStatus: STATUS.DONE,
        transcript:       res.transcript,
        detectedLanguage: res.detected_language,
        durationSeconds:  res.duration_seconds,
      })
      toast.success(`Transcribed — detected language: ${res.detected_language}`)
      return res
    } catch (err) {
      update({ transcribeStatus: STATUS.ERROR })
      toast.error(`Transcription failed: ${err.message}`)
      throw err
    }
  }, [update])

  // ── Step 3: Translate ─────────────────────────────────────────────────────
  const runTranslate = useCallback(async (meetingId, targetLanguage = 'en') => {
    update({ translateStatus: STATUS.LOADING, targetLanguage })
    try {
      const res = await translateTranscript(meetingId, targetLanguage)
      update({
        translateStatus: STATUS.DONE,
        translatedText:  res.translated_text,
      })
      toast.success('Translation complete')
      return res
    } catch (err) {
      update({ translateStatus: STATUS.ERROR })
      toast.error(`Translation failed: ${err.message}`)
      throw err
    }
  }, [update])

  // ── Step 4: Summarize ─────────────────────────────────────────────────────
  const runSummarize = useCallback(async (meetingId) => {
    update({ summarizeStatus: STATUS.LOADING })
    try {
      const res = await summarizeMeeting(meetingId)
      const { summary_output } = res
      update({
        summarizeStatus: STATUS.DONE,
        summary:         summary_output.summary,
        keyPoints:       summary_output.key_points,
        actionItems:     summary_output.action_items,
      })
      toast.success('Summary ready')
      return res
    } catch (err) {
      update({ summarizeStatus: STATUS.ERROR })
      toast.error(`Summarization failed: ${err.message}`)
      throw err
    }
  }, [update])

  // ── Run full pipeline ─────────────────────────────────────────────────────
  const runPipeline = useCallback(async (file) => {
    const id = await runUpload(file)
    await runTranscribe(id)
    await runTranslate(id)
    await runSummarize(id)
  }, [runUpload, runTranscribe, runTranslate, runSummarize])

  return {
    ...state,
    reset,
    loadMeeting,
    runUpload,
    runTranscribe,
    runTranslate,
    runSummarize,
    runPipeline,
  }
}
