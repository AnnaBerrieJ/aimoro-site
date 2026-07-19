'use client'

import { useEffect, useState } from 'react'
import { getSavedSuppliers, deleteSavedSupplier } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'

export default function SavedSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Your shortlist</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Saved Suppliers</h1>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">
          No saved suppliers yet. Go to <strong className="text-[#0f172a]">Find Suppliers</strong> and hit Save on any result.
        </div>
      )}

      <div className="space-y-3">
        {suppliers.map(s => (
          <div
            key={s.saved_id}
            className="relative overflow-hidden bg-white rounded-[18px] border border-[#e5e7eb] p-5 shadow-card"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c40000] via-[#ff5a5a] to-[#c40000]" />
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-extrabold text-[#111827]">{s.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {s.platform} · {s.country} · {s.product} · ${s.unit_price} · MOQ {s.minimum_order_quantity} · {s.delivery_days}d · Rating {s.rating}
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
    </div>
  )
}
