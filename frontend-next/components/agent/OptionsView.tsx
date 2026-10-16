'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/agent'
import { MATCH_LABELS, bsd, shortDate, type CustomerOption, type MatchLevel, type ProductRequest } from '@/lib/agent'
import { Card, primaryBtn, secondaryBtn } from './ui'

const MATCH_STYLES: Record<MatchLevel, string> = {
  match: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  close: 'bg-amber-50 text-amber-800 border-amber-200',
  different: 'bg-red-50 text-red-600 border-red-200',
}

function MatchBadge({ m }: { m: MatchLevel }) {
  return <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${MATCH_STYLES[m]}`}>{MATCH_LABELS[m]}</span>
}

function matchSummary(o: CustomerOption): { text: string; m: MatchLevel } | null {
  if (!o.specs.length) return null
  const n = o.specs.filter(s => s.match === 'match').length
  const close = o.specs.filter(s => s.match === 'close').length
  return {
    text: `${n} of ${o.specs.length} match${close ? `, ${close} close` : ''}`,
    m: n === o.specs.length ? 'match' : n + close > 0 ? 'close' : 'different',
  }
}

function useFileUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) { setUrl(null); return }
    let u: string | null = null
    api.fetchFileUrl(path).then(x => { u = x; setUrl(x) }).catch(() => setUrl(null))
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [path])
  return url
}

function PhotoBox({ url, label, fallback }: { url: string | null; label: string; fallback: string }) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</figcaption>
      <div className="aspect-[4/3] rounded-2xl bg-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt={label} className="w-full h-full object-contain" />
          : <span className="text-xs text-slate-500 text-center px-4 line-clamp-4">{fallback}</span>}
      </div>
    </figure>
  )
}

function Comparison({ o }: { o: CustomerOption }) {
  if (!o.specs.length) return null
  return (
    <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm">
      {o.specs.map((s, i) => (
        <li key={i} className="py-2.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.label}</span>
            <MatchBadge m={s.match} />
          </div>
          <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-0.5">
            <span className="text-slate-500">You asked</span><span className="text-slate-800">{s.requested || '—'}</span>
            <span className="text-slate-500">We found</span><span className="font-semibold text-slate-900">{s.found || '—'}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Prices({ o }: { o: CustomerOption }) {
  return (
    <dl className="text-sm space-y-1">
      {([['Product', o.product_cost_bsd], ['Shipping to your address', o.shipping_bsd], ['Service fee', o.service_fee_bsd]] as const).map(([k, v]) => (
        <div key={k} className="flex justify-between"><dt className="text-slate-600">{k}</dt><dd className="tabular-nums">{bsd(v)}</dd></div>
      ))}
      <div className="flex justify-between border-t border-slate-200 pt-2 mt-1 font-extrabold text-base">
        <dt>Total (BSD)</dt><dd className="tabular-nums">{bsd(o.total_bsd)}</dd>
      </div>
    </dl>
  )
}

/** Customer view of the options we found, side by side with what they asked for. */
export function OptionsView({ req, customerPhotoUrl, busy, onChoose, onDownload }: {
  req: ProductRequest
  customerPhotoUrl: string | null
  busy: boolean
  onChoose: (quoteId: number) => void
  onDownload: () => void
}) {
  const opts = req.options
  const approved = opts.find(o => o.status === 'approved')
  const shown = approved ? [approved] : opts
  const single = shown.length === 1
  const expired = !approved && opts.every(o => o.status === 'expired')
  const canChoose = req.status === 'quote_ready' && !approved && !expired
  const message = req.quote?.message

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {approved ? 'Your choice' : single ? 'Your quote' : `We found ${shown.length} options for you`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {approved ? 'Approved. Your invoice is below.' : expired ? 'Expired' : `Valid until ${shortDate(shown[0].expires_at)}`}
            {!approved && !single && ' · Compare them with what you asked for and choose one.'}
          </p>
        </div>
        <button type="button" className={secondaryBtn} onClick={onDownload}>Download PDF</button>
      </div>
      {message && !approved && <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{message}</p>}

      {single ? (
        <SingleOption req={req} o={shown[0]} customerPhotoUrl={customerPhotoUrl} busy={busy}
          canChoose={canChoose} onChoose={onChoose} />
      ) : (
        <>
          <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[140px_1fr] gap-4 items-start rounded-2xl bg-slate-50 p-4">
            <div className="aspect-square rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
              {customerPhotoUrl ? <img src={customerPhotoUrl} alt="Your photo" className="w-full h-full object-contain" />
                : <span className="text-xs text-slate-400 px-2 text-center">No photo</span>}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What you asked for</p>
              <p className="font-bold text-slate-900 mt-1">{req.product_name} × {req.quantity}</p>
              {req.description && <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{req.description}</p>}
              {req.target_price_bsd != null && <p className="text-sm text-slate-500 mt-1">Budget: {bsd(req.target_price_bsd)}</p>}
            </div>
          </div>
          <div className={`grid gap-4 ${shown.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
            {shown.map(o => <OptionCard key={o.id} req={req} o={o} busy={busy} canChoose={canChoose} onChoose={onChoose} />)}
          </div>
        </>
      )}
      {expired && <p className="text-sm text-amber-700">These prices have expired. We&apos;ll send you updated ones.</p>}
    </Card>
  )
}

