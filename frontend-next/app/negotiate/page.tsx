'use client'

import { useEffect, useState } from 'react'
import { getSavedSuppliers } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'

export default function NegotiatePage() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [targetPrice, setTargetPrice] = useState(0)
  const [orderQty, setOrderQty] = useState(500)
  const [deliveryDays, setDeliveryDays] = useState(14)
  const [notes, setNotes] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getSavedSuppliers()
      .then(data => {
        setSuppliers(data)
        if (data.length > 0) {
          setTargetPrice(Math.max(data[0].unit_price * 0.85, 0.01))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const supplier = suppliers[selectedIdx]

  function handleSelect(idx: number) {
    setSelectedIdx(idx)
    setTargetPrice(Math.max(suppliers[idx].unit_price * 0.85, 0.01))
    setDraft('')
  }

  async function handleDraft() {
    setDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier, targetPrice, orderQty, deliveryDays, notes }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setDraft(data.message)
    } catch {
      setError('Failed to generate draft. Check your OPENAI_API_KEY is set.')
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#111827]">Negotiate</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aimoro AI drafts a negotiation message based on a saved supplier and your target terms.
          Review and edit it, then send it yourself.
        </p>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && suppliers.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm font-medium">
          Save a supplier first (Find Suppliers → Save) to negotiate with them.
        </div>
      )}

      {supplier && (
        <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <select
              value={selectedIdx}
              onChange={e => handleSelect(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
            >
              {suppliers.map((s, i) => (
                <option key={s.saved_id} value={i}>
                  {s.name} ({s.platform}, ${s.unit_price})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target price ($)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={targetPrice}
                onChange={e => setTargetPrice(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Order quantity</label>
              <input
                type="number"
                min={1}
                value={orderQty}
                onChange={e => setOrderQty(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target delivery (days)</label>
              <input
                type="number"
                min={1}
                value={deliveryDays}
                onChange={e => setDeliveryDays(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Additional asks or context (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. first-time buyer, want a sample before committing"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 resize-none"
            />
          </div>

          <button
            onClick={handleDraft}
            disabled={drafting}
            className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all disabled:opacity-60"
          >
            {drafting ? 'Drafting…' : 'Draft Negotiation Message'}
          </button>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        </div>
      )}

      {draft && (
        <div className="bg-white rounded-[18px] border border-[#e5e7eb] p-6 shadow-card space-y-3">
          <h2 className="font-bold text-[#111827]">Drafted Message</h2>
          <textarea
            rows={12}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 resize-none font-mono"
          />
          <p className="text-xs text-gray-400">
            Copy this into an email or the platform's messaging tool to send it yourself.
          </p>
        </div>
      )}
    </div>
  )
}
