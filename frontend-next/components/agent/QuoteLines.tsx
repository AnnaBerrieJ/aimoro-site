'use client'

import { bsd, type CustomerQuote } from '@/lib/agent'

export function QuoteLines({ quote }: { quote: CustomerQuote }) {
  const rows: [string, number][] = [
    ['Product (incl. shipping within China)', quote.product_cost_bsd],
    ['Shipping to your address', quote.shipping_bsd],
    ['Service fee', quote.service_fee_bsd],
  ]
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {rows.map(([label, v]) => (
        <div key={label} className="flex justify-between py-2">
          <dt className="text-slate-600">{label}</dt>
          <dd className="font-medium text-slate-900 tabular-nums">{bsd(v)}</dd>
        </div>
      ))}
      <div className="flex justify-between py-3">
        <dt className="font-bold text-slate-900">Total (BSD)</dt>
        <dd className="font-extrabold text-lg text-slate-900 tabular-nums">{bsd(quote.total_bsd)}</dd>
      </div>
    </dl>
  )
}
