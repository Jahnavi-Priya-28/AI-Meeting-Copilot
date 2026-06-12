/**
 * components/ui/UploadZone.jsx
 * ─────────────────────────────
 * Drag-and-drop audio file upload with progress indicator.
 */

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileAudio, X, CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { STATUS } from '../../hooks/useMeeting'

const ACCEPTED = {
  'audio/mpeg': ['.mp3'],
  'audio/wav':  ['.wav'],
  'audio/wave': ['.wav'],
  'audio/ogg':  ['.ogg'],
  'audio/mp4':  ['.m4a'],
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function UploadZone({ onFile, status, progress, filename, disabled }) {
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: disabled || status === STATUS.LOADING || status === STATUS.DONE,
  })

  const isLoading = status === STATUS.LOADING
  const isDone    = status === STATUS.DONE
  const isError   = status === STATUS.ERROR

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer',
          'transition-all duration-300',
          isDragActive && !isDragReject && 'border-amber-500/70 bg-amber-500/5',
          isDragReject  && 'border-rose-500/70 bg-rose-500/5',
          isDone        && 'border-emerald-500/40 bg-emerald-500/5 cursor-default',
          isError       && 'border-rose-500/40',
          !isDragActive && !isDone && !isError && !disabled &&
            'border-navy-600/60 hover:border-amber-500/40 hover:bg-amber-500/3',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input {...getInputProps()} />

        {/* Icon area */}
        <div className="flex justify-center mb-4">
          {isLoading ? (
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30
                            flex items-center justify-center">
              <Loader2 size={24} className="text-amber-400 animate-spin" />
            </div>
          ) : isDone ? (
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30
                            flex items-center justify-center animate-fade-in">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
          ) : isDragActive ? (
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/50
                            flex items-center justify-center animate-pulse">
              <Upload size={24} className="text-amber-400" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-navy-700/80 border border-navy-600/60
                            flex items-center justify-center group-hover:border-amber-500/40">
              <FileAudio size={24} className="text-slate-500" />
            </div>
          )}
        </div>

        {/* Text */}
        {isDone ? (
          <div className="animate-fade-in">
            <p className="text-emerald-400 font-medium text-sm">{filename}</p>
            <p className="text-slate-500 text-xs mt-1">Uploaded successfully</p>
          </div>
        ) : isLoading ? (
          <div>
            <p className="text-amber-400 font-medium text-sm">Uploading…</p>
            <p className="text-slate-500 text-xs mt-1">{filename}</p>
          </div>
        ) : isDragActive ? (
          <p className="text-amber-400 font-medium text-sm">Drop it here</p>
        ) : (
          <div>
            <p className="text-slate-300 font-medium text-sm">
              Drop your audio file here
            </p>
            <p className="text-slate-600 text-xs mt-1">
              or click to browse · MP3, WAV, OGG, M4A · max 100 MB
            </p>
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {isLoading && (
        <div className="space-y-1 animate-fade-in">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono">Uploading</span>
            <span className="text-amber-400 font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
