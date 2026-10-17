'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, StatusSteps, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import { OptionsView } from '@/components/agent/OptionsView'
import { WarehousePhotoGrid } from '@/components/agent/WarehousePhotos'
import { ShipmentSteps, Timeline } from '@/components/agent/Timeline'
import * as api from '@/lib/agent'
import { bsd, shortDate } from '@/lib/agent'

function RequestDetail() {
  const id = Number(useParams<{ id: string }>().id)
  const params = useSearchParams()
  const [req, setReq] = useState<api.ProductRequest | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [payCfg, setPayCfg] = useState<{ stripe_enabled: boolean; bank_instructions: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setReq(await api.getRequest(id)) } catch (e) { setError((e as Error).message) }
  }, [id])

  useEffect(() => {
    load()
    api.paymentConfig().then(setPayCfg).catch(() => {})
  }, [load])

  // Returning from Stripe Checkout
  useEffect(() => {
    const paid = params.get('paid'), session = params.get('session_id')
    if (paid && session) {
      api.confirmPayment(Number(paid), session).then(setReq).catch(e => setError(e.message))
    }
  }, [params])

  useEffect(() => {
    if (!req?.has_photo) return
    let url: string | null = null
    api.fetchFileUrl(`/requests/${req.id}/photo`).then(u => { url = u; setPhotoUrl(u) }).catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [req?.id, req?.has_photo])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!req) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><ErrorNote message={error} />{!error && <p className="text-sm text-slate-500">Loading…</p>}</div>
  }

  const inv = req.invoice
  const canCancel = ['received', 'sourcing', 'quote_ready'].includes(req.status) && !inv

  return (
    <div className={`${req.options.length > 1 && !req.options.some(o => o.status === 'approved') ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-4 py-8 space-y-4`}>
      <Link href="/my-requests" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← My requests</Link>
      {params.get('new') && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          Request received. We'll start sourcing and send your quote here, usually within 1–2 days.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{req.product_name}</h1>
        <p className="text-xs text-slate-500 mt-1">Request #{req.id} · {shortDate(req.created_at)}</p>
      </div>
      <StatusSteps status={req.status} />
      <ErrorNote message={error} />

      {req.options.length > 0 && (
        <OptionsView req={req} customerPhotoUrl={photoUrl} busy={busy}
          onChoose={quoteId => act(async () => setReq(await api.approveQuote(req.id, quoteId)))}
          onDownload={() => act(() => api.downloadOptionsPdf(req.id))} />
      )}

      {inv && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900">Invoice {inv.number}</h2>
              <p className="text-sm text-slate-500">{bsd(inv.amount_bsd)} · {inv.status === 'paid' ? `Paid ${inv.paid_at ? shortDate(inv.paid_at) : ''}` : 'Awaiting payment'}</p>
            </div>
            <button className={secondaryBtn} onClick={() => act(() => api.downloadInvoice(inv))}>Download PDF</button>
          </div>
          {inv.status !== 'paid' && payCfg && (
            <div className="mt-4 space-y-3">
              {payCfg.stripe_enabled && (
                <button disabled={busy} className={`${primaryBtn} w-full`}
                  onClick={() => act(async () => { window.location.href = (await api.startCheckout(inv.id)).url })}>
                  Pay by card
                </button>
              )}
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                <span className="font-semibold">How to pay: </span>{payCfg.bank_instructions}
              </p>
            </div>
          )}
        </Card>
      )}

      {req.shipment && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-bold text-slate-900">Shipping</h2>
            <span className="text-xs text-slate-500 capitalize">{req.shipment.method}{req.shipment.eta ? ` · ETA ${req.shipment.eta}` : ''}</span>
          </div>
          <ShipmentSteps status={req.shipment.status} />
          {req.shipment.tracking_number && (
            <p className="text-sm text-slate-700 mt-3">Tracking: <span className="font-mono">{req.shipment.carrier} {req.shipment.tracking_number}</span></p>
          )}
        </Card>
      )}
      {!req.shipment && req.tracking_number && (
        <Card>
          <h2 className="font-bold text-slate-900">Tracking</h2>
          <p className="text-sm text-slate-700 mt-1 font-mono">{req.tracking_number}</p>
        </Card>
      )}

      {req.warehouse_photos.length > 0 && (
        <Card>
          <h2 className="font-bold text-slate-900">Warehouse check</h2>
          <p className="text-sm text-slate-600 mb-3">We checked your order at our China warehouse. Here is exactly what arrived. Tap a photo to see it full size, or play a video.</p>
          <WarehousePhotoGrid requestId={req.id} photos={req.warehouse_photos} />
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-slate-900 mb-3">Updates</h2>
        <Timeline items={[...req.timeline].reverse()} />
      </Card>

      <Card>
        <h2 className="font-bold text-slate-900 mb-2">What you asked for</h2>
        <dl className="text-sm space-y-1">
          <div><dt className="inline text-slate-500">Quantity: </dt><dd className="inline">{req.quantity}</dd></div>
          {req.delivery_address && <div><dt className="inline text-slate-500">Deliver to: </dt><dd className="inline whitespace-pre-wrap">{req.delivery_address}</dd></div>}
          {req.target_price_bsd != null && <div><dt className="inline text-slate-500">Budget: </dt><dd className="inline">{bsd(req.target_price_bsd)}</dd></div>}
          {req.description && <div><dt className="inline text-slate-500">Details: </dt><dd className="inline whitespace-pre-wrap">{req.description}</dd></div>}
          {req.reference_url && <div><dt className="inline text-slate-500">Link: </dt><dd className="inline break-all"><a className="text-[#c40000] underline" href={req.reference_url} target="_blank" rel="noopener noreferrer">{req.reference_url}</a></dd></div>}
        </dl>
        {photoUrl && req.options.length === 0 && <img src={photoUrl} alt="Your product photo" className="mt-3 max-h-64 rounded-xl border border-slate-100" />}
      </Card>

      {canCancel && (
        <button disabled={busy} className="text-sm font-semibold text-slate-500 hover:text-red-600"
          onClick={() => { if (window.confirm('Cancel this request?')) act(async () => setReq(await api.cancelRequest(req.id))) }}>
          Cancel request
        </button>
      )}
    </div>
  )
}

export default function RequestDetailPage() {
  return <RequireAuth><Suspense><RequestDetail /></Suspense></RequireAuth>
}
