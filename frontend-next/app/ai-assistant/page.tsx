'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What should I look for in a verified Alibaba supplier?',
  'How do I negotiate MOQ with a new supplier?',
  'What are the biggest red flags when sourcing from AliExpress?',
  'How do I protect myself from supplier fraud?',
]

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c40000] to-[#7f0000] flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-[#0f172a] text-white rounded-tr-sm'
          : 'bg-white border border-slate-100 text-[#0f172a] shadow-sm rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c40000] to-[#7f0000] flex items-center justify-center shadow-sm flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    setError('')

    const newMessages: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch {
      setError('Failed to get a response. Check your OPENAI_API_KEY is set.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Powered by OpenAI</p>
            <h1 className="text-2xl font-extrabold text-[#0f172a]">AI Sourcing Assistant</h1>
            <p className="text-sm text-slate-500 mt-1">Ask anything about suppliers, pricing, negotiation, and risk.</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError('') }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
        {isEmpty && (
          <div className="pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Try asking</p>
            <div className="space-y-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="w-full text-left text-sm text-slate-600 bg-white border border-slate-100 hover:border-[#c40000]/30 hover:text-[#c40000] px-4 py-3 rounded-xl shadow-sm transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-8 pb-8 pt-3 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-[#c40000]/40 focus-within:ring-2 focus-within:ring-[#c40000]/10 transition-all">
          <textarea
            ref={textareaRef}
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a sourcing question…"
            className="w-full px-4 pt-3 pb-1 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none resize-none bg-transparent rounded-t-2xl"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-xs text-slate-400">⌘ + Enter to send</p>
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 bg-[#c40000] hover:bg-[#a30000] disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-[0_4px_14px_rgba(196,0,0,0.3)] transition-all hover:-translate-y-px"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
