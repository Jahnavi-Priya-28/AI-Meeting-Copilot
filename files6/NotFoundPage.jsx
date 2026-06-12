/**
 * pages/NotFoundPage.jsx
 * ───────────────────────
 * Friendly 404 / empty-state shown when a route doesn't match.
 */

import React from 'react'
import { Compass } from 'lucide-react'

export default function NotFoundPage({ onHome }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-navy-700 border border-navy-600/60
                      flex items-center justify-center mb-6">
        <Compass size={28} className="text-slate-500" />
      </div>
      <h2 className="font-display text-2xl text-slate-200 mb-2">Page not found</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        This page doesn't exist or hasn't been implemented yet.
      </p>
      <button onClick={onHome} className="btn-primary">
        Go to dashboard
      </button>
    </div>
  )
}
