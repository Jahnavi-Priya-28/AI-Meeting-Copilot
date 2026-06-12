/**
 * App.jsx  (v2 — with ConnectionBanner + ErrorBoundary)
 * ───────────────────────────────────────────────────────
 * Root component. Manages page routing, global meeting state, and
 * wraps pages in an ErrorBoundary so a crash never leaves a blank screen.
 */

import React, { useState, useEffect } from 'react'
import Sidebar           from './components/layout/Sidebar'
import Dashboard         from './pages/Dashboard'
import History           from './pages/History'
import ConnectionBanner  from './components/ui/ConnectionBanner'
import ErrorBoundary     from './components/ui/ErrorBoundary'
import { useMeeting }    from './hooks/useMeeting'
import { useHealth }     from './hooks/useHealth'
import { getMeetings }   from './services/api'

export default function App() {
  const [page,     setPage]     = useState('dashboard')
  const [meetings, setMeetings] = useState([])

  const meeting              = useMeeting()
  const { status, retry }    = useHealth(15_000)

  // Load meeting history for sidebar
  const refreshMeetings = async () => {
    try {
      const res = await getMeetings(20)
      setMeetings(res.meetings || [])
    } catch {
      // Sidebar history is non-critical — fail silently
    }
  }

  useEffect(() => { refreshMeetings() }, [])

  // Refresh sidebar after a full pipeline run
  useEffect(() => {
    if (meeting.summarizeStatus === 'done') refreshMeetings()
  }, [meeting.summarizeStatus])

  // Select a past meeting from the sidebar → load into dashboard
  const handleSelectMeeting = (doc) => {
    meeting.loadMeeting(doc)
    setPage('dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Connection status banner (only shown when offline) ──── */}
      <ConnectionBanner status={status} onRetry={retry} />

      <div className="flex flex-1">
        {/* ── Background grid decoration ─────────────────────────── */}
        <div
          className="fixed inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(36,51,88,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(36,51,88,0.35) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <Sidebar
          activePage={page}
          onNavigate={setPage}
          meetings={meetings}
          selectedMeetingId={meeting.meetingId}
          onSelectMeeting={handleSelectMeeting}
        />

        {/* ── Main content — wrapped in ErrorBoundary ───────────── */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <ErrorBoundary onReset={meeting.reset}>
            {page === 'dashboard' && <Dashboard meeting={meeting} />}
            {page === 'history'   && <History onSelectMeeting={handleSelectMeeting} />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
