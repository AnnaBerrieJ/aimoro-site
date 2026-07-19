'use client'

import { useState } from 'react'

export default function AIAssistantPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">AI Sourcing Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask sourcing questions about suppliers, pricing, negotiation, Alibaba, AliExpress, and risk.
        </p>
      </div>

      <form onSubmit={handleAsk} className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Your question</label>
          <textarea
            rows={4}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Example: Which supplier is safest for a beginner ecommerce business?"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all disabled:opacity-60"
        >
          {loading ? 'Thinking…' : 'Ask Aimoro AI'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {answer && (
        <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c40000] to-[#950000] flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-xs font-bold text-[#c40000] uppercase tracking-wide">Aimoro AI</span>
          </div>
          <p className="text-sm text-[#111827] leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  )
}
