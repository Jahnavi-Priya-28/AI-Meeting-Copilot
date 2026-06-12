/**
 * components/ui/ErrorBoundary.jsx
 * ─────────────────────────────────
 * React class-based error boundary.
 * Catches render errors in any child component tree and shows a
 * recovery UI instead of a blank white screen.
 */

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production you'd send this to Sentry / Datadog
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // If a reset callback was passed (e.g. to clear meeting state), call it
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20
                        flex items-center justify-center mb-5">
          <AlertTriangle size={24} className="text-rose-400" />
        </div>

        <h2 className="font-display text-xl text-slate-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-500 mb-1 max-w-md">
          An unexpected error occurred in this component.
        </p>
        {this.state.error && (
          <code className="text-xs font-mono text-rose-400 bg-rose-950/40
                           border border-rose-800/30 rounded-lg px-3 py-2 mt-2 max-w-md
                           block text-left overflow-auto">
            {this.state.error.message}
          </code>
        )}

        <button
          onClick={this.handleReset}
          className="btn-secondary mt-6"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    )
  }
}
