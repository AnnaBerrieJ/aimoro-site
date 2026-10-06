'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, primaryBtn } from '@/components/agent/ui'
import { ShipmentSteps } from '@/components/agent/Timeline'
import * as api from '@/lib/agent'
import { SHIPMENT_LABELS, shortDate } from '@/lib/agent'

function Shipments() {
  const router = useRouter()
  const [ships, setShips] = useState<api.AdminShipment[] | null>(null)
  const [ready, setReady] = useState<api.ShipmentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.listShipments().then(setShips).catch(e => setError(e.message))
    api.readyToShip().then(setReady).catch(() => {})
  }, [])

  async function newShipment() {
    setBusy(true); setError(null)
    try { router.push(`/admin/shipments/${(await api.createShipment({ method: 'air' })).id}`) }
    catch (e) { setError((e as Error).message); setBusy(false) }
  }

  const active = ships?.filter(s => s.status !== 'delivered') ?? []
  const done = ships?.filter(s => s.status === 'delivered') ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Shipments" subtitle="Combine ordered items into one shipment to The Bahamas."
        action={<button disabled={busy} onClick={newShipment} className={primaryBtn}>+ New shipment</button>} />
      <ErrorNote message={error} />

      <Card>
        <h2 className="font-bold text-slate-900 mb-2">Ready to ship ({ready.length})</h2>
        {ready.length === 0 ? <p className="text-sm text-slate-500">No ordered items waiting.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {ready.map(r => (
              <li key={r.id} className="py-2 flex flex-wrap justify-between gap-2">
                <Link href={`/admin/requests/${r.id}`} className="font-semibold text-slate-800 hover:text-[#c40000]">#{r.id} · {r.product_name} × {r.quantity}</Link>
                <span className="text-xs text-slate-500">{r.customer_name} · {r.customer_island} · {r.warehouse_arrived ? <span className="text-emerald-700 font-semibold">at warehouse</span> : <span className="text-amber-700 font-semibold">not at warehouse yet</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="space-y-3">
        {ships === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {[...active, ...done].map(s => (
          <Link key={s.id} href={`/admin/shipments/${s.id}`} className="block">
            <Card className="hover:shadow-card-hover transition-shadow">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <p className="font-bold text-slate-900">{s.reference} <span className="font-normal text-slate-500 capitalize">· {s.method}{s.carrier ? ` · ${s.carrier}` : ''}</span></p>
                <p className="text-xs text-slate-500">{s.requests.length} item{s.requests.length === 1 ? '' : 's'} · {SHIPMENT_LABELS[s.status]}{s.eta ? ` · ETA ${s.eta}` : ''} · created {shortDate(s.created_at)}</p>
              </div>
              <ShipmentSteps status={s.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function ShipmentsPage() {
  return <RequireAuth admin><Shipments /></RequireAuth>
}
