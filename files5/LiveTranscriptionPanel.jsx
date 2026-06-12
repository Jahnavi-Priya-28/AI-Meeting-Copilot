/**
 * components/ui/LiveTranscriptionPanel.jsx
 * ──────────────────────────────────────────
 * Real-time microphone transcription panel.
 * Uses useLiveTranscription hook → WebSocket → Whisper sliding window.
 */

import React, { useRef, useEffect } from 'react'
import { Mic, MicOff, Square, Radio, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useLiveTranscription } from '../../hooks/useLiveTranscription'

const STATUS_LABELS = {
  idle:       'Ready to record',
  connecting: 'Connecting…',
  recording:  'Recording — speak now',
  stopping:   'Finishing up…',
  done:       'Transcription complete',
  error:      'Error',
}

export default function LiveTranscriptionPanel({ meetingId }) {
  const { status, partials, transcript, error, start, stop, reset } = useLiveTranscription(meetingId)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [partials])

  const isRecording = status === 'recording'
  const isLoading   = status === 'connecting' || status === 'stopping'
  const isDone      = status === 'done'
  const isError     = status === 'error'

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50">
        <div className={clsx(
          'w-7 h-7 rounded-lg flex items-center justify-center border transition-colors',
          isRecording
            ? 'bg-rose-500/20 border-rose-500/40 animate-pulse'
            : 'bg-navy-700 border-navy-600/60'
        )}>
          <Radio size={13} className={isRecording ? 'text-rose-400' : 'text-slate-500'} />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Live Transcription</h3>

        {/* Status pill */}
        <span className={clsx(
          'ml-auto text-xs font-mono px-2.5 py-1 rounded-full border',
          isRecording && 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          isLoading   && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          isDone      && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          isError     && 'bg-rose-800/20 border-rose-700/30 text-rose-400',
          status === 'idle' && 'bg-navy-700 border-navy-600/40 text-slate-500',
        )}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Transcript area */}
      <div className="min-h-40 max-h-64 overflow-y-auto p-5 space-y-2">
        {partials.length === 0 && !isDone && !isError && (
          <p className="text-slate-600 text-xs text-center py-8">
            {isRecording
              ? 'Listening… speak clearly into your microphone.'
              : 'Click "Start recording" to begin live transcription.'}
          </p>
        )}

        {partials.map((text, i) => (
          <p
            key={i}
            className={clsx(
              'text-sm leading-relaxed transition-all duration-300',
              i === partials.length - 1 ? 'text-slate-200' : 'text-slate-500'
            )}
          >
            {text}
          </p>
        ))}

        {isDone && transcript && (
          <div className="mt-2 pt-3 border-t border-navy-700/50 animate-fade-in">
            <p className="text-xs text-emerald-400 font-mono mb-2">Final transcript:</p>
            <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-rose-400 text-xs animate-fade-in">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="px-5 pb-5 flex items-center gap-3">
        {!isRecording && !isDone && !isLoading && (
          <button
            onClick={start}
            disabled={!meetingId || isLoading}
            className="btn-primary"
          >
            <Mic size={14} />
            Start recording
          </button>
        )}

        {isLoading && (
          <button disabled className="btn-primary opacity-50">
            <Loader2 size={14} className="animate-spin" />
            {status === 'connecting' ? 'Connecting…' : 'Finishing…'}
          </button>
        )}

        {isRecording && (
          <button onClick={stop} className="btn-secondary border-rose-500/40 hover:border-rose-500/70">
            <Square size={14} className="text-rose-400" />
            Stop
          </button>
        )}

        {(isDone || isError) && (
          <button onClick={reset} className="btn-ghost text-xs">
            <RotateCcw size={12} /> New recording
          </button>
        )}

        {!meetingId && (
          <p className="text-xs text-slate-600">Upload a file first to attach live transcription.</p>
        )}
      </div>
    </div>
  )
}
