/**
 * pages/InsightsPage.jsx
 * ───────────────────────
 * Full analytics dashboard for a meeting:
 *  - Overview stats (WPM, word count, silence, sentiment)
 *  - Speaker talk-time bars with sentiment badges
 *  - Speaker timeline (visual Gantt of who spoke when)
 *  - Top keywords cloud
 *  - Topic clusters
 */

import React, { useState, useEffect } from 'react'
import {
  BarChart2, Users, MessageSquare, Zap, RefreshCw,
  Loader2, AlertCircle, Clock, TrendingUp, Hash,
} from 'lucide-react'
import clsx from 'clsx'
import { getFullInsights, diarizeMeeting, getAnalytics } from '../services/api'
import Spinner from '../components/ui/Spinner'

// ── Speaker colour palette (cycles for > 6 speakers) ──────────────────────────
const SPK_COLORS = [
  'bg-amber-500/80  border-amber-500/40  text-amber-300',
  'bg-teal-500/80   border-teal-500/40   text-teal-300',
  'bg-purple-500/80 border-purple-500/40 text-purple-300',
  'bg-rose-500/80   border-rose-500/40   text-rose-300',
  'bg-blue-500/80   border-blue-500/40   text-blue-300',
  'bg-emerald-500/80 border-emerald-500/40 text-emerald-300',
]
const SPK_BAR = [
  'bg-amber-500', 'bg-teal-500', 'bg-purple-500',
  'bg-rose-500',  'bg-blue-500', 'bg-emerald-500',
]

