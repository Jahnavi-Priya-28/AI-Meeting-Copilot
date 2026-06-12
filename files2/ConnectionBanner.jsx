/**
 * components/ui/ConnectionBanner.jsx
 * ─────────────────────────────────────
 * Sticky banner at the top of the page that shows backend connection status.
 * Green dot = connected, red = disconnected (with setup hint).
 * Dismissible once connected.
 */

import React, { useState } from 'react'
import { Wifi, WifiOff, Loader2, X, Terminal } from 'lucide-react'
import clsx from 'clsx'

export default function ConnectionBanner({ status, onRetry }) {
  const [dismissed, setDismissed] = useState(false)

  // Once connected and user hasn't dismissed — show briefly then auto-hide
  if (status === 'connected' && dismissed) return null
  if (status === 'checking') return null   // Don't flash on first load

  // Don't show the green banner at all — only show problems
  if (status === 'connected') return null

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-2.5 text-xs border-b animate-slide-up',
      status === 'disconnected'
        ? 'bg-rose-950/60 border-rose-800/40 text-rose-300'
        : 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
    )}>
      {/* Icon */}
      {status === 'checking'      && <Loader2 size={13} className="animate-spin shrink-0" />}
      {status === 'disconnected'  && <WifiOff  size={13} className="shrink-0 text-rose-400" />}
      {status === 'connected'     && <Wifi     size={13} className="shrink-0 text-emerald-400" />}

      {/* Message */}
      <span className="flex-1">
        {status === 'disconnected' && (
          <>
            <strong className="font-semibold">Backend offline.</strong>
            {' '}Start it with:{' '}
            <code className="font-mono bg-rose-900/40 px-1.5 py-0.5 rounded">
              uvicorn main:app --reload --port 8000
            </code>
          </>
        )}
      </span>

      {/* Retry button */}
      {status === 'disconnected' && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md
                     bg-rose-900/50 hover:bg-rose-800/60 border border-rose-700/40
                     text-rose-300 hover:text-rose-200 transition-colors font-medium"
        >
          <Terminal size={11} /> Retry
        </button>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
}
