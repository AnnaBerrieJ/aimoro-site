'use client'

import { useState } from 'react'
import { searchSuppliers, saveSupplier } from '@/lib/api'
import type { Supplier } from '@/lib/types'
import { MetricCard } from '@/components/MetricCard'
import { SupplierCard } from '@/components/SupplierCard'
import { RiskBadge } from '@/components/RiskBadge'
import { PriceBarChart, ScoreBarChart, PlatformPieChart, RiskBarChart } from '@/components/charts/SupplierCharts'

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

  const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c40000]/20 focus:border-[#c40000]/40 bg-white transition'
  const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Sourcing</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Find Suppliers</h1>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <div>
            <label className={labelClass}>Product</label>
            <input value={product} onChange={e => setProduct(e.target.value)} className={inputClass} placeholder="e.g. Wireless Headphones" />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input value={country} onChange={e => setCountry(e.target.value)} className={inputClass} placeholder="e.g. China" />
          </div>
          <div>
            <label className={labelClass}>Max Price ($)</label>
            <input type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className={inputClass} />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${verifiedOnly ? 'bg-[#c40000]' : 'bg-slate-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${verifiedOnly ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-semibold text-slate-600">Verified only</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-[#c40000] hover:bg-[#a30000] text-white font-bold px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(196,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(196,0,0,0.4)] transition-all hover:-translate-y-px disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Suppliers
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Results */}
      {suppliers.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Found" value={suppliers.length} />
            <MetricCard label="Verified" value={suppliers.filter(s => s.verified).length} />
            <MetricCard label="Avg Price" value={avgPrice ? `$${avgPrice}` : '—'} />
            <MetricCard label="Best Score" value={`${suppliers[0].aimoro_score}%`} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(['results', 'table', 'analytics'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-4 py-2 text-sm font-semibold rounded-lg transition-all capitalize',
                  tab === t ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-[#0f172a]',
                ].join(' ')}
              >
                {t === 'results' ? 'Results' : t === 'table' ? 'Table' : 'Analytics'}
              </button>
            ))}
          </div>

          {tab === 'results' && (
            <div>
              {suppliers.map((s, i) => (
                <SupplierCard key={s.id} supplier={s} isFirst={i === 0} onSave={handleSave} saving={savingId === s.id} />
              ))}
            </div>
          )}

          {tab === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Supplier', 'Platform', 'Country', 'Price', 'MOQ', 'Rating', 'Delivery', 'Risk', 'Score'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#0f172a] whitespace-nowrap">{s.name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.platform}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.country}</td>
                      <td className="px-5 py-3.5 font-semibold">${s.unit_price}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.minimum_order_quantity}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.rating}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.delivery_days}d</td>
                      <td className="px-5 py-3.5"><RiskBadge risk={s.risk_level} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[48px]">
                            <div className="bg-[#c40000] h-1.5 rounded-full" style={{ width: `${s.aimoro_score}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8 text-right">{s.aimoro_score}%</span>
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
              {[
                { title: 'Price Comparison', sub: 'Unit price by supplier', Chart: () => <PriceBarChart suppliers={suppliers} /> },
                { title: 'Match Scores', sub: 'Aimoro score by supplier', Chart: () => <ScoreBarChart suppliers={suppliers} /> },
                { title: 'Platform Split', sub: 'Distribution across platforms', Chart: () => <PlatformPieChart suppliers={suppliers} /> },
                { title: 'Risk Distribution', sub: 'Suppliers by risk level', Chart: () => <RiskBarChart suppliers={suppliers} /> },
              ].map(({ title, sub, Chart }) => (
                <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#0f172a] mb-0.5">{title}</h3>
                  <p className="text-xs text-slate-400 mb-4">{sub}</p>
                  <Chart />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && suppliers.length === 0 && !error && (
        <div className="text-center py-20 text-slate-400 text-sm">
          Enter a product and hit Search to find suppliers.
        </div>
      )}
    </div>
  )
}
