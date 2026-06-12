/**
 * components/ui/TranscriptPanel.jsx
 * ────────────────────────────────────
 * Shows raw transcript and translated text side by side (or stacked).
 */

import React, { useState } from 'react'
import { FileText, Languages, Copy, CheckCheck, Clock, Globe } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { STATUS } from '../../hooks/useMeeting'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="btn-ghost px-2 py-1 text-xs">
      {copied
        ? <><CheckCheck size={12} className="text-emerald-400" /> Copied</>
        : <><Copy size={12} /> Copy</>}
    </button>
  )
}

function SkeletonBlock({ lines = 6 }) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded"
          style={{ width: `${65 + Math.random() * 35}%` }}
        />
      ))}
    </div>
  )
}

export default function TranscriptPanel({
  transcript, transcribeStatus,
  translatedText, translateStatus,
  detectedLanguage, targetLanguage, durationSeconds,
}) {
  const [activeTab, setActiveTab] = useState('original')

  const hasTranscript  = !!transcript
  const hasTranslation = !!translatedText

  const isTranscribing = transcribeStatus === STATUS.LOADING
  const isTranslating  = translateStatus  === STATUS.LOADING

  if (transcribeStatus === STATUS.IDLE && !hasTranscript) return null

  const activeText = activeTab === 'original' ? transcript : translatedText

  return (
    <div className="card animate-slide-up">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-navy-700/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20
                          flex items-center justify-center">
            <FileText size={13} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Transcript</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {detectedLanguage && (
                <span className="badge-slate text-[10px]">
                  <Globe size={9} /> {detectedLanguage.toUpperCase()}
                </span>
              )}
              {durationSeconds && (
                <span className="badge-slate text-[10px]">
                  <Clock size={9} /> {Math.round(durationSeconds / 60)}m {Math.round(durationSeconds % 60)}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-navy-900/60 rounded-lg p-1">
          <TabButton
            active={activeTab === 'original'}
            onClick={() => setActiveTab('original')}
            icon={<FileText size={11} />}
            label="Original"
          />
          <TabButton
            active={activeTab === 'translated'}
            onClick={() => setActiveTab('translated')}
            icon={<Languages size={11} />}
            label={`→ ${(targetLanguage || 'en').toUpperCase()}`}
            disabled={!hasTranslation && !isTranslating}
            loading={isTranslating}
          />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative">
        {/* Copy button */}
        {activeText && (
          <div className="absolute top-2 right-3 z-10">
            <CopyButton text={activeText} />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto p-5">
          {isTranscribing && activeTab === 'original' ? (
            <SkeletonBlock lines={7} />
          ) : isTranslating && activeTab === 'translated' ? (
            <SkeletonBlock lines={7} />
          ) : activeText ? (
            <p className="transcript-text pr-16">{activeText}</p>
          ) : (
            <p className="text-slate-600 text-sm italic">
              {activeTab === 'translated'
                ? 'Translation not yet available — run Translate step'
                : 'No transcript yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
        active
          ? 'bg-navy-700 text-slate-200 shadow-sm'
          : 'text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
      )}
    >
      {loading
        ? <span className="w-2.5 h-2.5 rounded-full border border-amber-400 border-t-transparent animate-spin" />
        : icon}
      {label}
    </button>
  )
}
