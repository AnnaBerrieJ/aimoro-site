'use client'

import { useEffect, useState } from 'react'
import type { Supplier } from '@/lib/types'
import { RiskBadge } from './RiskBadge'
import { ScoreBox } from './ScoreBox'

interface Props {
  supplier: Supplier | null
  onClose: () => void
  onSave: (supplier: Supplier) => void
  saving?: boolean
}

export function SupplierDrawer({ supplier, onClose, onSave, saving }: Props) {
  const [summary, setSummary] = useState('')
  const [summarising, setSummarising] = useState(false)
  const [prevId, setPrevId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset summary when supplier changes
  useEffect(() => {
    if (supplier?.id !== prevId) {
      setSummary('')
      setSummarising(false)
      setPrevId(supplier?.id ?? null)
    }
  }, [supplier, prevId])

  async function getSummary() {
    if (!supplier) return
    setSummarising(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Give me a 3-sentence supplier assessment for: ${supplier.name} on ${supplier.platform}. Price: $${supplier.unit_price}, MOQ: ${supplier.minimum_order_quantity}, Rating: ${supplier.rating}, Delivery: ${supplier.delivery_days} days, Risk: ${supplier.risk_level}, Score: ${supplier.aimoro_score}%. Be direct and practical.`
          }]
        }),
      })
      const data = await res.json()
      setSummary(data.answer ?? '')
    } catch {
      setSummary('Could not generate summary.')
    } finally {
      setSummarising(false)
    }
  }

  const isOpen = supplier !== null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {!supplier ? null : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="min-w-0">
                <span className="inline-block bg-[#fff1f1] text-[#c40000] text-xs font-bold px-3 py-1 rounded-full border border-[#c40000]/10 mb-2">
                  {supplier.platform}
                </span>
                <h2 className="font-extrabold text-[#0f172a] text-lg leading-tight">{supplier.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{supplier.country} · {supplier.product}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Score + Risk */}
              <div className="flex items-center gap-4">
                <ScoreBox score={supplier.aimoro_score} />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Risk Level</p>
                  <RiskBadge risk={supplier.risk_level} />
                  {supplier.verified && (
                    <p className="text-xs text-green-600 font-semibold mt-1.5">✓ Verified Supplier</p>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Unit Price', value: `$${supplier.unit_price}` },
                  { label: 'Min. Order Qty', value: `${supplier.minimum_order_quantity} units` },
                  { label: 'Rating', value: `★ ${supplier.rating}` },
                  { label: 'Delivery Time', value: `${supplier.delivery_days} days` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="font-bold text-[#0f172a]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Recommendation */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Aimoro Recommendation</p>
                <p className="text-sm text-blue-800 leading-relaxed">{supplier.recommendation}</p>
              </div>

              {/* AI Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">AI Assessment</p>
                  {!summary && (
                    <button
                      onClick={getSummary}
                      disabled={summarising}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#c40000] border border-[#c40000]/30 px-3 py-1.5 rounded-lg hover:bg-[#fff1f1] transition-colors disabled:opacity-50"
                    >
                      {summarising ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Analysing…
                        </>
                      ) : '✦ Get AI summary'}
                    </button>
                  )}
                </div>
                {summary ? (
                  <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-xl p-4">
                    <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
                    <button onClick={() => setSummary('')} className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">Regenerate</button>
                  </div>
                ) : (
                  !summarising && <p className="text-xs text-slate-400">Click "Get AI summary" for an instant assessment of this supplier.</p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button
                onClick={() => onSave(supplier)}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all disabled:opacity-60 text-sm"
              >
                {saving ? 'Saving…' : 'Save Supplier'}
              </button>
              <a
                href={supplier.supplier_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm font-semibold text-[#c40000] border border-[#c40000]/30 py-2.5 rounded-xl hover:bg-[#fff1f1] transition-colors"
              >
                View on {supplier.platform}
              </a>
            </div>
          </>
        )}
      </div>
    </>
  )
}
