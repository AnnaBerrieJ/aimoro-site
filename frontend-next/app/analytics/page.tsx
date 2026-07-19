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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-[#111827]">Analytics</h1>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm font-medium">
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
            <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
              <h3 className="font-bold text-[#111827] mb-4">Saved Suppliers by Platform</h3>
              <PlatformPieChart suppliers={suppliers} />
            </div>
            <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
              <h3 className="font-bold text-[#111827] mb-4">Saved Supplier Prices</h3>
              <PriceBarChart suppliers={suppliers} />
            </div>
          </div>

          {/* Data table */}
          <div className="bg-white rounded-[18px] border border-[#e5e7eb] overflow-x-auto shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Supplier', 'Platform', 'Country', 'Price', 'Rating', 'Score'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.saved_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-[#111827]">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.platform}</td>
                    <td className="px-4 py-3 text-gray-600">{s.country}</td>
                    <td className="px-4 py-3 font-semibold">${s.unit_price}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rating}</td>
                    <td className="px-4 py-3 font-bold text-[#c40000]">{s.aimoro_score}%</td>
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
