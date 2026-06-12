/**
 * App.jsx
 * ────────
 * Root component. Manages page routing (no react-router needed for this
 * simple two-page app), global meeting state, and history loading.
 */

import React, { useState, useEffect } from 'react'
import Sidebar    from './components/layout/Sidebar'
import Dashboard  from './pages/Dashboard'
import History    from './pages/History'
import { useMeeting } from './hooks/useMeeting'
import { getMeetings } from './services/api'

export default function App() {
  const [page,       setPage]       = useState('dashboard')
  const [meetings,   setMeetings]   = useState([])

  const meeting = useMeeting()

  // Load meeting history for sidebar
  const refreshMeetings = async () => {
    try {
      const res = await getMeetings(20)
      setMeetings(res.meetings || [])
    } catch {
      // Silently fail — sidebar history is non-critical
    }
  }

  useEffect(() => {
    refreshMeetings()
  }, [])

  // Refresh history after a meeting is processed
  useEffect(() => {
    if (meeting.summarizeStatus === 'done') {
      refreshMeetings()
    }
  }, [meeting.summarizeStatus])

  // Select a meeting from history → load into dashboard
  const handleSelectMeeting = (doc) => {
    meeting.loadMeeting(doc)
    setPage('dashboard')
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Background grid decoration ───────────────────────────── */}
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

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        meetings={meetings}
        selectedMeetingId={meeting.meetingId}
        onSelectMeeting={handleSelectMeeting}
      />

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {page === 'dashboard' && (
          <Dashboard meeting={meeting} />
        )}
        {page === 'history' && (
          <History onSelectMeeting={handleSelectMeeting} />
        )}
      </main>
    </div>
  )
}
