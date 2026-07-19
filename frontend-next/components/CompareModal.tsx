'use client'

import { useEffect } from 'react'
import type { Supplier } from '@/lib/types'
import { RiskBadge } from './RiskBadge'

interface Props {
  suppliers: Supplier[]
  onClose: () => void
}

const ROWS: { label: string; key: keyof Supplier; format?: (v: unknown) => string }[] = [
  { label: 'Platform', key: 'platform' },
  { label: 'Country', key: 'country' },
  { label: 'Unit Price', key: 'unit_price', format: v => `$${v}` },
  { label: 'Min. Order Qty', key: 'minimum_order_quantity', format: v => `${v} units` },
  { label: 'Delivery', key: 'delivery_days', format: v => `${v} days` },
  { label: 'Rating', key: 'rating', format: v => `★ ${v}` },
  { label: 'Aimoro Score', key: 'aimoro_score', format: v => `${v}%` },
  { label: 'Verified', key: 'verified', format: v => v ? '✓ Yes' : '✗ No' },
]

function best(suppliers: Supplier[], key: keyof Supplier, lower = false): string {
  const vals = suppliers.map(s => s[key] as number)
  const target = lower ? Math.min(...vals) : Math.max(...vals)
  return suppliers.find(s => (s[key] as number) === target)?.id ?? ''
}

export function CompareModal({ suppliers, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const bestPrice = best(suppliers, 'unit_price', true)
  const bestScore = best(suppliers, 'aimoro_score', false)
  const bestRating = best(suppliers, 'rating', false)
  const bestDelivery = best(suppliers, 'delivery_days', true)

  function highlight(s: Supplier, key: keyof Supplier): boolean {
    if (key === 'unit_price') return s.id === bestPrice
    if (key === 'aimoro_score') return s.id === bestScore
    if (key === 'rating') return s.id === bestRating
    if (key === 'delivery_days') return s.id === bestDelivery
    return false
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-0.5">Side by side</p>
            <h2 className="text-lg font-extrabold text-[#0f172a]">Supplier Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide w-32">Metric</th>
                {suppliers.map(s => (
                  <th key={s.id} className="px-6 py-4 text-left">
                    <p className="font-extrabold text-[#0f172a] leading-tight">{s.name}</p>
                    <RiskBadge risk={s.risk_level} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ label, key, format }) => (
                <tr key={key as string} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</td>
                  {suppliers.map(s => {
                    const raw = s[key]
                    const isHighlight = highlight(s, key)
                    return (
                      <td key={s.id} className={`px-6 py-3.5 font-semibold ${isHighlight ? 'text-[#c40000]' : 'text-[#0f172a]'}`}>
                        {format ? format(raw) : String(raw ?? '—')}
                        {isHighlight && <span className="ml-1.5 text-[10px] bg-[#fff1f1] text-[#c40000] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Best</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Supplier URL row */}
              <tr className="border-b border-slate-50">
                <td className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide">Link</td>
                {suppliers.map(s => (
                  <td key={s.id} className="px-6 py-3.5">
                    {s.supplier_url ? (
                      <a
                        href={s.supplier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#c40000] hover:underline"
                      >
                        View on {s.platform} →
                      </a>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400"><span className="text-[#c40000] font-bold">Best</span> highlights the strongest value in each row. Press Esc to close.</p>
        </div>
      </div>
    </div>
  )
}
