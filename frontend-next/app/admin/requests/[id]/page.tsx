'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, StatusBadge, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import * as api from '@/lib/agent'
import { PLATFORMS, REQUEST_STATUS_OPTIONS, SHIPMENT_LABELS, STATUS_LABELS, bsd, dateTime, shortDate, whatsappLink } from '@/lib/agent'
import { Timeline } from '@/components/agent/Timeline'

const EMPTY_LISTING = { platform: 'taobao', url: '', title: '', price_cny: '', china_shipping_cny: '', seller_rating: '', weight_kg: '', notes: '' }

const searchLinks = (q: string) => [
  ['Taobao', `https://s.taobao.com/search?q=${encodeURIComponent(q)}`],
  ['AliExpress', `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`],
  ['Alibaba', `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`],
] as const

const num = (s: string) => (s.trim() === '' ? null : Number(s))

function Workspace() {
  const id = Number(useParams<{ id: string }>().id)
  const [req, setReq] = useState<api.AdminRequest | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [listing, setListing] = useState(EMPTY_LISTING)

  // quote builder state (percent fields shown as %)
  const [qb, setQb] = useState({ listing_id: '', fx: '', freight: '0', markup: '0', insurance: '0', fee: '12', feeMin: '15', message: '' })
  const [preview, setPreview] = useState<api.QuotePreview | null>(null)
  const [previewErr, setPreviewErr] = useState<string | null>(null)

  // admin fields
  const [notes, setNotes] = useState('')
  const [tracking, setTracking] = useState('')
  const [payRef, setPayRef] = useState('bank transfer')
  const [orderNo, setOrderNo] = useState('')
  const [whNotes, setWhNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.adminRequest(id)
      setReq(r)
      setNotes(r.admin_notes)
      setTracking(r.tracking_number)
      const chosen = r.listings.find(l => l.is_chosen) ?? r.listings[0]
      setQb(q => ({ ...q, listing_id: q.listing_id || (chosen ? String(chosen.id) : '') }))
    } catch (e) { setError((e as Error).message) }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.getFx().then(f => setQb(q => ({ ...q, fx: q.fx || f.rate.toFixed(4) }))).catch(() => {})
  }, [])
  useEffect(() => {
    if (!req?.has_photo) return
    let url: string | null = null
    api.fetchFileUrl(`/requests/${req.id}/photo`).then(u => { url = u; setPhotoUrl(u) }).catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [req?.id, req?.has_photo])

  const quoteInput = useMemo<api.QuoteBuildInput | null>(() => {
    if (!qb.listing_id) return null
    return {
      listing_id: Number(qb.listing_id),
      fx_cny_usd: num(qb.fx),
      freight_cost_bsd: Number(qb.freight) || 0,
      freight_markup_pct: (Number(qb.markup) || 0) / 100,
      insurance_bsd: Number(qb.insurance) || 0,
      service_fee_pct: (Number(qb.fee) || 0) / 100,
      service_fee_min_bsd: Number(qb.feeMin) || 0,
      message: qb.message,
    }
  }, [qb])

  // live preview, debounced
  useEffect(() => {
    if (!quoteInput) { setPreview(null); return }
    const t = setTimeout(() => {
      api.previewQuote(id, quoteInput).then(p => { setPreview(p); setPreviewErr(null) }).catch(e => setPreviewErr(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [id, quoteInput])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await fn(); await load() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!req) return <div className="p-8"><ErrorNote message={error} />{!error && <p className="text-sm text-slate-500">Loading…</p>}</div>

  const approved = req.quotes.some(q => q.status === 'approved')
  const canQuote = ['received', 'sourcing', 'quote_ready'].includes(req.status) && !approved
  const cheapest = req.listings.reduce<api.Listing | null>((best, l) =>
    !best || (l.price_bsd_estimate ?? Infinity) < (best.price_bsd_estimate ?? Infinity) ? l : best, null)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Queue</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">#{req.id} · {req.product_name}</h1>
        <StatusBadge status={req.status} />
      </div>
      <ErrorNote message={error} />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Request + customer */}
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Request</h2>
            <dl className="text-sm space-y-1">
              <div><dt className="inline text-slate-500">Qty: </dt><dd className="inline font-semibold">{req.quantity}</dd></div>
              {req.target_price_bsd != null && <div><dt className="inline text-slate-500">Budget: </dt><dd className="inline font-semibold">{bsd(req.target_price_bsd)}</dd></div>}
              {req.description && <div><dt className="inline text-slate-500">Details: </dt><dd className="inline whitespace-pre-wrap">{req.description}</dd></div>}
              {req.reference_url && <div className="break-all"><dt className="inline text-slate-500">Link: </dt><dd className="inline"><a className="text-[#c40000] underline" href={req.reference_url} target="_blank" rel="noopener noreferrer">{req.reference_url}</a></dd></div>}
              <div><dt className="inline text-slate-500">Received: </dt><dd className="inline">{shortDate(req.created_at)}</dd></div>
            </dl>
            {photoUrl && <img src={photoUrl} alt="Customer photo" className="mt-3 max-h-56 rounded-xl border border-slate-100" />}
            <div className="flex flex-wrap gap-2 mt-3">
              {searchLinks(req.product_name).map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">Search {label} ↗</a>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Customer</h2>
            <p className="text-sm font-semibold">{req.customer.name}</p>
            <p className="text-sm text-slate-600">{req.customer.email}</p>
            {req.customer.phone && (
              <p className="text-sm text-slate-600">{req.customer.phone} · <a className="text-[#c40000] font-semibold" target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${req.customer.phone.replace(/\D/g, '')}`}>WhatsApp</a></p>
            )}
            <p className="text-sm text-slate-600 whitespace-pre-wrap"><span className="text-slate-500">Deliver to: </span>{req.delivery_address || '—'}</p>
          </Card>
          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Status & shipping</h2>
            <label className={labelClass} htmlFor="status">Status</label>
            <select id="status" className={inputClass} value={req.status} disabled={busy}
              onChange={e => act(() => api.adminUpdateRequest(req.id, { status: e.target.value as api.RequestStatus }))}>
              {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <label className={`${labelClass} mt-3`} htmlFor="tracking">Tracking number</label>
            <input id="tracking" className={inputClass} value={tracking} onChange={e => setTracking(e.target.value)} />
            <label className={`${labelClass} mt-3`} htmlFor="notes">Private notes</label>
            <textarea id="notes" rows={3} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} />
            <button disabled={busy} className={`${secondaryBtn} w-full mt-3`}
              onClick={() => act(() => api.adminUpdateRequest(req.id, { tracking_number: tracking, admin_notes: notes }))}>Save</button>
          </Card>
        </div>

        {/* Sourcing + quote */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="font-bold text-slate-900 mb-1">Sourcing <span className="text-xs font-semibold text-slate-400">(private)</span></h2>
            <p className="text-xs text-slate-500 mb-3">Paste what you find in the Taobao / Pinduoduo / 1688 apps. Prices in CNY; BSD shown at today's rate.</p>
            {req.listings.length > 0 && (
              <div className="overflow-x-auto -mx-1 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="py-2 px-1">Platform</th><th className="px-1">Item</th>
                      <th className="px-1 text-right">¥ each</th><th className="px-1 text-right">¥ ship</th>
                      <th className="px-1 text-right">≈ BSD each</th><th className="px-1">Rating</th><th className="px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {req.listings.map(l => (
                      <tr key={l.id} className="border-b border-slate-50 align-top">
                        <td className="py-2 px-1 font-semibold capitalize">{l.platform}{l.is_chosen && <span className="ml-1 text-[10px] text-emerald-700">✓ quoted</span>}</td>
                        <td className="px-1 max-w-[220px]">
                          {l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[#c40000] underline break-all">{l.title || 'Open listing'}</a> : (l.title || '—')}
                          {l.notes && <p className="text-xs text-slate-500">{l.notes}</p>}
                        </td>
                        <td className="px-1 text-right tabular-nums">{l.price_cny.toFixed(2)}</td>
                        <td className="px-1 text-right tabular-nums">{l.china_shipping_cny.toFixed(2)}</td>
                        <td className={`px-1 text-right tabular-nums ${cheapest?.id === l.id ? 'font-bold text-emerald-700' : ''}`}>
                          {l.price_bsd_estimate != null ? bsd(l.price_bsd_estimate) : '—'}
                        </td>
                        <td className="px-1">{l.seller_rating ?? '—'}</td>
                        <td className="px-1 text-right">
                          {!l.is_chosen && (
                            <button className="text-xs text-slate-400 hover:text-red-600" disabled={busy}
                              onClick={() => act(() => api.deleteListing(l.id))}>Remove</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form className="grid grid-cols-2 sm:grid-cols-4 gap-2" onSubmit={e => {
              e.preventDefault()
              act(async () => {
                await api.addListing(req.id, {
                  platform: listing.platform as api.Platform,
                  url: listing.url.trim(), title: listing.title.trim(),
                  price_cny: Number(listing.price_cny), china_shipping_cny: Number(listing.china_shipping_cny) || 0,
                  seller_rating: num(listing.seller_rating), weight_kg: num(listing.weight_kg), notes: listing.notes.trim(),
                })
                setListing(EMPTY_LISTING)
              })
            }}>
              <select aria-label="Platform" className={inputClass} value={listing.platform} onChange={e => setListing({ ...listing, platform: e.target.value })}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input aria-label="Price CNY" required type="number" min={0} step="0.01" placeholder="¥ price each" className={inputClass}
                value={listing.price_cny} onChange={e => setListing({ ...listing, price_cny: e.target.value })} />
              <input aria-label="China shipping CNY" type="number" min={0} step="0.01" placeholder="¥ China shipping" className={inputClass}
                value={listing.china_shipping_cny} onChange={e => setListing({ ...listing, china_shipping_cny: e.target.value })} />
              <input aria-label="Seller rating" type="number" min={0} max={5} step="0.1" placeholder="Rating /5" className={inputClass}
                value={listing.seller_rating} onChange={e => setListing({ ...listing, seller_rating: e.target.value })} />
              <input aria-label="Listing link" type="url" placeholder="Paste link from app" className={`${inputClass} col-span-2`}
                value={listing.url} onChange={e => setListing({ ...listing, url: e.target.value })} />
              <input aria-label="Title" placeholder="Title" className={inputClass}
                value={listing.title} onChange={e => setListing({ ...listing, title: e.target.value })} />
              <input aria-label="Weight kg" type="number" min={0} step="0.01" placeholder="Weight kg" className={inputClass}
                value={listing.weight_kg} onChange={e => setListing({ ...listing, weight_kg: e.target.value })} />
              <input aria-label="Notes" placeholder="Notes (colour, size, seller…)" className={`${inputClass} col-span-2 sm:col-span-3`}
                value={listing.notes} onChange={e => setListing({ ...listing, notes: e.target.value })} />
              <button type="submit" disabled={busy} className={`${secondaryBtn} col-span-2 sm:col-span-1`}>+ Add listing</button>
            </form>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 mb-3">Quote builder</h2>
            {req.listings.length === 0 ? (
              <p className="text-sm text-slate-500">Add at least one listing first.</p>
            ) : !canQuote ? (
              <p className="text-sm text-slate-500">{approved ? 'The customer approved a quote.' : `This request can't be quoted while its status is “${STATUS_LABELS[req.status]}”.`}</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className={labelClass} htmlFor="qb-listing">Listing</label>
                    <select id="qb-listing" className={inputClass} value={qb.listing_id} onChange={e => setQb({ ...qb, listing_id: e.target.value })}>
                      {req.listings.map(l => <option key={l.id} value={l.id}>{l.platform} · ¥{l.price_cny} {l.title ? `· ${l.title.slice(0, 30)}` : ''}</option>)}
                    </select>
                  </div>
                  {([
                    ['fx', 'CNY → USD rate', '0.0001'], ['freight', 'Freight cost (BSD)', '0.01'],
                    ['markup', 'Freight markup %', '1'], ['insurance', 'Insurance (BSD)', '0.01'],
                    ['fee', 'Service fee %', '0.5'], ['feeMin', 'Min service fee (BSD)', '1'],
                  ] as const).map(([k, label, step]) => (
                    <div key={k}>
                      <label className={labelClass} htmlFor={`qb-${k}`}>{label}</label>
                      <input id={`qb-${k}`} type="number" min={0} step={step} className={inputClass}
                        value={qb[k]} onChange={e => setQb({ ...qb, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className={labelClass} htmlFor="qb-msg">Message to customer</label>
                    <textarea id="qb-msg" rows={2} className={inputClass} placeholder="e.g. Ships by air, about 8 days to Nassau"
                      value={qb.message} onChange={e => setQb({ ...qb, message: e.target.value })} />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Customer sees</p>
                  <ErrorNote message={previewErr} />
                  {preview && (
                    <>
                      <dl className="space-y-1">
                        {([
                          ['Product', preview.product_cost_bsd], ['Shipping to address', preview.shipping_bsd],
                          ['Service fee', preview.service_fee_bsd],
                        ] as const).map(([l, v]) => (
                          <div key={l} className="flex justify-between"><dt className="text-slate-600">{l}</dt><dd className="tabular-nums">{bsd(v)}</dd></div>
                        ))}
                        <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-extrabold text-base">
                          <dt>Total</dt><dd className="tabular-nums">{bsd(preview.total_bsd)}</dd>
                        </div>
                      </dl>
                      {req.target_price_bsd != null && preview.total_bsd > req.target_price_bsd && (
                        <p className="text-xs text-amber-700 mt-2">Over the customer's budget of {bsd(req.target_price_bsd)}.</p>
                      )}
                      <p className="text-xs font-semibold text-emerald-700 mt-3">Your margin: {bsd(preview.margin_bsd)} <span className="font-normal text-slate-500">(private)</span></p>
                    </>
                  )}
                  <button disabled={busy || !preview || !quoteInput} className={`${primaryBtn} w-full mt-4`}
                    onClick={() => quoteInput && act(() => api.sendQuote(req.id, quoteInput))}>
                    {req.quote?.status === 'sent' ? 'Send updated quote' : 'Send quote'}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {req.invoice && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-slate-900">Invoice {req.invoice.number}</h2>
                  <p className="text-sm text-slate-500">{bsd(req.invoice.amount_bsd)} · {req.invoice.status}</p>
                </div>
                <button className={secondaryBtn} onClick={() => act(() => api.downloadInvoice(req.invoice!))}>PDF</button>
              </div>
              {req.invoice.status !== 'paid' && (
                <div className="flex gap-2 mt-3">
                  <input aria-label="Payment reference" className={inputClass} value={payRef} onChange={e => setPayRef(e.target.value)} />
                  <button disabled={busy} className={primaryBtn} onClick={() => act(() => api.markInvoicePaid(req.invoice!.id, payRef))}>Mark paid</button>
                </div>
              )}
            </Card>
          )}

          {['paid', 'ordered', 'shipped', 'delivered'].includes(req.status) && (
            <Card>
              <h2 className="font-bold text-slate-900 mb-3">Fulfilment</h2>
              <ol className="space-y-4 text-sm">
                <li>
                  <p className="font-semibold text-slate-800">1. Supplier order</p>
                  {req.supplier_order_no ? (
                    <p className="text-slate-600">Order <span className="font-mono">{req.supplier_order_no}</span> · {req.ordered_at && dateTime(req.ordered_at)}</p>
                  ) : (
                    <form className="flex gap-2 mt-1" onSubmit={e => { e.preventDefault(); act(async () => { await api.recordOrder(req.id, orderNo); setOrderNo('') }) }}>
                      <input aria-label="Supplier order number" required placeholder="Taobao / PDD order number" className={inputClass}
                        value={orderNo} onChange={e => setOrderNo(e.target.value)} />
                      <button disabled={busy} className={primaryBtn}>Mark ordered</button>
                    </form>
                  )}
                </li>
                <li>
                  <p className="font-semibold text-slate-800">2. China warehouse check</p>
                  {req.warehouse_arrived_at ? (
                    <p className="text-slate-600">Arrived {dateTime(req.warehouse_arrived_at)}{req.warehouse_notes ? ` · ${req.warehouse_notes}` : ''}</p>
                  ) : req.status === 'ordered' ? (
                    <form className="flex gap-2 mt-1" onSubmit={e => { e.preventDefault(); act(async () => { await api.warehouseArrival(req.id, whNotes); setWhNotes('') }) }}>
                      <input aria-label="Warehouse check notes" placeholder="Check notes (colour, damage, count)" className={inputClass}
                        value={whNotes} onChange={e => setWhNotes(e.target.value)} />
                      <button disabled={busy} className={secondaryBtn}>Arrived</button>
                    </form>
                  ) : <p className="text-slate-400">After the supplier order</p>}
                </li>
                <li>
                  <p className="font-semibold text-slate-800">3. Shipment</p>
                  {req.shipment_id && req.shipment ? (
                    <p className="text-slate-600">
                      <Link className="text-[#c40000] font-semibold underline" href={`/admin/shipments/${req.shipment_id}`}>{req.shipment.reference}</Link>
                      {' '}· {SHIPMENT_LABELS[req.shipment.status]}
                    </p>
                  ) : req.status === 'ordered' ? (
                    <p className="text-slate-600">Not in a shipment yet. <Link href="/admin/shipments" className="text-[#c40000] font-semibold underline">Add it on Shipments</Link></p>
                  ) : <p className="text-slate-400">After ordering</p>}
                </li>
                <li>
                  <p className="font-semibold text-slate-800">4. Delivered</p>
                  {req.status === 'delivered'
                    ? <p className="text-slate-600">Delivered to {req.delivery_address}. Done.</p>
                    : <p className="text-slate-400">Marked from the shipment page.</p>}
                </li>
              </ol>
            </Card>
          )}

          <Card>
            <h2 className="font-bold text-slate-900 mb-3">Timeline</h2>
            <Timeline items={req.events} action={e => e.customer_visible !== false && req.customer.phone ? (
              <a className="text-xs font-semibold text-emerald-700" target="_blank" rel="noopener noreferrer"
                href={whatsappLink(req.customer.phone, `Hi ${req.customer.name.split(' ')[0]}, update on your AIMORO request "${req.product_name}": ${e.message}`)}>
                Send on WhatsApp ↗
              </a>
            ) : null} />
          </Card>

          {req.notifications.length > 0 && (
            <Card>
              <button className="w-full flex justify-between items-center" onClick={() => setShowNotes(v => !v)}>
                <h2 className="font-bold text-slate-900">Emails ({req.notifications.length})</h2>
                <span className="text-xs text-slate-500">{showNotes ? 'Hide' : 'Show'}</span>
              </button>
              {showNotes && (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {req.notifications.map(n => (
                    <li key={n.id} className="py-2">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-slate-800">{n.subject}</span>
                        <span className={`text-xs font-semibold ${n.status === 'sent' ? 'text-emerald-700' : n.status === 'failed' ? 'text-red-600' : 'text-slate-400'}`}>{n.status}</span>
                      </div>
                      <p className="text-xs text-slate-500">{n.to_address} · {dateTime(n.created_at)}{n.error ? ` · ${n.error}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {req.quotes.length > 0 && (
            <Card>
              <h2 className="font-bold text-slate-900 mb-2">Quote history</h2>
              <ul className="text-sm divide-y divide-slate-100">
                {req.quotes.map(q => (
                  <li key={q.id} className="flex justify-between py-2">
                    <span>{shortDate(q.created_at)} · <span className="capitalize">{q.status}</span></span>
                    <span className="tabular-nums">{bsd(q.total_bsd)} <span className="text-xs text-emerald-700">(+{bsd(q.margin_bsd)})</span></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminRequestPage() {
  return <RequireAuth admin><Workspace /></RequireAuth>
}
