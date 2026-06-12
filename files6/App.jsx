/**
 * App.jsx  (v4 — complete, all pages wired)
 * ───────────────────────────────────────────
 * Pages: dashboard | live | insights | history | auth | settings | apitest
 */

import React, { useState, useEffect } from 'react'
import { Toaster }                from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar                   from './components/layout/Sidebar'
import Dashboard                 from './pages/Dashboard'
import History                   from './pages/History'
import InsightsPage              from './pages/InsightsPage'
import LivePage                  from './pages/LivePage'
import AuthPage                  from './pages/AuthPage'
import SettingsPage              from './pages/SettingsPage'
import ApiTestPage               from './pages/ApiTestPage'
import NotFoundPage              from './pages/NotFoundPage'
import ConnectionBanner          from './components/ui/ConnectionBanner'
import ErrorBoundary             from './components/ui/ErrorBoundary'
import { useMeeting }            from './hooks/useMeeting'
import { useHealth }             from './hooks/useHealth'
import { getMeetings }           from './services/api'

const VALID_PAGES = ['dashboard','live','insights','history','auth','settings','apitest']

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

  const navigate = (p) => setPage(VALID_PAGES.includes(p) ? p : 'dashboard')

  const handleSelectMeeting = (doc) => {
    meeting.loadMeeting(doc)
    setPage('dashboard')
  }

  // Auth page: full-screen, no sidebar
  if (page === 'auth') {
    return <AuthPage onDone={() => navigate('dashboard')} />
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ConnectionBanner status={status} onRetry={retry} />

      <div className="flex flex-1">
        {/* Grid background */}
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

        <Sidebar
          activePage={page}
          onNavigate={navigate}
          meetings={meetings}
          selectedMeetingId={meeting.meetingId}
          onSelectMeeting={handleSelectMeeting}
          user={user}
          onLogout={logout}
        />

        <main className="flex-1 overflow-y-auto relative z-10">
          <ErrorBoundary onReset={meeting.reset}>
            {page === 'dashboard' && <Dashboard  meeting={meeting} />}
            {page === 'live'      && <LivePage    currentMeetingId={meeting.meetingId} />}
            {page === 'insights'  && <InsightsPage meetingId={meeting.meetingId} />}
            {page === 'history'   && <History      onSelectMeeting={handleSelectMeeting} />}
            {page === 'settings'  && <SettingsPage />}
            {page === 'apitest'   && <ApiTestPage  currentMeetingId={meeting.meetingId} />}
            {!VALID_PAGES.includes(page) && <NotFoundPage onHome={() => navigate('dashboard')} />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Toast config */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:  '#141e35',
            color:       '#cbd5e1',
            border:      '1px solid rgba(36,51,88,0.8)',
            fontFamily:  '"DM Sans", sans-serif',
            fontSize:    '13px',
            borderRadius:'10px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#141e35' }, duration: 3000 },
          error:   { iconTheme: { primary: '#fb7185', secondary: '#141e35' }, duration: 4000 },
          loading: { iconTheme: { primary: '#f59e0b', secondary: '#141e35' } },
        }}
      />
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
