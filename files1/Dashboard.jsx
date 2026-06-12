/**
 * pages/Dashboard.jsx
 * ────────────────────
 * Main dashboard: upload → pipeline controls → transcript → summary → chat.
 */

import React, { useState } from 'react'
import {
  FileAudio, Play, Languages, Sparkles,
  Loader2, RefreshCw, ChevronDown
} from 'lucide-react'
import clsx from 'clsx'
import { STATUS } from '../hooks/useMeeting'
import UploadZone      from '../components/ui/UploadZone'
import PipelineStepper from '../components/ui/PipelineStepper'
import TranscriptPanel from '../components/ui/TranscriptPanel'
import SummaryPanel    from '../components/ui/SummaryPanel'
import ChatPanel       from '../components/ui/ChatPanel'

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
]

export default function Dashboard({ meeting }) {
  const {
    // State
    meetingId, filename,
    uploadStatus, transcribeStatus, translateStatus, summarizeStatus,
    uploadProgress,
    transcript, detectedLanguage, durationSeconds,
    translatedText, targetLanguage,
    summary, keyPoints, actionItems,
    // Actions
    reset, runUpload, runTranscribe, runTranslate, runSummarize, runPipeline,
  } = meeting

  const [selectedLang, setSelectedLang] = useState('en')
  const [autoRun, setAutoRun]           = useState(true)

  // ── File drop handler ─────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (autoRun) {
      // Full pipeline automatically
      try {
        const id = await runUpload(file)
        await runTranscribe(id)
        await runTranslate(id, selectedLang)
        await runSummarize(id)
      } catch { /* errors already toasted in hook */ }
    } else {
      await runUpload(file)
    }
  }

  const stepStatuses = {
    upload:     uploadStatus,
    transcribe: transcribeStatus,
    translate:  translateStatus,
    summarize:  summarizeStatus,
  }

  const isAnyLoading = Object.values(stepStatuses).includes(STATUS.LOADING)

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-8 px-4 animate-fade-in">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-1">New Meeting</p>
          <h1 className="font-display text-2xl text-slate-100">
            AI Meeting Copilot
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload a recording to transcribe, translate, and summarize.
          </p>
        </div>

        {meetingId && (
          <button onClick={reset} className="btn-ghost text-xs">
            <RefreshCw size={13} /> New Meeting
          </button>
        )}
      </div>

      {/* ── Pipeline stepper ─────────────────────────────────────── */}
      <div className="card p-5">
        <PipelineStepper statuses={stepStatuses} />
      </div>

      {/* ── Upload zone + options ─────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="section-label">01 · Upload Audio</p>
          {/* Auto-run toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <div
              onClick={() => setAutoRun((v) => !v)}
              className={clsx(
                'w-8 h-4 rounded-full relative transition-colors duration-200 cursor-pointer',
                autoRun ? 'bg-amber-500' : 'bg-navy-600'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200',
                autoRun ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </div>
            Auto-run pipeline
          </label>
        </div>

        <UploadZone
          onFile={handleFile}
          status={uploadStatus}
          progress={uploadProgress}
          filename={filename}
          disabled={isAnyLoading}
        />

        {/* Language selector */}
        <div className="flex items-center gap-3">
          <Languages size={14} className="text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500">Translate to:</span>
          <div className="relative">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="input-base py-1.5 pr-7 text-xs appearance-none cursor-pointer w-36"
              disabled={isAnyLoading}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Manual step controls (shown when auto-run is off) ────── */}
      {!autoRun && uploadStatus === STATUS.DONE && (
        <div className="card p-5 space-y-3 animate-slide-up">
          <p className="section-label">02 · Run Steps Manually</p>
          <div className="grid grid-cols-3 gap-2">
            <StepButton
              label="Transcribe"
              icon={<Play size={13} />}
              status={transcribeStatus}
              onClick={() => runTranscribe(meetingId)}
              disabled={!meetingId || isAnyLoading || transcribeStatus === STATUS.DONE}
            />
            <StepButton
              label="Translate"
              icon={<Languages size={13} />}
              status={translateStatus}
              onClick={() => runTranslate(meetingId, selectedLang)}
              disabled={transcribeStatus !== STATUS.DONE || isAnyLoading || translateStatus === STATUS.DONE}
            />
            <StepButton
              label="Summarize"
              icon={<Sparkles size={13} />}
              status={summarizeStatus}
              onClick={() => runSummarize(meetingId)}
              disabled={transcribeStatus !== STATUS.DONE || isAnyLoading || summarizeStatus === STATUS.DONE}
            />
          </div>
        </div>
      )}

      {/* ── Transcript ───────────────────────────────────────────── */}
      <TranscriptPanel
        transcript={transcript}
        transcribeStatus={transcribeStatus}
        translatedText={translatedText}
        translateStatus={translateStatus}
        detectedLanguage={detectedLanguage}
        targetLanguage={selectedLang}
        durationSeconds={durationSeconds}
      />

      {/* ── Summary ──────────────────────────────────────────────── */}
      <SummaryPanel
        summary={summary}
        keyPoints={keyPoints}
        actionItems={actionItems}
        status={summarizeStatus}
      />

      {/* ── Chat Q&A ─────────────────────────────────────────────── */}
      <ChatPanel
        meetingId={meetingId}
        hasTranscript={!!transcript}
      />
    </div>
  )
}

function StepButton({ label, icon, status, onClick, disabled }) {
  const isLoading = status === STATUS.LOADING
  const isDone    = status === STATUS.DONE
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading || isDone}
      className={clsx(
        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium',
        'border transition-all duration-150',
        isDone
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
          : 'btn-secondary text-xs',
      )}
    >
      {isLoading ? <Loader2 size={13} className="animate-spin" /> : icon}
      {label}
    </button>
  )
}
