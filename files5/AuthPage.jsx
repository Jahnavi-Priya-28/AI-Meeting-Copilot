/**
 * pages/AuthPage.jsx
 * ───────────────────
 * Combined Login / Register page.
 * Toggle between modes with the tab switcher.
 * On success, the parent App redirects to the dashboard.
 */

import React, { useState } from 'react'
import { Mic2, Loader2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode,     setMode]     = useState('login')    // 'login' | 'register'
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)

  // Form fields
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        await register(name, email, password)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(36,51,88,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(36,51,88,0.5) 1px,transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40
                          flex items-center justify-center mb-4">
            <Mic2 size={28} className="text-amber-400" />
          </div>
          <h1 className="font-display text-2xl text-slate-100">Meeting Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered meeting intelligence</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-navy-900/60 rounded-lg p-1">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={clsx(
                  'flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150',
                  mode === m
                    ? 'bg-amber-500 text-navy-950'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="animate-slide-up">
                <label className="text-xs text-slate-500 font-mono mb-1.5 block">Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="input-base pl-9"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 font-mono mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-base pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-mono mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                  className="input-base pl-9 pr-10"
                  required
                  minLength={mode === 'register' ? 6 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20
                            rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Demo hint */}
          <p className="text-xs text-slate-700 text-center font-mono">
            No account? Auth is optional — the app works without it.
          </p>
        </div>
      </div>
    </div>
  )
}
