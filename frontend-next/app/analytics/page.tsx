'use client'

import { useEffect, useState } from 'react'
import { getSavedSuppliers } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'
import { MetricCard } from '@/components/MetricCard'
import { PlatformPieChart, PriceBarChart } from '@/components/charts/SupplierCharts'

export default function AnalyticsPage() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSavedSuppliers()
      .then(setSuppliers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avgPrice = suppliers.length
    ? (suppliers.reduce((s, x) => s + x.unit_price, 0) / suppliers.length).toFixed(2)
    : null

  const platforms = new Set(suppliers.map(s => s.platform)).size

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Insights</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Analytics</h1>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">
          Save suppliers first to see analytics here.
        </div>
      )}

      {suppliers.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Saved Suppliers" value={suppliers.length} />
            <MetricCard label="Active Platforms" value={platforms} />
            <MetricCard label="Average Saved Price" value={avgPrice ? `$${avgPrice}` : '—'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Platform Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Saved suppliers by platform</p>
              <PlatformPieChart suppliers={suppliers} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Price Comparison</h3>
              <p className="text-xs text-slate-400 mb-4">Unit price by supplier</p>
              <PriceBarChart suppliers={suppliers} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Supplier', 'Platform', 'Country', 'Price', 'Rating', 'Score'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.saved_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#0f172a]">{s.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.platform}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.country}</td>
                    <td className="px-5 py-3.5 font-semibold">${s.unit_price}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.rating}</td>
                    <td className="px-5 py-3.5 font-bold text-[#c40000]">
                      {s.aimoro_score != null ? `${s.aimoro_score}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
