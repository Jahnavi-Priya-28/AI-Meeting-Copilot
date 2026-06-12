/**
 * pages/LivePage.jsx
 * ───────────────────
 * Dedicated page for live microphone transcription.
 * User picks (or creates) a meeting, then records directly from mic.
 */

import React, { useState, useEffect } from 'react'
import { Radio, Plus, Loader2 } from 'lucide-react'
import { getMeetings, uploadAudio } from '../services/api'
import LiveTranscriptionPanel from '../components/ui/LiveTranscriptionPanel'
import ExportPanel from '../components/ui/ExportPanel'

export default function LivePage({ currentMeetingId, onMeetingCreated }) {
  const [meetings,        setMeetings]        = useState([])
  const [selectedId,      setSelectedId]      = useState(currentMeetingId || '')
  const [creatingNew,     setCreatingNew]      = useState(false)

  useEffect(() => {
    getMeetings(30).then((r) => setMeetings(r.meetings || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (currentMeetingId) setSelectedId(currentMeetingId)
  }, [currentMeetingId])

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-5 animate-fade-in">
      <div>
        <p className="section-label mb-1">Live</p>
        <h1 className="font-display text-2xl text-slate-100">Live Transcription</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record directly from your microphone and get a real-time transcript.
        </p>
      </div>

      {/* Meeting selector */}
      <div className="card p-5 space-y-3">
        <p className="section-label">Attach to meeting</p>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-base flex-1 text-sm"
          >
            <option value="">— Select an existing meeting —</option>
            {meetings.map((m) => (
              <option key={m.meeting_id} value={m.meeting_id}>
                {m.filename || 'Untitled'} · {m.meeting_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        {!selectedId && (
          <p className="text-xs text-slate-600">
            Live transcripts are saved to the selected meeting's record in MongoDB.
          </p>
        )}
      </div>

      {/* Live panel */}
      <LiveTranscriptionPanel meetingId={selectedId} />

      {/* Export (shown after recording) */}
      {selectedId && <ExportPanel meetingId={selectedId} />}
    </div>
  )
}
