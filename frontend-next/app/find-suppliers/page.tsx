'use client'

import { useState } from 'react'
import { searchSuppliers, saveSupplier } from '@/lib/api'
import type { Supplier } from '@/lib/types'
import { MetricCard } from '@/components/MetricCard'
import { SupplierCard } from '@/components/SupplierCard'
import { RiskBadge } from '@/components/RiskBadge'
import {
  PriceBarChart,
  ScoreBarChart,
  PlatformPieChart,
  RiskBarChart,
} from '@/components/charts/SupplierCharts'

type Tab = 'results' | 'table' | 'analytics'

export default function FindSuppliersPage() {
  const [product, setProduct] = useState('Wireless Headphones')
  const [country, setCountry] = useState('China')
  const [maxPrice, setMaxPrice] = useState(100)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<Tab>('results')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const results = await searchSuppliers({ product, country, max_price: maxPrice, verified: verifiedOnly })
      setSuppliers(results)
      setTab('results')
    } catch {
      setError('Could not reach the backend. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(supplier: Supplier) {
    setSavingId(supplier.id)
    try {
      await saveSupplier(supplier.id)
      setToast(`${supplier.name} saved!`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('Could not save supplier.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSavingId(null)
    }
  }

  const avgPrice = suppliers.length
    ? (suppliers.reduce((s, x) => s + x.unit_price, 0) / suppliers.length).toFixed(2)
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold text-[#111827]">Find Suppliers</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Product</label>
            <input
              value={product}
              onChange={e => setProduct(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
            <input
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price ($)</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={e => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 accent-[#c40000]"
              />
              <span className="text-sm font-semibold text-gray-600">Verified only</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search Suppliers'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#111827] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Results */}
      {suppliers.length > 0 && (
        <div className="space-y-5">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Suppliers" value={suppliers.length} />
            <MetricCard label="Verified Suppliers" value={suppliers.filter(s => s.verified).length} />
            <MetricCard label="Average Price" value={avgPrice ? `$${avgPrice}` : '—'} />
            <MetricCard label="Best Match Score" value={`${suppliers[0].aimoro_score}%`} />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 flex gap-1">
            {(['results', 'table', 'analytics'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px',
                  tab === t
                    ? 'border-[#c40000] text-[#c40000]'
                    : 'border-transparent text-gray-500 hover:text-[#111827]',
                ].join(' ')}
              >
                {t === 'results' ? 'Supplier Results' : t === 'table' ? 'Comparison Table' : 'Analytics'}
              </button>
            ))}
          </div>

          {tab === 'results' && (
            <div>
              {suppliers.map((s, i) => (
                <SupplierCard
                  key={s.id}
                  supplier={s}
                  isFirst={i === 0}
                  onSave={handleSave}
                  saving={savingId === s.id}
                />
              ))}
            </div>
          )}

          {tab === 'table' && (
            <div className="bg-white rounded-[18px] border border-[#e5e7eb] overflow-x-auto shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Supplier', 'Platform', 'Country', 'Price', 'MOQ', 'Rating', 'Delivery', 'Risk', 'Score'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#111827] whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.platform}</td>
                      <td className="px-4 py-3 text-gray-600">{s.country}</td>
                      <td className="px-4 py-3 font-semibold">${s.unit_price}</td>
                      <td className="px-4 py-3 text-gray-600">{s.minimum_order_quantity}</td>
                      <td className="px-4 py-3 text-gray-600">{s.rating}</td>
                      <td className="px-4 py-3 text-gray-600">{s.delivery_days}d</td>
                      <td className="px-4 py-3"><RiskBadge risk={s.risk_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-[#c40000] h-1.5 rounded-full"
                              style={{ width: `${s.aimoro_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-8 text-right">{s.aimoro_score}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
                <h3 className="font-bold text-[#111827] mb-4">Price Comparison</h3>
                <PriceBarChart suppliers={suppliers} />
              </div>
              <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
                <h3 className="font-bold text-[#111827] mb-4">Match Scores</h3>
                <ScoreBarChart suppliers={suppliers} />
              </div>
              <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
                <h3 className="font-bold text-[#111827] mb-4">Platform Distribution</h3>
                <PlatformPieChart suppliers={suppliers} />
              </div>
              <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
                <h3 className="font-bold text-[#111827] mb-4">Risk Distribution</h3>
                <RiskBarChart suppliers={suppliers} />
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && suppliers.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400 text-sm font-medium">
          Search suppliers using the form above.
        </div>
      )}
    </div>
  )
}
