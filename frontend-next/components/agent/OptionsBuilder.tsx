'use client'

import { useEffect, useMemo, useState } from 'react'
import * as api from '@/lib/agent'
import { bsd } from '@/lib/agent'
import { ErrorNote, inputClass, labelClass, primaryBtn } from './ui'

interface OptionDraft { listing_id: string; freight: string; insurance: string }

/** Admin quote builder: price 1-3 found products and send them as options side by side. */
export function OptionsBuilder({ req, onSent }: { req: api.AdminRequest; onSent: () => Promise<void> }) {
  const firstListing = (req.listings.find(l => l.is_chosen) ?? req.listings[0])?.id
  const [shared, setShared] = useState({ fx: '', markup: '0', fee: '12', feeMin: '15', message: '' })
  const [opts, setOpts] = useState<OptionDraft[]>([{ listing_id: firstListing ? String(firstListing) : '', freight: '0', insurance: '0' }])
  const [preview, setPreview] = useState<(api.QuotePreview & { listing_id: number })[] | null>(null)
  const [previewErr, setPreviewErr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.getFx().then(f => setShared(s => ({ ...s, fx: s.fx || f.rate.toFixed(4) }))).catch(() => {}) }, [])

  const inputs = useMemo<api.QuoteBuildInput[] | null>(() => {
    if (opts.some(o => !o.listing_id)) return null
    const fx = shared.fx.trim() === '' ? null : Number(shared.fx)
    return opts.map(o => ({
      listing_id: Number(o.listing_id), fx_cny_usd: fx,
      freight_cost_bsd: Number(o.freight) || 0, freight_markup_pct: (Number(shared.markup) || 0) / 100,
      insurance_bsd: Number(o.insurance) || 0,
      service_fee_pct: (Number(shared.fee) || 0) / 100, service_fee_min_bsd: Number(shared.feeMin) || 0,
    }))
  }, [opts, shared])

  useEffect(() => {
    if (!inputs) { setPreview(null); return }
    const t = setTimeout(() => {
      api.previewProposal(req.id, inputs).then(p => { setPreview(p); setPreviewErr(null) }).catch(e => setPreviewErr(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [req.id, inputs])

  const listingById = (id: string) => req.listings.find(l => String(l.id) === id)
  const setOpt = (i: number, patch: Partial<OptionDraft>) => setOpts(os => os.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  const unused = req.listings.filter(l => !opts.some(o => o.listing_id === String(l.id)))
  const missing = opts.map(o => listingById(o.listing_id)).filter((l): l is api.Listing => !!l && (!l.has_photo || l.specs.length === 0))
  const sentBefore = req.quotes.some(q => q.status === 'sent')

  async function send() {
    if (!inputs) return
    setBusy(true); setError(null)
    try { await api.sendProposal(req.id, inputs, shared.message); await onSent() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const label = opts.length === 1 ? (sentBefore ? 'Send updated quote' : 'Send quote') : `Send ${opts.length} options${sentBefore ? ' (replaces the last ones)' : ''}`

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {opts.map((o, i) => {
          const l = listingById(o.listing_id)
          return (
            <div key={i} className="rounded-2xl border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-[90px_1fr_130px_130px_28px] gap-2 items-end">
              <p className="col-span-2 sm:col-span-1 text-sm font-bold text-slate-900 sm:pb-2.5">Option {i + 1}</p>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelClass} htmlFor={`ol-${i}`}>Listing</label>
                <select id={`ol-${i}`} className={inputClass} value={o.listing_id} onChange={e => setOpt(i, { listing_id: e.target.value })}>
                  {[...(l ? [l] : []), ...unused].map(x => (
                    <option key={x.id} value={x.id}>{x.public_title || x.title || x.platform} · {api.money(x.currency, x.price_cny)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor={`of-${i}`}>Freight (BSD)</label>
                <input id={`of-${i}`} type="number" min={0} step="0.01" className={inputClass} value={o.freight} onChange={e => setOpt(i, { freight: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`oi-${i}`}>Insurance (BSD)</label>
                <input id={`oi-${i}`} type="number" min={0} step="0.01" className={inputClass} value={o.insurance} onChange={e => setOpt(i, { insurance: e.target.value })} />
              </div>
              {opts.length > 1 ? (
                <button type="button" aria-label={`Remove option ${i + 1}`} className="text-slate-400 hover:text-red-600 text-lg sm:pb-2"
                  onClick={() => setOpts(os => os.filter((_, j) => j !== i))}>×</button>
              ) : <span />}
            </div>
          )
        })}
        {opts.length < 3 && unused.length > 0 && (
          <button type="button" className="text-sm font-semibold text-[#c40000]"
            onClick={() => setOpts(os => [...os, { listing_id: String(unused[0].id), freight: os[0]?.freight ?? '0', insurance: '0' }])}>
            + Add another option
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([['fx', 'RMB → USD rate (USD prices: no conversion)', '0.0001'], ['markup', 'Freight markup %', '1'], ['fee', 'Service fee %', '0.5'], ['feeMin', 'Min service fee (BSD)', '1']] as const).map(([k, l, step]) => (
          <div key={k}>
            <label className={labelClass} htmlFor={`sh-${k}`}>{l}</label>
            <input id={`sh-${k}`} type="number" min={0} step={step} className={inputClass} value={shared[k]} onChange={e => setShared({ ...shared, [k]: e.target.value })} />
          </div>
        ))}
        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass} htmlFor="sh-msg">Message to customer</label>
          <textarea id="sh-msg" rows={2} className={inputClass} placeholder="e.g. Three good finds. Option 1 is closest to your photo."
            value={shared.message} onChange={e => setShared({ ...shared, message: e.target.value })} />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Customer sees</p>
        <ErrorNote message={previewErr} />
        {preview && (
          <div className={`grid gap-3 ${preview.length === 3 ? 'sm:grid-cols-3' : preview.length === 2 ? 'sm:grid-cols-2' : ''}`}>
            {preview.map((p, i) => (
              <dl key={i} className="text-sm space-y-1 rounded-xl bg-white p-3 border border-slate-100">
                <dt className="font-bold text-slate-900 mb-1 truncate">Option {i + 1}: {listingById(String(p.listing_id))?.public_title || req.product_name}</dt>
                {([['Product', p.product_cost_bsd], ['Shipping to address', p.shipping_bsd], ['Service fee', p.service_fee_bsd]] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-slate-600">{k}</span><span className="tabular-nums">{bsd(v)}</span></div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-extrabold"><span>Total</span><span className="tabular-nums">{bsd(p.total_bsd)}</span></div>
                <p className="text-xs font-semibold text-emerald-700">Your margin: {bsd(p.margin_bsd)} <span className="font-normal text-slate-500">(private)</span></p>
                {req.target_price_bsd != null && p.total_bsd > req.target_price_bsd && (
                  <p className="text-xs text-amber-700">Over budget ({bsd(req.target_price_bsd)})</p>
                )}
              </dl>
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-amber-700 mt-3">
            {missing.map(l => l.public_title || l.title || `Listing ${l.id}`).join(', ')}: add a photo and comparison under “Customer view” so the customer can compare.
          </p>
        )}
        <ErrorNote message={error} />
        <button disabled={busy || !preview || !inputs} className={`${primaryBtn} w-full mt-4`} onClick={send}>{label}</button>
      </div>
    </div>
  )
}
