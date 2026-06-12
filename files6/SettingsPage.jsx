/**
 * pages/SettingsPage.jsx
 * ───────────────────────
 * User-facing settings panel:
 *  - Backend connection info
 *  - Default language for translation
 *  - Whisper model size info
 *  - Auto-run pipeline toggle
 *  - Theme preferences stored in localStorage
 */

import React, { useState, useEffect } from 'react'
import {
  Settings, Server, Languages, Cpu, ToggleLeft,
  ToggleRight, CheckCircle2, AlertCircle, RefreshCw,
  Info, ChevronDown, Save,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { checkHealth } from '../services/api'

const STORAGE_KEY = 'meeting_copilot_settings'

const DEFAULTS = {
  defaultLanguage:  'en',
  autoRunPipeline:  true,
  whisperModelInfo: 'base',
  showSourceChunks: true,
  compactSidebar:   false,
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
]

const WHISPER_MODELS = [
  { id: 'tiny',   size: '75 MB',  speed: '~10× RT', quality: 'Low — dev only' },
  { id: 'base',   size: '145 MB', speed: '~7× RT',  quality: 'OK — good for demos' },
  { id: 'small',  size: '465 MB', speed: '~4× RT',  quality: 'Good — recommended' },
  { id: 'medium', size: '1.5 GB', speed: '~2× RT',  quality: 'Great — production' },
  { id: 'large',  size: '3 GB',   speed: '~1× RT',  quality: 'Best — GPU recommended' },
]

function Section({ title, icon, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50">
        <div className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600/60
                        flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-navy-700/30 last:border-0">
      <div>
        <p className="text-sm text-slate-200 font-medium">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="shrink-0 mt-0.5"
      >
        {value
          ? <ToggleRight size={24} className="text-amber-400" />
          : <ToggleLeft  size={24} className="text-slate-600" />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    } catch {
      return DEFAULTS
    }
  })
  const [healthStatus, setHealthStatus] = useState('checking')
  const [backendUrl,   setBackendUrl]   = useState(
    window.location.protocol + '//' + window.location.hostname + ':8000'
  )

  // Check backend health on mount
  useEffect(() => {
    checkHealth()
      .then(() => setHealthStatus('connected'))
      .catch(() => setHealthStatus('disconnected'))
  }, [])

  const update = (key, val) => setSettings((p) => ({ ...p, [key]: val }))

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    toast.success('Settings saved')
  }

  const reset = () => {
    setSettings(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
    toast.success('Settings reset to defaults')
  }

  const recheck = () => {
    setHealthStatus('checking')
    checkHealth()
      .then(() => setHealthStatus('connected'))
      .catch(() => setHealthStatus('disconnected'))
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <p className="section-label mb-1">Configuration</p>
        <h1 className="font-display text-2xl text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Preferences are saved in your browser.</p>
      </div>

      {/* Backend connection */}
      <Section title="Backend connection" icon={<Server size={13} className="text-teal-400" />}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              healthStatus === 'connected'    && 'bg-emerald-400',
              healthStatus === 'disconnected' && 'bg-rose-400',
              healthStatus === 'checking'     && 'bg-amber-400 animate-pulse',
            )} />
            <span className="text-sm text-slate-300 font-mono">{backendUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'badge text-xs',
              healthStatus === 'connected'    && 'badge-green',
              healthStatus === 'disconnected' && 'badge-rose',
              healthStatus === 'checking'     && 'badge-amber',
            )}>
              {healthStatus}
            </span>
            <button onClick={recheck} className="btn-ghost px-2 py-1 text-xs">
              <RefreshCw size={11} />
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-navy-900/60 rounded-lg border border-navy-700/50">
          <p className="text-xs text-slate-500 font-mono space-y-1">
            <span className="block">API Docs: <a href={`${backendUrl}/docs`} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">{backendUrl}/docs</a></span>
            <span className="block">Health:   <a href={`${backendUrl}/health`} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">{backendUrl}/health</a></span>
          </p>
        </div>
      </Section>

      {/* Default language */}
      <Section title="Translation" icon={<Languages size={13} className="text-blue-400" />}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-mono mb-1.5 block">
              Default target language
            </label>
            <div className="relative">
              <select
                value={settings.defaultLanguage}
                onChange={(e) => update('defaultLanguage', e.target.value)}
                className="input-base pr-8 appearance-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </Section>

      {/* Whisper model info */}
      <Section title="Whisper model" icon={<Cpu size={13} className="text-purple-400" />}>
        <p className="text-xs text-slate-500 mb-3">
          The model is set in <code className="font-mono bg-navy-700 px-1.5 py-0.5 rounded">backend/.env</code> via{' '}
          <code className="font-mono bg-navy-700 px-1.5 py-0.5 rounded">WHISPER_MODEL_SIZE</code>.
          Restart the backend after changing it.
        </p>
        <div className="space-y-2">
          {WHISPER_MODELS.map((m) => (
            <div
              key={m.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg border text-xs',
                settings.whisperModelInfo === m.id
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-navy-700/50 bg-navy-800/40'
              )}
              onClick={() => update('whisperModelInfo', m.id)}
              style={{ cursor: 'pointer' }}
            >
              <span className={clsx(
                'font-mono font-medium w-14',
                settings.whisperModelInfo === m.id ? 'text-amber-400' : 'text-slate-400'
              )}>{m.id}</span>
              <span className="text-slate-600 w-16">{m.size}</span>
              <span className="text-slate-500 w-16">{m.speed}</span>
              <span className="text-slate-500 flex-1">{m.quality}</span>
              {settings.whisperModelInfo === m.id && (
                <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* UI preferences */}
      <Section title="Interface" icon={<Settings size={13} className="text-slate-400" />}>
        <Toggle
          label="Auto-run pipeline"
          description="Automatically run transcribe → translate → summarize after upload"
          value={settings.autoRunPipeline}
          onChange={(v) => update('autoRunPipeline', v)}
        />
        <Toggle
          label="Show RAG source chunks"
          description="Display retrieved transcript excerpts below each chat answer"
          value={settings.showSourceChunks}
          onChange={(v) => update('showSourceChunks', v)}
        />
        <Toggle
          label="Compact sidebar"
          description="Hide meeting names in the sidebar history list"
          value={settings.compactSidebar}
          onChange={(v) => update('compactSidebar', v)}
        />
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={save}  className="btn-primary">
          <Save size={14} /> Save settings
        </button>
        <button onClick={reset} className="btn-secondary text-xs">
          Reset to defaults
        </button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2.5 text-xs text-slate-600 p-3
                      bg-navy-800/40 border border-navy-700/40 rounded-lg">
        <Info size={13} className="shrink-0 mt-0.5 text-slate-700" />
        Settings are stored in your browser's localStorage and don't affect the backend.
        To change server-side settings (model size, API keys), edit <code className="font-mono">backend/.env</code>.
      </div>
    </div>
  )
}
