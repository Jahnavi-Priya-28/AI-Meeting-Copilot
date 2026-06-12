/**
 * components/ui/ChatPanel.jsx
 * ────────────────────────────
 * RAG-powered chat interface for asking questions about the meeting.
 */

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Loader2, Bot, User, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { askQuestion } from '../../services/api'

const SUGGESTED_QUESTIONS = [
  'What were the main decisions made?',
  'Who is responsible for follow-up tasks?',
  'What deadlines were mentioned?',
  'Summarise the key disagreements.',
]

export default function ChatPanel({ meetingId, hasTranscript }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || loading || !meetingId) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await askQuestion(meetingId, q)
      setMessages((prev) => [
        ...prev,
        {
          role:    'assistant',
          content: res.answer,
          sources: res.source_chunks,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: `Error: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!hasTranscript) return null

  return (
    <div className="card flex flex-col animate-slide-up" style={{ height: '480px' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20
                        flex items-center justify-center">
          <MessageSquare size={13} className="text-rose-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Ask Your Meeting</h3>
        <span className="badge-rose ml-auto">RAG · GPT</span>
      </div>

      {/* ── Messages ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 text-center font-mono">
              — Ask anything about this meeting —
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs px-3 py-2 rounded-lg
                             bg-navy-700/50 border border-navy-600/50
                             text-slate-400 hover:text-slate-200 hover:border-amber-500/30
                             hover:bg-amber-500/5 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20
                            flex items-center justify-center">
              <Bot size={12} className="text-rose-400" />
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((j) => (
                <span
                  key={j}
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${j * 200}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-navy-700/50 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about the meeting…"
            className="input-base flex-1"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 py-2"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
        <p className="text-xs text-slate-700 mt-2 font-mono">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const [showSources, setShowSources] = useState(false)
  const isUser      = msg.role === 'user'
  const isAssistant = msg.role === 'assistant'
  const isError     = msg.role === 'error'

  return (
    <div className={clsx('flex items-start gap-2.5 animate-slide-up', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-full shrink-0 border flex items-center justify-center',
        isUser      && 'bg-amber-500/10 border-amber-500/30',
        isAssistant && 'bg-rose-500/10 border-rose-500/20',
        isError     && 'bg-rose-800/30 border-rose-600/30',
      )}>
        {isUser
          ? <User size={12} className="text-amber-400" />
          : <Bot  size={12} className="text-rose-400" />}
      </div>

      {/* Bubble */}
      <div className={clsx(
        'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
        isUser      && 'bg-amber-500/10 border border-amber-500/20 text-slate-200',
        isAssistant && 'bg-navy-700/70 border border-navy-600/50 text-slate-300',
        isError     && 'bg-rose-900/30 border border-rose-700/30 text-rose-400',
      )}>
        {msg.content}

        {/* Source chunks toggle */}
        {isAssistant && msg.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-navy-600/40">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showSources ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {msg.sources.length} source excerpt{msg.sources.length > 1 ? 's' : ''}
            </button>
            {showSources && (
              <div className="mt-2 space-y-1.5">
                {msg.sources.map((chunk, i) => (
                  <div
                    key={i}
                    className="text-xs bg-navy-900/60 border border-navy-600/40
                               rounded-lg p-2 text-slate-500 font-mono leading-relaxed"
                  >
                    <span className="text-amber-600 mr-1">#{i + 1}</span>
                    {chunk.length > 200 ? chunk.slice(0, 200) + '…' : chunk}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
