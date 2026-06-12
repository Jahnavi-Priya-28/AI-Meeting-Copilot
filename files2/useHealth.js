/**
 * hooks/useHealth.js
 * ───────────────────
 * Polls the backend /health endpoint every 15 seconds.
 * Returns { status: 'connected' | 'disconnected' | 'checking' }
 * Used by the ConnectionBanner component.
 */

import { useState, useEffect, useCallback } from 'react'
import { checkHealth } from '../services/api'

export function useHealth(pollInterval = 15_000) {
  const [status, setStatus] = useState('checking')  // 'checking' | 'connected' | 'disconnected'
  const [lastChecked, setLastChecked] = useState(null)

  const ping = useCallback(async () => {
    try {
      await checkHealth()
      setStatus('connected')
    } catch {
      setStatus('disconnected')
    } finally {
      setLastChecked(new Date())
    }
  }, [])

  useEffect(() => {
    ping()                                              // Immediate check on mount
    const id = setInterval(ping, pollInterval)
    return () => clearInterval(id)
  }, [ping, pollInterval])

  return { status, lastChecked, retry: ping }
}
