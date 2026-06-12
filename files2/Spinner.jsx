/**
 * components/ui/Spinner.jsx
 * ──────────────────────────
 * Reusable loading spinner with optional label.
 * Sizes: sm | md | lg
 */

import React from 'react'
import clsx from 'clsx'

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-12 h-12 border-[3px]',
}

export default function Spinner({ size = 'md', label, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div className={clsx(
        'rounded-full border-navy-600 border-t-amber-500 animate-spin',
        sizes[size]
      )} />
      {label && (
        <p className="text-xs text-slate-500 font-mono animate-pulse">{label}</p>
      )}
    </div>
  )
}
