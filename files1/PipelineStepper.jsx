/**
 * components/ui/PipelineStepper.jsx
 * ───────────────────────────────────
 * Horizontal step indicator showing Upload → Transcribe → Translate → Summarize.
 */

import React from 'react'
import { Check, Loader2, AlertCircle, Upload, FileText, Languages, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { STATUS } from '../../hooks/useMeeting'

const STEPS = [
  { key: 'upload',     label: 'Upload',     icon: Upload },
  { key: 'transcribe', label: 'Transcribe', icon: FileText },
  { key: 'translate',  label: 'Translate',  icon: Languages },
  { key: 'summarize',  label: 'Summarize',  icon: Sparkles },
]

export default function PipelineStepper({ statuses }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const status = statuses[step.key]
        const isLast = i === STEPS.length - 1

        return (
          <React.Fragment key={step.key}>
            <StepNode step={step} status={status} />
            {!isLast && <StepConnector status={status} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StepNode({ step, status }) {
  const Icon = step.icon

  const ringClass = {
    [STATUS.IDLE]:    'border-navy-600 bg-navy-800',
    [STATUS.LOADING]: 'border-amber-500 bg-amber-500/10',
    [STATUS.DONE]:    'border-emerald-500 bg-emerald-500/10',
    [STATUS.ERROR]:   'border-rose-500 bg-rose-500/10',
  }[status]

  const iconEl = {
    [STATUS.IDLE]:    <Icon size={14} className="text-slate-600" />,
    [STATUS.LOADING]: <Loader2 size={14} className="text-amber-400 animate-spin" />,
    [STATUS.DONE]:    <Check size={14} className="text-emerald-400" />,
    [STATUS.ERROR]:   <AlertCircle size={14} className="text-rose-400" />,
  }[status]

  const labelClass = {
    [STATUS.IDLE]:    'text-slate-600',
    [STATUS.LOADING]: 'text-amber-400',
    [STATUS.DONE]:    'text-emerald-400',
    [STATUS.ERROR]:   'text-rose-400',
  }[status]

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
      <div className={clsx(
        'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
        ringClass
      )}>
        {iconEl}
      </div>
      <span className={clsx('text-xs font-mono transition-colors duration-300', labelClass)}>
        {step.label}
      </span>
    </div>
  )
}

function StepConnector({ status }) {
  return (
    <div className="flex-1 h-px mt-[-12px]">
      <div className={clsx(
        'h-full transition-all duration-500',
        status === STATUS.DONE
          ? 'bg-emerald-500/40'
          : 'bg-navy-600/60'
      )} />
    </div>
  )
}
