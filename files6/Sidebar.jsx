/**
 * components/layout/Sidebar.jsx  (v3 — Settings + Dev Tools nav)
 */

import React from 'react'
import {
  Mic2, LayoutDashboard, History, Zap, ChevronRight,
  BarChart2, LogOut, User, Radio, Settings, Terminal,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'New Meeting',     icon: LayoutDashboard },
  { id: 'live',      label: 'Live Transcribe', icon: Radio },
  { id: 'insights',  label: 'Insights',        icon: BarChart2 },
  { id: 'history',   label: 'History',         icon: History },
]

const BOTTOM_NAV = [
  { id: 'apitest',  label: 'API Console',  icon: Terminal },
  { id: 'settings', label: 'Settings',     icon: Settings },
]

export default function Sidebar({
  activePage, onNavigate, meetings, selectedMeetingId,
  onSelectMeeting, user, onLogout,
}) {
  return (
    <aside className="w-60 min-h-screen bg-navy-900/90 border-r border-navy-600/40 flex flex-col shrink-0">

      {/* Logo */}
      <div className="p-5 border-b border-navy-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40
                          flex items-center justify-center shrink-0">
            <Mic2 size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200 leading-none">Meeting</p>
            <p className="text-xs text-amber-500/80 font-mono mt-0.5">Copilot AI v2</p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="p-3 space-y-1 border-b border-navy-700/50">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <NavItem key={id} icon={<Icon size={15} />} label={label}
            active={activePage === id} onClick={() => onNavigate(id)} />
        ))}
      </nav>

      {/* Recent meetings */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="section-label mb-2 px-2">Recent</p>
        {meetings.length === 0 ? (
          <p className="text-xs text-slate-600 px-2 py-4 text-center">No meetings yet</p>
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
                  <span className="truncate font-medium">{m.filename || 'Untitled'}</span>
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

      {/* Bottom nav: Settings + Dev */}
      <div className="p-3 border-t border-navy-700/50 space-y-1">
        {BOTTOM_NAV.map(({ id, label, icon: Icon }) => (
          <NavItem key={id} icon={<Icon size={14} />} label={label}
            active={activePage === id} onClick={() => onNavigate(id)} />
        ))}
      </div>

      {/* User footer */}
      <div className="px-3 pb-3">
        {user ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-navy-800/60 border border-navy-700/40">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30
                            flex items-center justify-center shrink-0">
              <User size={12} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
            </div>
            <button onClick={onLogout} className="btn-ghost p-1.5 text-slate-600 hover:text-rose-400">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('auth')}
            className="w-full text-xs text-slate-600 hover:text-amber-400 transition-colors
                       py-2 px-3 rounded-lg hover:bg-navy-800/60 text-left font-mono"
          >
            Sign in / Register →
          </button>
        )}
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
