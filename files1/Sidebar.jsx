/**
 * components/layout/Sidebar.jsx
 * ──────────────────────────────
 * Left sidebar: logo, nav links, and meeting history list.
 */

import React from 'react'
import { Mic2, LayoutDashboard, History, Zap, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

export default function Sidebar({ activePage, onNavigate, meetings, selectedMeetingId, onSelectMeeting }) {
  return (
    <aside className="w-60 min-h-screen bg-navy-900/90 border-r border-navy-600/40 flex flex-col shrink-0">

      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-navy-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40
                          flex items-center justify-center shrink-0">
            <Mic2 size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200 leading-none">Meeting</p>
            <p className="text-xs text-amber-500/80 font-mono mt-0.5">Copilot AI</p>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="p-3 space-y-1 border-b border-navy-700/50">
        <NavItem
          icon={<LayoutDashboard size={15} />}
          label="New Meeting"
          active={activePage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        <NavItem
          icon={<History size={15} />}
          label="History"
          active={activePage === 'history'}
          onClick={() => onNavigate('history')}
        />
      </nav>

      {/* ── Recent meetings ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="section-label mb-2 px-2">Recent</p>
        {meetings.length === 0 ? (
          <p className="text-xs text-slate-600 px-2 py-4 text-center">
            No meetings yet
          </p>
        ) : (
          <div className="space-y-1">
            {meetings.slice(0, 12).map((m) => (
              <button
                key={m.meeting_id}
                onClick={() => onSelectMeeting(m)}
                className={clsx(
                  'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150',
                  'hover:bg-navy-700/60 group',
                  selectedMeetingId === m.meeting_id
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Zap size={10} className="shrink-0 opacity-60" />
                  <span className="truncate font-medium">
                    {m.filename || 'Untitled'}
                  </span>
                </div>
                <p className="text-slate-600 group-hover:text-slate-500 mt-0.5 pl-4">
                  {m.created_at
                    ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true })
                    : '—'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-navy-700/50">
        <p className="text-xs text-slate-700 font-mono">v1.0.0 · FastAPI + React</p>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
        active
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/60'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
      {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
    </button>
  )
}