function OptionCard({ req, o, busy, canChoose, onChoose }: {
  req: ProductRequest; o: CustomerOption; busy: boolean; canChoose: boolean; onChoose: (id: number) => void
}) {
  const photo = useFileUrl(o.has_photo ? api.optionPhotoPath(req.id, o.id) : null)
  const summary = matchSummary(o)
  return (
    <article className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#c40000]">Option {o.option_number}</span>
        {summary && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${MATCH_STYLES[summary.m]}`}>{summary.text}</span>}
      </div>
      <PhotoBox url={photo} label="We found" fallback="Photo not available" />
      <h3 className="font-bold text-slate-900 leading-snug">{o.title}</h3>
      <Comparison o={o} />
      {o.notes && <p className="text-sm text-slate-600">{o.notes}</p>}
      <div className="mt-auto space-y-3">
        <Prices o={o} />
        {canChoose && o.status === 'sent' && (
          <button disabled={busy} className={`${primaryBtn} w-full`} onClick={() => onChoose(o.id)}>
            Choose option {o.option_number} · {bsd(o.total_bsd)}
          </button>
        )}
      </div>
    </article>
  )
}

function SingleOption({ req, o, customerPhotoUrl, busy, canChoose, onChoose }: {
  req: ProductRequest; o: CustomerOption; customerPhotoUrl: string | null; busy: boolean
  canChoose: boolean; onChoose: (id: number) => void
}) {
  const photo = useFileUrl(o.has_photo ? api.optionPhotoPath(req.id, o.id) : null)
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-slate-900">{o.title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <PhotoBox url={customerPhotoUrl} label="You asked for" fallback={req.description || req.product_name} />
        <PhotoBox url={photo} label="We found" fallback="Photo not available" />
      </div>
      {o.specs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-2">Detail</th><th className="pr-2">You asked for</th><th className="pr-2">We found</th><th className="text-right">Match</th>
              </tr>
            </thead>
            <tbody>
              {o.specs.map((s, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2.5 pr-2 font-semibold text-slate-900">{s.label}</td>
                  <td className="pr-2 text-slate-700">{s.requested || '—'}</td>
                  <td className="pr-2 font-semibold text-slate-900">{s.found || '—'}</td>
                  <td className="text-right"><MatchBadge m={s.match} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {o.notes && <p className="text-sm text-slate-600">{o.notes}</p>}
      <Prices o={o} />
      {canChoose && o.status === 'sent' && (
        <button disabled={busy} className={`${primaryBtn} w-full`} onClick={() => onChoose(o.id)}>Approve quote · {bsd(o.total_bsd)}</button>
      )}
    </div>
  )
}
