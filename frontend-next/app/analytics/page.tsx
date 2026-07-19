'use client'

import { useEffect, useState } from 'react'
import { getSavedSuppliers } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'
import { MetricCard } from '@/components/MetricCard'
import { PlatformPieChart, PriceBarChart, VerifiedDonut, DeliveryBarChart } from '@/components/charts/SupplierCharts'

export default function AnalyticsPage() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState('')
  const [generating, setGenerating] = useState(false)

  async function generateReport() {
    setGenerating(true)
    setReport('')
    try {
      const summary = suppliers.map(s =>
        `${s.name} | ${s.platform} | $${s.unit_price} | MOQ ${s.minimum_order_quantity} | ${s.delivery_days}d | ★${s.rating} | ${s.risk_level} | Score ${s.aimoro_score ?? 'N/A'}%`
      ).join('\n')

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are an expert ecommerce sourcing advisor. Analyse this saved supplier portfolio and write a concise sourcing report (300-400 words).

Suppliers:
${summary}

Include:
1. Portfolio overview (platforms, price range, verification rate)
2. Top 2 recommended suppliers and why
3. Risks or red flags to watch
4. Actionable next steps

Be direct and practical. No fluff.`
          }]
        }),
      })
      const data = await res.json()
      setReport(data.answer ?? '')
    } catch {
      setReport('Could not generate report. Check your OPENAI_API_KEY.')
    } finally {
      setGenerating(false)
    }
  }

  function downloadReport() {
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aimoro-sourcing-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    getSavedSuppliers().then(setSuppliers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const avgPrice    = suppliers.length ? (suppliers.reduce((s, x) => s + x.unit_price, 0) / suppliers.length).toFixed(2) : null
  const avgRating   = suppliers.length ? (suppliers.reduce((s, x) => s + x.rating, 0) / suppliers.length).toFixed(1) : null
  const platforms   = new Set(suppliers.map(s => s.platform)).size
  const verifiedPct = suppliers.length ? Math.round((suppliers.filter(s => s.verified).length / suppliers.length) * 100) : 0

  const topSuppliers = [...suppliers]
    .filter(s => s.aimoro_score != null)
    .sort((a, b) => (b.aimoro_score ?? 0) - (a.aimoro_score ?? 0))
    .slice(0, 3)

  const cheapest = [...suppliers].sort((a, b) => a.unit_price - b.unit_price)[0]
  const fastest  = [...suppliers].sort((a, b) => a.delivery_days - b.delivery_days)[0]
  const topRated = [...suppliers].sort((a, b) => b.rating - a.rating)[0]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Insights</p>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Analytics</h1>
        </div>
        {suppliers.length > 0 && (
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 text-sm font-semibold bg-[#0f172a] hover:bg-[#1e293b] text-white px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-60"
          >
            {generating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            {generating ? 'Generating…' : 'AI Sourcing Report'}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-20" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-56" />)}
          </div>
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">
          Save suppliers first to see analytics here.
        </div>
      )}

      {suppliers.length > 0 && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Saved Suppliers" value={suppliers.length} />
            <MetricCard label="Avg Price" value={avgPrice ? `$${avgPrice}` : '—'} />
            <MetricCard label="Avg Rating" value={avgRating ? `★ ${avgRating}` : '—'} />
            <MetricCard label="Verified" value={`${verifiedPct}%`} />
          </div>

          {/* Top performers */}
          {topSuppliers.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-3">Top Performers</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Highest Score', supplier: topSuppliers[0], badge: '🏆' },
                  { label: 'Cheapest', supplier: cheapest, badge: '💰' },
                  { label: 'Fastest Delivery', supplier: fastest, badge: '⚡' },
                ].map(({ label, supplier: s, badge }) => s && (
                  <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{badge}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                    </div>
                    <p className="font-extrabold text-[#0f172a] truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.platform} · ${s.unit_price} · {s.delivery_days}d · ★ {s.rating}</p>
                    {s.aimoro_score != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-[#c40000] h-1.5 rounded-full" style={{ width: `${s.aimoro_score}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#c40000]">{s.aimoro_score}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts 2×2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Platform Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Saved suppliers by platform</p>
              <PlatformPieChart suppliers={suppliers} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Verified vs Unverified</h3>
              <p className="text-xs text-slate-400 mb-4">Verification status of your shortlist</p>
              <VerifiedDonut suppliers={suppliers} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Price Comparison</h3>
              <p className="text-xs text-slate-400 mb-4">Unit price by supplier</p>
              <PriceBarChart suppliers={suppliers} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-[#0f172a] mb-1">Delivery Time Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Number of suppliers by delivery range</p>
              <DeliveryBarChart suppliers={suppliers} />
            </div>
          </div>

          {/* Full table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-[#0f172a]">All Saved Suppliers</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Supplier', 'Platform', 'Country', 'Price', 'Rating', 'Delivery', 'Score'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...suppliers].sort((a, b) => (b.aimoro_score ?? 0) - (a.aimoro_score ?? 0)).map((s, i) => (
                  <tr key={s.saved_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-bold">{i + 1}</td>
                    <td className="px-5 py-3.5 font-semibold text-[#0f172a]">{s.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.platform}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.country}</td>
                    <td className="px-5 py-3.5 font-semibold">${s.unit_price}</td>
                    <td className="px-5 py-3.5 text-slate-500">★ {s.rating}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.delivery_days}d</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-[#c40000] h-1.5 rounded-full" style={{ width: `${s.aimoro_score ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#c40000]">{s.aimoro_score != null ? `${s.aimoro_score}%` : '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Report */}
          {(report || generating) && (
            <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c40000] to-[#7f0000] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#c40000] uppercase tracking-wider">AI Sourcing Report</span>
                </div>
                {report && (
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                )}
              </div>
              {generating ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-3 bg-white/10 rounded" style={{ width: `${90 - i * 8}%` }} />)}
                </div>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
