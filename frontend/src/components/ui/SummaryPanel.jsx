/**
 * components/ui/SummaryPanel.jsx
 * ────────────────────────────────
 * Displays meeting summary, key points, and action items.
 */

import React from 'react'
import { Sparkles, ListChecks, Target, ChevronRight, Loader2 } from 'lucide-react'
import { STATUS } from '../../hooks/useMeeting'

function SkeletonLine({ w = '80%' }) {
  return <div className="skeleton h-3 rounded" style={{ width: w }} />
}

export default function SummaryPanel({ summary, keyPoints, actionItems, status }) {
  if (status === STATUS.IDLE && !summary) return null

  const isLoading = status === STATUS.LOADING

  return (
    <div className="card animate-slide-up space-y-0 divide-y divide-navy-700/50">

      {/* ── Summary ──────────────────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20
                          flex items-center justify-center">
            <Sparkles size={13} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
          {isLoading && (
            <Loader2 size={13} className="text-amber-400 animate-spin ml-auto" />
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <SkeletonLine w="95%" />
            <SkeletonLine w="88%" />
            <SkeletonLine w="72%" />
          </div>
        ) : summary ? (
          <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
        ) : null}
      </div>

      {/* ── Key Points ───────────────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20
                          flex items-center justify-center">
            <ListChecks size={13} className="text-teal-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Key Points</h3>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[70, 85, 60, 78].map((w, i) => <SkeletonLine key={i} w={`${w}%`} />)}
          </div>
        ) : keyPoints?.length > 0 ? (
          <ul className="space-y-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}>
                <ChevronRight size={13} className="text-teal-500 mt-0.5 shrink-0" />
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-600 text-sm italic">No key points extracted</p>
        )}
      </div>

      {/* ── Action Items ─────────────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20
                          flex items-center justify-center">
            <Target size={13} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Action Items</h3>
          {actionItems?.length > 0 && (
            <span className="badge-amber ml-auto">{actionItems.length}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[75, 90, 65].map((w, i) => <SkeletonLine key={i} w={`${w}%`} />)}
          </div>
        ) : actionItems?.length > 0 ? (
          <ul className="space-y-2">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}>
                <span className="mt-0.5 w-4 h-4 rounded border border-amber-500/40
                                 bg-amber-500/10 shrink-0 flex items-center justify-center">
                  <span className="text-[9px] font-mono text-amber-500">{i + 1}</span>
                </span>
                <span className="text-sm text-slate-300 leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        ) : !isLoading ? (
          <p className="text-slate-600 text-sm italic">No action items identified</p>
        ) : null}
      </div>
    </div>
  )
}
