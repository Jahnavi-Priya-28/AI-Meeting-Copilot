/**
 * App.jsx  (v3 — all new pages wired in)
 * ─────────────────────────────────────────
 * Pages: dashboard | live | insights | history | auth
 */

import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth }  from './context/AuthContext'
import Sidebar                    from './components/layout/Sidebar'
import Dashboard                  from './pages/Dashboard'
import History                    from './pages/History'
import InsightsPage               from './pages/InsightsPage'
import LivePage                   from './pages/LivePage'
import AuthPage                   from './pages/AuthPage'
import ConnectionBanner           from './components/ui/ConnectionBanner'
import ErrorBoundary              from './components/ui/ErrorBoundary'
import { useMeeting }             from './hooks/useMeeting'
import { useHealth }              from './hooks/useHealth'
import { getMeetings }            from './services/api'

function AppInner() {
  const [page,     setPage]     = useState('dashboard')
  const [meetings, setMeetings] = useState([])

  const meeting           = useMeeting()
  const { status, retry } = useHealth(15_000)
  const { user, logout }  = useAuth()

  const refreshMeetings = async () => {
    try {
      const res = await getMeetings(20)
      setMeetings(res.meetings || [])
    } catch { /* silent */ }
  }

  useEffect(() => { refreshMeetings() }, [])
  useEffect(() => {
    if (meeting.summarizeStatus === 'done') refreshMeetings()
  }, [meeting.summarizeStatus])

  const handleSelectMeeting = (doc) => {
    meeting.loadMeeting(doc)
    setPage('dashboard')
  }

  // Auth page has its own full-screen layout
  if (page === 'auth') return <AuthPage onDone={() => setPage('dashboard')} />

  return (
    <div className="flex flex-col min-h-screen">
      <ConnectionBanner status={status} onRetry={retry} />
      <div className="flex flex-1">
        <div className="fixed inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `linear-gradient(rgba(36,51,88,0.35) 1px,transparent 1px),linear-gradient(90deg,rgba(36,51,88,0.35) 1px,transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        <Sidebar
          activePage={page}
          onNavigate={setPage}
          meetings={meetings}
          selectedMeetingId={meeting.meetingId}
          onSelectMeeting={handleSelectMeeting}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto relative z-10">
          <ErrorBoundary onReset={meeting.reset}>
            {page === 'dashboard' && <Dashboard meeting={meeting} />}
            {page === 'live'      && <LivePage currentMeetingId={meeting.meetingId} />}
            {page === 'insights'  && <InsightsPage meetingId={meeting.meetingId} />}
            {page === 'history'   && <History onSelectMeeting={handleSelectMeeting} />}
            {page === 'auth'      && <AuthPage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
