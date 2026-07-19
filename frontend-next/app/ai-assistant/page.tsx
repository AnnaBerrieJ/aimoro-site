'use client'

import { useState } from 'react'

const SUGGESTIONS = [
  'What should I look for in a verified Alibaba supplier?',
  'How do I negotiate MOQ with a new supplier?',
  'What are the biggest red flags when sourcing from AliExpress?',
  'How do I protect myself from supplier fraud?',
]

export default function AIAssistantPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAsk(q?: string) {
    const text = q ?? question
    if (!text.trim()) return
    if (q) setQuestion(q)
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setAnswer(data.answer)
    } catch {
      setError('Failed to get a response. Check your OPENAI_API_KEY is set.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Powered by OpenAI</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">AI Sourcing Assistant</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ask anything about suppliers, pricing, negotiation, Alibaba, AliExpress, and sourcing risk.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <textarea
          rows={4}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAsk() }}
          placeholder="Ask a sourcing question…"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c40000]/20 focus:border-[#c40000]/40 resize-none transition"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">⌘ + Enter to send</p>
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 bg-[#c40000] hover:bg-[#a30000] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(196,0,0,0.3)] transition-all hover:-translate-y-px"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking…
              </>
            ) : 'Ask Aimoro AI'}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {!answer && !loading && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Try asking</p>
          <div className="space-y-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleAsk(s)}
                className="w-full text-left text-sm text-slate-600 bg-white border border-slate-100 hover:border-[#c40000]/30 hover:text-[#c40000] px-4 py-3 rounded-xl shadow-sm transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {/* Answer */}
      {answer && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c40000] to-[#7f0000] flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#c40000] uppercase tracking-wider">Aimoro AI</span>
          </div>
          <p className="text-sm text-[#0f172a] leading-relaxed whitespace-pre-wrap">{answer}</p>
          <button
            onClick={() => { setAnswer(''); setQuestion('') }}
            className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Ask another question
          </button>
        </div>
      )}
    </div>
  )
}
