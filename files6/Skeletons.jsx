/**
 * components/ui/Skeletons.jsx
 * ────────────────────────────
 * Named skeleton components for every panel in the app.
 * Use these during loading states instead of blank panels.
 */

import React from 'react'

function Bar({ w = '100%', h = 'h-3', className = '' }) {
  return (
    <div
      className={`skeleton rounded ${h} ${className}`}
      style={{ width: w }}
    />
  )
}

// ── Summary panel skeleton ────────────────────────────────────────────────────

export function SummarySkeleton() {
  return (
    <div className="card p-5 space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Bar w="30%" h="h-3" />
        <Bar w="95%" />
        <Bar w="88%" />
        <Bar w="72%" />
      </div>
      <div className="space-y-2 pt-2 border-t border-navy-700/40">
        <Bar w="25%" h="h-3" />
        {[80, 70, 85, 60].map((w, i) => <Bar key={i} w={`${w}%`} />)}
      </div>
      <div className="space-y-2 pt-2 border-t border-navy-700/40">
        <Bar w="30%" h="h-3" />
        {[75, 90, 65].map((w, i) => <Bar key={i} w={`${w}%`} />)}
      </div>
    </div>
  )
}

// ── Transcript panel skeleton ─────────────────────────────────────────────────

export function TranscriptSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center gap-3 pb-3 border-b border-navy-700/40">
        <div className="skeleton w-7 h-7 rounded-lg" />
        <Bar w="120px" h="h-4" />
        <div className="ml-auto skeleton w-32 h-7 rounded-lg" />
      </div>
      {[95, 88, 100, 72, 85, 60, 90].map((w, i) => (
        <Bar key={i} w={`${w}%`} />
      ))}
    </div>
  )
}

// ── History card skeleton ─────────────────────────────────────────────────────

export function HistoryCardSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Bar w="60%" h="h-3.5" />
          <Bar w="40%" h="h-2.5" />
        </div>
      </div>
      <div className="flex gap-2">
        {[50, 40, 35].map((w, i) => (
          <div key={i} className="skeleton h-5 rounded-md" style={{ width: w }} />
        ))}
      </div>
      <Bar w="90%" h="h-2.5" />
      <Bar w="75%" h="h-2.5" />
    </div>
  )
}

// ── Insights skeleton ─────────────────────────────────────────────────────────

export function InsightsSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton w-8 h-8 rounded-lg" />
              <Bar w="60%" h="h-3" />
            </div>
            <Bar w="40%" h="h-6" />
          </div>
        ))}
      </div>
      {/* Speaker bars */}
      <div className="card p-5 space-y-4">
        <Bar w="25%" h="h-3" />
        {[1,2,3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Bar w="120px" h="h-3" />
              <Bar w="80px" h="h-3" />
            </div>
            <div className="skeleton h-2 rounded-full w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chat skeleton ─────────────────────────────────────────────────────────────

export function ChatSkeleton() {
  return (
    <div className="card p-5 space-y-4 animate-fade-in" style={{ height: 480 }}>
      <div className="flex items-center gap-3 pb-3 border-b border-navy-700/40">
        <div className="skeleton w-7 h-7 rounded-lg" />
        <Bar w="160px" h="h-4" />
      </div>
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
            <div className="skeleton w-7 h-7 rounded-full shrink-0" />
            <div className="space-y-1.5 max-w-[70%]">
              <Bar w="200px" />
              <Bar w="160px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
