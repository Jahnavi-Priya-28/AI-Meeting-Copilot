/**
 * hooks/useLiveTranscription.js
 * ──────────────────────────────
 * Captures microphone audio and streams it to the backend WebSocket
 * for real-time transcription.
 *
 * State machine:
 *   idle → connecting → recording → stopping → done | error
 *
 * Usage:
 *   const { status, partials, transcript, start, stop } = useLiveTranscription(meetingId)
 */

import { useState, useRef, useCallback } from 'react'
import { createLiveTranscriptWS } from '../services/api'

const SAMPLE_RATE  = 16000
const CHUNK_MS     = 250   // Send audio every 250ms

export function useLiveTranscription(meetingId) {
  const [status,     setStatus]     = useState('idle')      // idle|connecting|recording|stopping|done|error
  const [partials,   setPartials]   = useState([])          // interim results
  const [transcript, setTranscript] = useState('')          // final full transcript
  const [error,      setError]      = useState(null)

  const wsRef         = useRef(null)
  const streamRef     = useRef(null)
  const ctxRef        = useRef(null)
  const processorRef  = useRef(null)
  const bufferRef     = useRef([])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const _cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    ctxRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    processorRef.current = null
    ctxRef.current       = null
    streamRef.current    = null
  }, [])

  const _flushBuffer = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (bufferRef.current.length === 0) return

    // Merge accumulated Int16 samples into one ArrayBuffer
    const total  = bufferRef.current.reduce((n, b) => n + b.length, 0)
    const merged = new Int16Array(total)
    let   offset = 0
    for (const chunk of bufferRef.current) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    bufferRef.current = []
    wsRef.current.send(merged.buffer)
  }, [])

  // ── Start recording ────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!meetingId) { setError('No meeting selected'); return }
    setStatus('connecting')
    setPartials([])
    setTranscript('')
    setError(null)

    // 1. Open WebSocket
    const ws = createLiveTranscriptWS(meetingId)
    wsRef.current = ws

    ws.onopen = () => setStatus('recording')

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'partial') {
          setPartials((p) => [...p, msg.text])
        } else if (msg.type === 'final') {
          setPartials((p) => [...p, msg.text])
        } else if (msg.type === 'complete') {
          setTranscript(msg.transcript)
          setStatus('done')
        } else if (msg.type === 'error') {
          setError(msg.message)
          setStatus('error')
        }
      } catch { /* ignore malformed frames */ }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed. Make sure the backend is running.')
      setStatus('error')
      _cleanup()
    }

    ws.onclose = () => {
      if (status === 'recording') setStatus('done')
    }

    // 2. Request microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const ctx       = new AudioContext({ sampleRate: SAMPLE_RATE })
      ctxRef.current  = ctx

      const source    = ctx.createMediaStreamSource(stream)
      // ScriptProcessor is deprecated but widely supported; replace with AudioWorklet when needed
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0)
        // Convert Float32 → Int16 PCM
        const int16   = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
        }
        bufferRef.current.push(int16)
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      // Flush buffer every CHUNK_MS milliseconds
      const interval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) _flushBuffer()
        else clearInterval(interval)
      }, CHUNK_MS)

    } catch (err) {
      setError(`Microphone access denied: ${err.message}`)
      setStatus('error')
      ws.close()
      _cleanup()
    }
  }, [meetingId, _cleanup, _flushBuffer])

  // ── Stop recording ─────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    setStatus('stopping')
    _flushBuffer()   // Send any remaining audio
    // Signal the server we're done
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }))
    }
    _cleanup()
  }, [_cleanup, _flushBuffer])

  const reset = useCallback(() => {
    setStatus('idle')
    setPartials([])
    setTranscript('')
    setError(null)
    wsRef.current?.close()
    _cleanup()
  }, [_cleanup])

  return { status, partials, transcript, error, start, stop, reset }
}
