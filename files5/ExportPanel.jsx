/**
 * components/ui/ExportPanel.jsx
 * ──────────────────────────────
 * Download meeting exports: PDF, DOCX, TXT, JSON, SRT.
 * Shows which formats are available and triggers browser downloads.
 */

import React, { useState, useEffect } from 'react'
import { Download, FileText, File, Code, Subtitles, Loader2, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { getExportFormats, exportMeeting } from '../../services/api'

const FORMAT_META = {
  pdf:  { icon: FileText, label: 'PDF Report',    desc: 'Formatted report with summary & transcript', color: 'text-rose-400' },
  docx: { icon: File,     label: 'Word Doc',      desc: 'Editable Word document',                    color: 'text-blue-400' },
  txt:  { icon: FileText, label: 'Plain Text',     desc: 'Simple text transcript',                    color: 'text-slate-400' },
  json: { icon: Code,     label: 'JSON',           desc: 'Full structured data export',               color: 'text-emerald-400' },
  srt:  { icon: FileText, label: 'SRT Subtitles', desc: 'Subtitle file (requires diarization)',      color: 'text-purple-400' },
}

export default function ExportPanel({ meetingId }) {
  const [formats,      setFormats]      = useState([])
  const [downloading,  setDownloading]  = useState({})
  const [downloaded,   setDownloaded]   = useState({})
  const [loadingList,  setLoadingList]  = useState(true)

  useEffect(() => {
    if (!meetingId) return
    setLoadingList(true)
    getExportFormats(meetingId)
      .then((res) => setFormats(res.formats || []))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }, [meetingId])

  const handleDownload = async (fmt) => {
    setDownloading((p) => ({ ...p, [fmt]: true }))
    try {
      const res  = await exportMeeting(meetingId, fmt)
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const cd   = res.headers['content-disposition'] || ''
      const name = cd.match(/filename="(.+?)"/)?.[1] || `meeting_export.${fmt}`
      a.href     = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloaded((p) => ({ ...p, [fmt]: true }))
      setTimeout(() => setDownloaded((p) => ({ ...p, [fmt]: false })), 3000)
    } catch (err) {
      console.error('Export failed:', err.message)
    } finally {
      setDownloading((p) => ({ ...p, [fmt]: false }))
    }
  }

  if (!meetingId) return null

  return (
    <div className="card animate-slide-up">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50">
        <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20
                        flex items-center justify-center">
          <Download size={13} className="text-green-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Export Meeting</h3>
      </div>

      <div className="p-4 space-y-2">
        {loadingList ? (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-slate-600" />
          </div>
        ) : formats.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-4">No formats available yet.</p>
        ) : (
          formats.map(({ format: fmt, available, note }) => {
            const meta    = FORMAT_META[fmt] || {}
            const Icon    = meta.icon || File
            const busy    = downloading[fmt]
            const done    = downloaded[fmt]

            return (
              <div
                key={fmt}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all duration-150',
                  available
                    ? 'border-navy-600/50 hover:border-amber-500/30 hover:bg-amber-500/3 cursor-pointer'
                    : 'border-navy-700/30 opacity-40 cursor-not-allowed'
                )}
                onClick={() => available && !busy && handleDownload(fmt)}
              >
                <Icon size={16} className={clsx(meta.color, 'shrink-0')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{meta.label || fmt.toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{note || meta.desc}</p>
                </div>
                <div className="shrink-0">
                  {busy ? (
                    <Loader2 size={14} className="animate-spin text-amber-400" />
                  ) : done ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : available ? (
                    <Download size={14} className="text-slate-500" />
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
