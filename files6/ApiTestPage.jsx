/**
 * pages/ApiTestPage.jsx
 * ──────────────────────
 * Developer tool — run every backend API endpoint from the UI,
 * see live JSON responses, and check integration health.
 * Accessible via the sidebar's Dev Tools nav item.
 */

import React, { useState } from 'react'
import {
  Terminal, Play, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp, Copy, CheckCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { checkHealth, getMeetings, getMeeting, getAnalytics,
         getFullInsights, getExportFormats, diarizeMeeting,
         summarizeMeeting, transcribeAudio, translateTranscript } from '../services/api'

// ── Test suite definition ─────────────────────────────────────────────────────

const buildTests = (meetingId) => [
  {
    group: 'Health',
    tests: [
      {
        id: 'health',
        label: 'GET /health',
        desc:  'Backend liveness probe',
        run:   () => checkHealth(),
      },
    ],
  },
  {
    group: 'Meetings',
    tests: [
      {
        id:   'list_meetings',
        label: 'GET /meetings',
        desc:  'List recent meetings',
        run:   () => getMeetings(5),
      },
      {
        id:   'get_meeting',
        label: 'GET /meetings/{id}',
        desc:  'Fetch single meeting (requires a meeting ID below)',
        run:   () => meetingId ? getMeeting(meetingId) : Promise.reject(new Error('No meeting ID set')),
      },
    ],
  },
  {
    group: 'Pipeline',
    tests: [
      {
        id:   'transcribe',
        label: 'POST /transcribe',
        desc:  'Re-run transcription on selected meeting',
        run:   () => meetingId ? transcribeAudio(meetingId) : Promise.reject(new Error('No meeting ID')),
        warn:  'This re-runs Whisper — may take 30–120s',
      },
      {
        id:   'translate',
        label: 'POST /translate',
        desc:  'Translate transcript to English',
        run:   () => meetingId ? translateTranscript(meetingId, 'en') : Promise.reject(new Error('No meeting ID')),
      },
      {
        id:   'summarize',
        label: 'POST /summarize',
        desc:  'Generate summary with GPT',
        run:   () => meetingId ? summarizeMeeting(meetingId) : Promise.reject(new Error('No meeting ID')),
      },
    ],
  },
  {
    group: 'Insights',
    tests: [
      {
        id:   'full_insights',
        label: 'GET /insights/{id}',
        desc:  'Full insights for a meeting',
        run:   () => meetingId ? getFullInsights(meetingId) : Promise.reject(new Error('No meeting ID')),
      },
      {
        id:   'analytics',
        label: 'GET /insights/{id}/analytics',
        desc:  'Run analytics on transcript',
        run:   () => meetingId ? getAnalytics(meetingId) : Promise.reject(new Error('No meeting ID')),
      },
      {
        id:   'diarize',
        label: 'POST /insights/{id}/diarize',
        desc:  'Speaker diarization',
        run:   () => meetingId ? diarizeMeeting(meetingId) : Promise.reject(new Error('No meeting ID')),
        warn:  'Energy-based fallback used if no HuggingFace token',
      },
    ],
  },
  {
    group: 'Export',
    tests: [
      {
        id:   'export_formats',
        label: 'GET /export/{id}',
        desc:  'List available export formats',
        run:   () => meetingId ? getExportFormats(meetingId) : Promise.reject(new Error('No meeting ID')),
      },
    ],
  },
]

// ── Result display ─────────────────────────────────────────────────────────────

function ResultBlock({ result }) {
  const [expanded, setExpanded] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const json = JSON.stringify(result.data, null, 2)

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const preview = JSON.stringify(result.data).slice(0, 120)

  return (
    <div className={clsx(
      'rounded-lg border text-xs font-mono overflow-hidden mt-2',
      result.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
    )}>
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {result.ok
          ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
          : <XCircle      size={11} className="text-rose-400 shrink-0" />}
        <span className={result.ok ? 'text-emerald-300' : 'text-rose-300'}>
          {result.ok ? `200 OK · ${result.ms}ms` : result.error}
        </span>
        {result.ok && (
          <>
            <span className="text-slate-600 flex-1 truncate">{preview}…</span>
            <button onClick={copy} className="shrink-0 text-slate-600 hover:text-slate-300">
              {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
            <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-slate-600 hover:text-slate-300">
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </>
        )}
      </div>

      {/* Expanded JSON */}
      {expanded && result.ok && (
        <pre className="px-3 pb-3 text-slate-400 overflow-x-auto max-h-64 text-[11px] leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  )
}

// ── Test row ───────────────────────────────────────────────────────────────────

function TestRow({ test, onRun }) {
  const [state,  setState]  = useState('idle')   // idle|running|done|error
  const [result, setResult] = useState(null)

  const run = async () => {
    setState('running')
    const t0 = Date.now()
    try {
      const data = await test.run()
      setResult({ ok: true, data, ms: Date.now() - t0 })
      setState('done')
    } catch (err) {
      setResult({ ok: false, error: err.message })
      setState('error')
    }
  }

  return (
    <div className="py-3 border-b border-navy-700/30 last:border-0">
      <div className="flex items-start gap-3">
        {/* Run button */}
        <button
          onClick={run}
          disabled={state === 'running'}
          className={clsx(
            'shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5 transition-all',
            state === 'done'    && 'bg-emerald-500/10 border-emerald-500/30',
            state === 'error'   && 'bg-rose-500/10 border-rose-500/30',
            state === 'running' && 'bg-amber-500/10 border-amber-500/30',
            state === 'idle'    && 'bg-navy-700 border-navy-600/50 hover:border-amber-500/40',
          )}
        >
          {state === 'running'
            ? <Loader2 size={11} className="animate-spin text-amber-400" />
            : state === 'done'
            ? <CheckCircle2 size={11} className="text-emerald-400" />
            : state === 'error'
            ? <XCircle size={11} className="text-rose-400" />
            : <Play size={11} className="text-slate-500" />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono text-amber-300">{test.label}</code>
            {test.warn && (
              <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {test.warn}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{test.desc}</p>
          {result && <ResultBlock result={result} />}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ApiTestPage({ currentMeetingId }) {
  const [meetingId, setMeetingId] = useState(currentMeetingId || '')
  const [runningAll, setRunningAll] = useState(false)
  const tests = buildTests(meetingId)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <p className="section-label mb-1">Developer</p>
        <h1 className="font-display text-2xl text-slate-100">API Test Console</h1>
        <p className="text-sm text-slate-500 mt-1">
          Run every endpoint and inspect responses in real time.
        </p>
      </div>

      {/* Meeting ID input */}
      <div className="card p-4 flex items-center gap-3">
        <Terminal size={14} className="text-slate-500 shrink-0" />
        <div className="flex-1">
          <label className="text-xs text-slate-500 font-mono block mb-1">
            Meeting ID (used for /meetings, /insights, /export tests)
          </label>
          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="paste a meeting_id here…"
            className="input-base text-xs font-mono"
          />
        </div>
      </div>

      {/* Test groups */}
      {tests.map((group) => (
        <div key={group.group} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-700/50 bg-navy-800/60">
            <p className="section-label">{group.group}</p>
          </div>
          <div className="px-5">
            {group.tests.map((test) => (
              <TestRow key={test.id} test={test} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
