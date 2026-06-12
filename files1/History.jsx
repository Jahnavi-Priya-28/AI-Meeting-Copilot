/**
 * pages/History.jsx
 * ──────────────────
 * Grid of all past meeting recordings with quick stats.
 */

import React, { useEffect, useState } from 'react'
import {
  History as HistoryIcon, FileAudio, Clock, Globe,
  ChevronRight, Loader2, RefreshCw, Sparkles, FileText
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'
import { getMeetings } from '../services/api'

function statusDot(meeting) {
  if (meeting.summary)         return { color: 'bg-emerald-400', label: 'Complete' }
  if (meeting.translated_text) return { color: 'bg-blue-400',    label: 'Translated' }
  if (meeting.transcript)      return { color: 'bg-amber-400',   label: 'Transcribed' }
  return                              { color: 'bg-slate-600',   label: 'Uploaded' }
}

export default function HistoryPage({ onSelectMeeting }) {
  const [meetings, setMeetings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMeetings(50)
      setMeetings(res.meetings || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Archive</p>
          <h1 className="font-display text-2xl text-slate-100">Meeting History</h1>
          <p className="text-sm text-slate-500 mt-1">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-rose-400 text-sm">{error}</p>
          <button onClick={load} className="btn-secondary mt-4">Retry</button>
        </div>
      ) : meetings.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <FileAudio size={32} className="text-slate-700 mx-auto" />
          <p className="text-slate-500 text-sm">No meetings yet — upload one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {meetings.map((m, i) => (
            <MeetingCard
              key={m.meeting_id}
              meeting={m}
              index={i}
              onSelect={() => onSelectMeeting(m)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MeetingCard({ meeting: m, index, onSelect }) {
  const dot = statusDot(m)

  return (
    <button
      onClick={onSelect}
      className="card text-left p-5 hover:border-amber-500/30 hover:bg-amber-500/3
                 transition-all duration-200 group animate-slide-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-navy-700 border border-navy-600/60
                          flex items-center justify-center shrink-0">
            <FileAudio size={14} className="text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {m.filename || 'Untitled Recording'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {m.created_at
                ? format(new Date(m.created_at), 'MMM d, yyyy · HH:mm')
                : '—'}
            </p>
          </div>
        </div>
        <ChevronRight size={15} className="text-slate-600 group-hover:text-amber-500
                                           transition-colors shrink-0 mt-1" />
      </div>

      {/* Status + meta row */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={clsx('w-1.5 h-1.5 rounded-full', dot.color)} />
          {dot.label}
        </span>
        {m.detected_language && (
          <span className="badge-slate">
            <Globe size={9} /> {m.detected_language.toUpperCase()}
          </span>
        )}
        {m.duration_seconds && (
          <span className="badge-slate">
            <Clock size={9} />
            {Math.floor(m.duration_seconds / 60)}m {Math.round(m.duration_seconds % 60)}s
          </span>
        )}
        {m.transcript && (
          <span className="badge-green">
            <FileText size={9} /> Transcript
          </span>
        )}
        {m.summary && (
          <span className="badge-amber">
            <Sparkles size={9} /> Summary
          </span>
        )}
      </div>

      {/* Snippet */}
      {m.summary && (
        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
          {m.summary}
        </p>
      )}
    </button>
  )
}
