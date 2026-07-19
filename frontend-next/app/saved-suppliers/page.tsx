'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSavedSuppliers, deleteSavedSupplier } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'

type SortKey = 'name' | 'unit_price' | 'rating' | 'delivery_days'
type SortDir = 'asc' | 'desc'

function exportCSV(suppliers: SavedSupplier[]) {
  const headers = ['Name', 'Platform', 'Country', 'Product', 'Price ($)', 'MOQ', 'Rating', 'Delivery (days)', 'Verified', 'Score', 'URL']
  const rows = suppliers.map(s => [
    s.name, s.platform, s.country, s.product, s.unit_price,
    s.minimum_order_quantity, s.rating, s.delivery_days,
    s.verified ? 'Yes' : 'No', s.aimoro_score ?? '', s.supplier_url ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'aimoro-saved-suppliers.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function SavedSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function load() {
    try {
      const data = await getSavedSuppliers()
      setSuppliers(data)
    } catch {
      // backend unavailable
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(savedId: number, name: string) {
    if (!confirm(`Remove ${name} from saved suppliers?`)) return
    setDeletingId(savedId)
    try {
      await deleteSavedSupplier(savedId)
      setSuppliers(prev => prev.filter(s => s.saved_id !== savedId))
    } catch {
      alert('Could not delete supplier.')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const platforms = useMemo(() => ['All', ...Array.from(new Set(suppliers.map(s => s.platform)))], [suppliers])

  const filtered = useMemo(() => {
    const list = platformFilter === 'All' ? suppliers : suppliers.filter(s => s.platform === platformFilter)
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [suppliers, platformFilter, sortKey, sortDir])

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
        sortKey === k
          ? 'bg-[#c40000] text-white border-[#c40000]'
          : 'bg-white text-slate-500 border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'
      }`}
    >
      {label}
      <span className="opacity-70">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Your shortlist</p>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Saved Suppliers</h1>
        </div>
        {suppliers.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 text-sm font-semibold bg-white border border-slate-200 hover:border-[#c40000]/40 hover:text-[#c40000] text-slate-600 px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[18px] border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">
          No saved suppliers yet. Go to <strong className="text-[#0f172a]">Find Suppliers</strong> and hit Save on any result.
        </div>
      )}

      {!loading && suppliers.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    platformFilter === p ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-[#0f172a]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Sort:</span>
              <SortBtn k="name" label="Name" />
              <SortBtn k="unit_price" label="Price" />
              <SortBtn k="rating" label="Rating" />
              <SortBtn k="delivery_days" label="Delivery" />
            </div>
          </div>

          <p className="text-xs text-slate-400">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</p>

          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.saved_id} className="relative overflow-hidden bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c40000] via-[#ff5a5a] to-[#c40000]" />
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-extrabold text-[#111827]">{s.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.platform} · {s.country} · {s.product} · <span className="font-semibold text-[#0f172a]">${s.unit_price}</span> · MOQ {s.minimum_order_quantity} · {s.delivery_days}d · ★ {s.rating}
                      {s.verified ? ' · ✓ Verified' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.supplier_url && (
                      <a
                        href={s.supplier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-[#c40000] border border-[#c40000]/30 px-3 py-1.5 rounded-xl hover:bg-[#fff1f1] transition-colors"
                      >
                        View on {s.platform}
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(s.saved_id, s.name)}
                      disabled={deletingId === s.saved_id}
                      className="text-sm font-semibold text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {deletingId === s.saved_id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
