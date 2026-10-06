'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, StatusBadge, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import { ShipmentSteps } from '@/components/agent/Timeline'
import * as api from '@/lib/agent'
import { SHIPMENT_FLOW, SHIPMENT_METHODS, bsd, dateTime } from '@/lib/agent'

const NEXT_ACTION: Partial<Record<api.ShipmentStatus, string>> = {
  preparing: 'Mark shipped from China',
  in_transit: 'Mark delivered',
}

function ShipmentDetail() {
  const id = Number(useParams<{ id: string }>().id)
  const [s, setS] = useState<api.AdminShipment | null>(null)
  const [ready, setReady] = useState<api.ShipmentItem[]>([])
  const [form, setForm] = useState({ method: 'air', carrier: '', tracking_number: '', weight_kg: '', freight_cost_bsd: '', eta: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = (x: api.AdminShipment) => {
    setS(x)
    setForm({
      method: x.method, carrier: x.carrier, tracking_number: x.tracking_number,
      weight_kg: x.weight_kg?.toString() ?? '', freight_cost_bsd: x.freight_cost_bsd?.toString() ?? '',
      eta: x.eta, notes: x.notes,
    })
  }
  const load = useCallback(async () => {
    try {
      apply(await api.getShipment(id))
      setReady(await api.readyToShip())
    } catch (e) { setError((e as Error).message) }
  }, [id])
  useEffect(() => { load() }, [load])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null); setSaved(false)
    try { await fn(); await load() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const body = (): api.ShipmentInput => ({
    method: form.method, carrier: form.carrier.trim(), tracking_number: form.tracking_number.trim(),
    weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    freight_cost_bsd: form.freight_cost_bsd ? Number(form.freight_cost_bsd) : null,
    eta: form.eta, notes: form.notes,
  })

  if (!s) return <div className="p-8"><ErrorNote message={error} />{!error && <p className="text-sm text-slate-500">Loading…</p>}</div>

  const next = SHIPMENT_FLOW[SHIPMENT_FLOW.indexOf(s.status) + 1]
  const editable = s.status === 'preparing'
  const perItem = s.freight_cost_bsd && s.requests.length ? s.freight_cost_bsd / s.requests.length : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href="/admin/shipments" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Shipments</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{s.reference}</h1>
        {next && NEXT_ACTION[s.status] && (
          <button disabled={busy || s.requests.length === 0} className={primaryBtn}
            onClick={() => act(async () => {
              // save edits first so the customer email has the latest tracking number
              if (editable) await api.updateShipment(id, body())
              await api.advanceShipment(id, next)
            })}>
            {NEXT_ACTION[s.status]}
          </button>
        )}
      </div>
      <Card><ShipmentSteps status={s.status} />
        <p className="text-xs text-slate-500 mt-3">
          {[s.shipped_at && `Shipped ${dateTime(s.shipped_at)}`, s.delivered_at && `Delivered ${dateTime(s.delivered_at)}`].filter(Boolean).join(' · ') || 'Not shipped yet'}
          {next ? ' · Each step emails the customers in this shipment.' : ' · Complete.'}
        </p>
      </Card>
      <ErrorNote message={error} />

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-slate-900 mb-3">Details</h2>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); act(async () => { await api.updateShipment(id, body()); setSaved(true) }) }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass} htmlFor="method">Method</label>
                <select id="method" className={inputClass} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                  {SHIPMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="carrier">Carrier / forwarder</label>
                <input id="carrier" className={inputClass} value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="tracking">Tracking number</label>
                <input id="tracking" className={inputClass} value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="weight">Weight (kg)</label>
                <input id="weight" type="number" min={0} step="0.01" className={inputClass} value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cost">Freight cost (BSD, private)</label>
                <input id="cost" type="number" min={0} step="0.01" className={inputClass} value={form.freight_cost_bsd} onChange={e => setForm({ ...form, freight_cost_bsd: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="eta">Estimated arrival</label>
                <input id="eta" type="date" className={inputClass} value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor="snotes">Private notes</label>
                <textarea id="snotes" rows={2} className={inputClass} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <button disabled={busy} className={`${secondaryBtn} w-full`}>{saved ? 'Saved' : 'Save details'}</button>
            {perItem != null && <p className="text-xs text-slate-500">Freight works out to about {bsd(perItem)} per item.</p>}
          </form>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <h2 className="font-bold text-slate-900 mb-2">In this shipment ({s.requests.length})</h2>
            {s.requests.length === 0 && <p className="text-sm text-slate-500">Add ordered items below.</p>}
            <ul className="divide-y divide-slate-100 text-sm">
              {s.requests.map(r => (
                <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/admin/requests/${r.id}`} className="font-semibold text-slate-800 hover:text-[#c40000]">#{r.id} · {r.product_name} × {r.quantity}</Link>
                    <p className="text-xs text-slate-500">{r.customer_name} · deliver to {r.delivery_address || r.customer_island}{!r.warehouse_arrived && <span className="text-amber-700 font-semibold"> · not checked at warehouse</span>}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    {editable && <button disabled={busy} className="text-xs text-slate-400 hover:text-red-600" onClick={() => act(() => api.removeFromShipment(id, r.id))}>Remove</button>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          {editable && (
            <Card>
              <h2 className="font-bold text-slate-900 mb-2">Add ordered items</h2>
              {ready.length === 0 ? <p className="text-sm text-slate-500">Nothing waiting to ship.</p> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {ready.map(r => (
                    <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <span>#{r.id} · {r.product_name} × {r.quantity} <span className="text-xs text-slate-500">({r.customer_name}){!r.warehouse_arrived && ' · not at warehouse'}</span></span>
                      <button disabled={busy} className={secondaryBtn} onClick={() => act(() => api.addToShipment(id, r.id))}>Add</button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShipmentDetailPage() {
  return <RequireAuth admin><ShipmentDetail /></RequireAuth>
}
