/**
 * components/ui/RagIndexBadge.jsx
 * ──────────────────────────────────
 * Fetches and displays the FAISS index metadata for the current meeting.
 * Shows chunk count, build time, and a "Rebuild" button.
 * Rendered inside ChatPanel's header.
 */

import React, { useEffect, useState } from 'react'
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../services/api'
import clsx from 'clsx'

export default function RagIndexBadge({ meetingId }) {
  const [info,      setInfo]      = useState(null)   // index metadata
  const [loading,   setLoading]   = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [error,     setError]     = useState(null)

  const fetchInfo = async () => {
    if (!meetingId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get(`/rag/${meetingId}`)
      setInfo(data)
    } catch (err) {
      // 404 = index not built yet — not an error we show loudly
      if (!err.message.includes('No FAISS')) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      await api.post(`/rag/${meetingId}/rebuild`)
      await fetchInfo()
    } catch (err) {
      setError(err.message)
    } finally {
      setRebuilding(false)
    }
  }

  useEffect(() => {
    fetchInfo()
  }, [meetingId])

  if (!meetingId) return null

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <span className="badge-slate animate-pulse">
          <Database size={9} /> Checking index…
        </span>
      ) : info ? (
        <div className="flex items-center gap-1.5">
          <span className="badge-green">
            <CheckCircle2 size={9} />
            {info.chunk_count} chunks
          </span>
          <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">
            built {formatDistanceToNow(new Date(info.built_at), { addSuffix: true })}
          </span>
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            title="Rebuild FAISS index"
            className="btn-ghost px-1.5 py-1 text-[10px]"
          >
            <RefreshCw size={10} className={rebuilding ? 'animate-spin' : ''} />
          </button>
        </div>
      ) : (
        <span className="badge-rose">
          <AlertCircle size={9} /> No index
        </span>
      )}

      {error && (
        <span className="text-[10px] text-rose-400 font-mono truncate max-w-[120px]">
          {error}
        </span>
      )}
    </div>
  )
}