const SENTIMENT_BADGE = {
  positive: 'badge-green',
  negative: 'badge-rose',
  neutral:  'badge-slate',
  mixed:    'badge-amber',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-navy-700 border border-navy-600/60
                      flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-mono">{label}</p>
        <p className="text-lg font-semibold text-slate-100 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SpeakerBar({ spk, idx, maxTime }) {
  const pct = maxTime > 0 ? (spk.talk_time_s / maxTime) * 100 : 0
  const color = SPK_BAR[idx % SPK_BAR.length]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full', color)} />
          <span className="text-slate-300 font-medium">{spk.speaker}</span>
          <span className={SENTIMENT_BADGE[spk.sentiment] || 'badge-slate'}
                style={{display:'inline-flex',alignItems:'center',gap:3,padding:'1px 6px',borderRadius:4,fontSize:10,border:'1px solid'}}>
            {spk.sentiment}
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 font-mono">
          <span>{Math.round(spk.talk_time_s)}s</span>
          <span>{spk.talk_time_pct}%</span>
          <span>{spk.word_count} words</span>
        </div>
      </div>
      <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Timeline({ segments, duration, speakers }) {
  if (!segments?.length) return null
  const total = duration || segments[segments.length - 1]?.end || 1

  return (
    <div className="space-y-2">
      {speakers.map((spk, idx) => {
        const spkSegs = segments.filter((s) => s.speaker === spk)
        return (
          <div key={spk} className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 w-24 shrink-0 truncate">{spk}</span>
            <div className="flex-1 h-6 bg-navy-800 rounded-md relative overflow-hidden">
              {spkSegs.map((seg, i) => {
                const left  = (seg.start / total) * 100
                const width = ((seg.end - seg.start) / total) * 100
                return (
                  <div
                    key={i}
                    title={`${seg.start.toFixed(1)}s – ${seg.end.toFixed(1)}s\n${seg.text || ''}`}
                    className={clsx(
                      'absolute top-0.5 bottom-0.5 rounded-sm opacity-80 cursor-pointer hover:opacity-100',
                      SPK_BAR[idx % SPK_BAR.length]
                    )}
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-slate-700 font-mono pl-28">
        <span>0:00</span>
        <span>{Math.floor(total / 60)}:{String(Math.round(total % 60)).padStart(2,'0')}</span>
      </div>
    </div>
  )
}

function KeywordCloud({ keywords }) {
  if (!keywords?.length) return null
  const max = keywords[0]?.score || 1
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw) => {
        const size = 11 + Math.round((kw.score / max) * 6)
        return (
          <span
            key={kw.word}
            className="badge-slate cursor-default hover:border-amber-500/40
                       hover:text-amber-300 transition-colors"
            style={{ fontSize: size }}
          >
            <Hash size={9} />{kw.word}
          </span>
        )
      })}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InsightsPage({ meetingId }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [diarizing,  setDiarizing]  = useState(false)
  const [analyzing,  setAnalyzing]  = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getFullInsights(meetingId)
      setData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (meetingId) load() }, [meetingId])

  const handleDiarize = async () => {
    setDiarizing(true)
    try {
      await diarizeMeeting(meetingId)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDiarizing(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      await getAnalytics(meetingId)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  if (!meetingId) return (
    <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
      Select a meeting from the sidebar to view insights.
    </div>
  )

  if (loading) return <Spinner size="lg" label="Loading insights…" className="h-64" />

  if (error) return (
    <div className="card p-8 text-center space-y-3">
      <AlertCircle size={28} className="text-rose-400 mx-auto" />
      <p className="text-rose-400 text-sm">{error}</p>
      <button onClick={load} className="btn-secondary">Retry</button>
    </div>
  )

  const overview  = data?.analytics?.overview
  const speakers  = data?.analytics?.speakers  || data?.speakers || []
  const keywords  = data?.analytics?.keywords  || []
  const topics    = data?.analytics?.topics    || []
  const timeline  = data?.timeline             || []
  const spkNames  = data?.speakers             || speakers.map((s) => s.speaker)
  const maxTime   = speakers.reduce((m, s) => Math.max(m, s.talk_time_s || 0), 0)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Insights</p>
          <h1 className="font-display text-2xl text-slate-100">Meeting Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 truncate max-w-xs">{data?.filename}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={handleDiarize} disabled={diarizing} className="btn-secondary text-xs">
            {diarizing ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
            {diarizing ? 'Diarizing…' : 'Run diarization'}
          </button>
          <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary text-xs">
            {analyzing ? <Loader2 size={12} className="animate-spin" /> : <BarChart2 size={12} />}
            {analyzing ? 'Analyzing…' : 'Run analytics'}
          </button>
          <button onClick={load} className="btn-ghost text-xs">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview stats */}
      {overview ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare size={14} className="text-teal-400" />}
            label="Words"
            value={overview.word_count?.toLocaleString()}
            sub={`${overview.words_per_minute} WPM`}
          />
          <StatCard
            icon={<Clock size={14} className="text-blue-400" />}
            label="Duration"
            value={`${Math.floor((overview.duration_seconds || 0) / 60)}m ${Math.round((overview.duration_seconds || 0) % 60)}s`}
            sub={overview.silence_percent != null ? `${overview.silence_percent}% silence` : null}
          />
          <StatCard
            icon={<Users size={14} className="text-purple-400" />}
            label="Speakers"
            value={overview.speaker_count || spkNames.length || '—'}
            sub={`${overview.question_count || 0} questions`}
          />
          <StatCard
            icon={<TrendingUp size={14} className="text-amber-400" />}
            label="Sentiment"
            value={overview.overall_sentiment || '—'}
            sub={`${overview.sentence_count || 0} sentences`}
          />
        </div>
      ) : (
        <div className="card p-5 flex items-center gap-3 text-slate-500 text-sm">
          <BarChart2 size={16} />
          No analytics yet — click "Run analytics" above.
        </div>
      )}

      {/* Speaker breakdown */}
      {speakers.length > 0 && (
        <div className="card p-5 space-y-4">
          <p className="section-label">Speaker breakdown</p>
          {speakers.map((spk, i) => (
            <SpeakerBar key={spk.speaker} spk={spk} idx={i} maxTime={maxTime} />
          ))}
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="card p-5 space-y-3">
          <p className="section-label">Speaker timeline</p>
          <Timeline segments={timeline} duration={data?.duration} speakers={spkNames} />
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="card p-5 space-y-3">
          <p className="section-label">Top keywords</p>
          <KeywordCloud keywords={keywords} />
        </div>
      )}

      {/* Topic clusters */}
      {topics.length > 0 && (
        <div className="card p-5 space-y-3">
          <p className="section-label">Topic clusters</p>
          <div className="grid grid-cols-2 gap-3">
            {topics.map((t, i) => (
              <div key={i} className="bg-navy-700/50 border border-navy-600/40 rounded-lg p-3">
                <p className="text-xs font-mono text-amber-400 mb-2">{t.topic}</p>
                <div className="flex flex-wrap gap-1">
                  {t.keywords.map((kw) => (
                    <span key={kw} className="text-xs text-slate-400 bg-navy-800 px-2 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {!overview && !speakers.length && !timeline.length && (
        <div className="card p-10 text-center space-y-4">
          <Zap size={28} className="text-slate-700 mx-auto" />
          <p className="text-slate-500 text-sm">
            Run diarization and analytics to see insights here.
          </p>
        </div>
      )}
    </div>
  )
}
