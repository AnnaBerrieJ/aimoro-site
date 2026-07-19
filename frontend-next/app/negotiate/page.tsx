'use client'

import { useEffect, useState } from 'react'
import { getSavedSuppliers } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'
import { markOnboarding } from '@/components/OnboardingChecklist'

// ── Templates ─────────────────────────────────────────────────────────────────

interface Template {
  id: string
  label: string
  icon: string
  notes: string
  prompt: string
}

const TEMPLATES: Template[] = [
  {
    id: 'first-contact',
    label: 'First Contact',
    icon: '',
    notes: 'This is my first time reaching out. I am an ecommerce seller looking for a reliable long-term supplier.',
    prompt: 'Write a professional first-contact introduction email. Be warm, brief, and express genuine interest in a long-term partnership.',
  },
  {
    id: 'sample-request',
    label: 'Sample Request',
    icon: '',
    notes: 'I would like to order product samples before committing to a bulk order. Please include sample cost and shipping options.',
    prompt: 'Write a concise sample request email. Ask about sample cost, lead time, and shipping. Mention interest in bulk orders if quality is confirmed.',
  },
  {
    id: 'price-negotiation',
    label: 'Price Negotiation',
    icon: '',
    notes: 'I have quotes from competing suppliers. I prefer this supplier but need a better price to proceed.',
    prompt: 'Write a firm but respectful price negotiation email. Reference competitor pricing implicitly, emphasise order volume, and ask for their best price.',
  },
  {
    id: 'bulk-order',
    label: 'Bulk Order',
    icon: '',
    notes: 'I am ready to place a large bulk order. I need confirmation of stock availability, production lead time, and shipping options.',
    prompt: 'Write a bulk order enquiry email. Ask about stock availability, lead time, packaging options, and preferred payment method.',
  },
  {
    id: 'payment-terms',
    label: 'Payment Terms',
    icon: '',
    notes: 'I would like to discuss payment terms — specifically whether 30% upfront and 70% on delivery is acceptable.',
    prompt: 'Write a professional email to negotiate payment terms. Propose 30/70 split or trade credit, and explain that flexible terms will enable larger and more frequent orders.',
  },
]

// ── History helpers ───────────────────────────────────────────────────────────

const HISTORY_KEY = 'aimoro_negotiate_history'
const MAX_HISTORY = 10

interface DraftEntry {
  supplierName: string
  supplierId: number
  targetPrice: number
  orderQty: number
  deliveryDays: number
  message: string
  createdAt: string
}

function loadHistory(): DraftEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function addToHistory(entry: DraftEntry) {
  const prev = loadHistory()
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, MAX_HISTORY)))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NegotiatePage() {
  const [suppliers, setSuppliers]   = useState<SavedSupplier[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [targetPrice, setTargetPrice] = useState(0)
  const [orderQty, setOrderQty]     = useState(500)
  const [deliveryDays, setDeliveryDays] = useState(14)
  const [notes, setNotes]           = useState('')
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null)
  const [drafting, setDrafting]     = useState(false)
  const [draft, setDraft]           = useState('')
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)
  const [history, setHistory]       = useState<DraftEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    getSavedSuppliers()
      .then(data => {
        setSuppliers(data)
        if (data.length > 0) setTargetPrice(Math.max(data[0].unit_price * 0.85, 0.01))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    setHistory(loadHistory())
  }, [])

  const supplier = suppliers[selectedIdx]

  function handleSelect(idx: number) {
    setSelectedIdx(idx)
    setTargetPrice(Math.max(suppliers[idx].unit_price * 0.85, 0.01))
    setDraft('')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDraft() {
    setDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier, targetPrice, orderQty, deliveryDays, notes, templatePrompt: activeTemplate?.prompt }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setDraft(data.message)
      markOnboarding('negotiated')
      const entry: DraftEntry = {
        supplierName: supplier.name,
        supplierId: supplier.saved_id,
        targetPrice, orderQty, deliveryDays,
        message: data.message,
        createdAt: new Date().toLocaleString(),
      }
      addToHistory(entry)
      setHistory(loadHistory())
    } catch {
      setError('Failed to generate draft. Check your OPENAI_API_KEY is set.')
    } finally {
      setDrafting(false)
    }
  }

  function restoreDraft(entry: DraftEntry) {
    setDraft(entry.message)
    setHistoryOpen(false)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">AI-Powered</p>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Negotiate</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aimoro AI drafts a negotiation message based on a saved supplier and your target terms.
            Review and edit it, then send it yourself.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setHistoryOpen(h => !h)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all flex-shrink-0 ${
              historyOpen ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History ({history.length})
          </button>
        )}
      </div>

      {/* History panel */}
      {historyOpen && history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-bold text-[#0f172a]">Past Drafts</p>
            <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a] truncate">{h.supplierName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ${h.targetPrice} target · {h.orderQty} units · {h.deliveryDays}d · {h.createdAt}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{h.message.slice(0, 120)}…</p>
                  </div>
                  <button
                    onClick={() => restoreDraft(h)}
                    className="text-xs font-semibold text-[#c40000] hover:underline flex-shrink-0"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="animate-pulse">
          <div className="bg-white rounded-[18px] border border-slate-100 p-6 h-48" />
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm font-medium">
          Save a supplier first (Find Suppliers → Save) to negotiate with them.
        </div>
      )}

      {supplier && (
        <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <select value={selectedIdx} onChange={e => handleSelect(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30">
              {suppliers.map((s, i) => (
                <option key={s.saved_id} value={i}>{s.name} ({s.platform}, ${s.unit_price})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target price ($)</label>
              <input type="number" min={0.01} step={0.01} value={targetPrice}
                onChange={e => setTargetPrice(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Order quantity</label>
              <input type="number" min={1} value={orderQty} onChange={e => setOrderQty(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target delivery (days)</label>
              <input type="number" min={1} value={deliveryDays} onChange={e => setDeliveryDays(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30" />
            </div>
          </div>

          {/* Template picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Email type</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (activeTemplate?.id === t.id) {
                      setActiveTemplate(null)
                      setNotes('')
                    } else {
                      setActiveTemplate(t)
                      setNotes(t.notes)
                    }
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    activeTemplate?.id === t.id
                      ? 'bg-[#0f172a] text-white border-[#0f172a]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Additional asks or context (optional)</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. first-time buyer, want a sample before committing"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 resize-none" />
          </div>

          <button onClick={handleDraft} disabled={drafting}
            className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all disabled:opacity-60">
            {drafting ? 'Drafting…' : 'Draft Negotiation Message'}
          </button>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        </div>
      )}

      {draft && (
        <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#111827]">Drafted Message</h2>
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                copied ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'}`}>
              {copied ? (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
              )}
            </button>
          </div>
          <textarea rows={12} value={draft} onChange={e => setDraft(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 resize-none font-mono" />
          <p className="text-xs text-gray-400">Copy this into an email or the platform's messaging tool to send it yourself.</p>
        </div>
      )}
    </div>
  )
}
