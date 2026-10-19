'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, inputClass, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import { BrandingFileGrid, BrandingSteps, ProofRounds, UploadBox } from '@/components/agent/BrandingParts'
import { Timeline } from '@/components/agent/Timeline'
import * as api from '@/lib/agent'
import { CONTACT_WHATSAPP, bsd, shortDate, whatsappLink } from '@/lib/agent'

function BrandingDetail() {
  const id = Number(useParams<{ id: string }>().id)
  const params = useSearchParams()
  const [p, setP] = useState<api.BrandingProject | null>(null)
  const [payCfg, setPayCfg] = useState<{ stripe_enabled: boolean; bank_instructions: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showChanges, setShowChanges] = useState(false)

  const load = useCallback(async () => {
    try { setP(await api.getBranding(id)) } catch (e) { setError((e as Error).message) }
  }, [id])
  useEffect(() => { load(); api.paymentConfig().then(setPayCfg).catch(() => {}) }, [load])

  // Returning from Stripe Checkout
  useEffect(() => {
    const session = params.get('session_id')
    if (params.get('paid') && session) api.confirmBrandingPayment(id, session).then(setP).catch(e => setError(e.message))
  }, [params, id])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!p) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><ErrorNote message={error} />{!error && <p className="text-sm text-slate-500">Loading…</p>}</div>
  }

  const refs = p.files.filter(f => f.kind === 'reference')
  const finals = p.files.filter(f => f.kind === 'final')
  const hasProofs = p.files.some(f => f.kind === 'proof')
  const unpaid = !p.paid_at && p.status !== 'cancelled'
  const closed = p.status === 'completed' || p.status === 'cancelled'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Link href="/my-branding" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← My branding</Link>
      {params.get('new') && unpaid && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          Thanks! Your branding request is in. Pay your invoice below and we'll start designing.
          {params.get('upload_failed') && ' Your files didn’t upload, so please add them again below.'}
        </p>
      )}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{p.business_name}</h1>
        <p className="text-xs text-slate-500 mt-1">{p.package_name} branding package · Project #{p.id} · {shortDate(p.created_at)}</p>
      </div>
      <BrandingSteps status={p.status} />
      <ErrorNote message={error} />

      {/* Invoice */}
      {p.status !== 'cancelled' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900">Invoice {p.invoice_number}</h2>
              <p className="text-sm text-slate-500">
                {bsd(p.price_bsd)} · {p.paid_at ? `Paid ${shortDate(p.paid_at)}` : `Due by ${p.invoice_due ? shortDate(p.invoice_due) : ''}`}
              </p>
            </div>
            <button className={secondaryBtn} onClick={() => act(() => api.downloadBrandingInvoice(p))}>Download PDF</button>
          </div>
          {unpaid && payCfg && (
            <div className="mt-4 space-y-3">
              {payCfg.stripe_enabled && (
                <button disabled={busy} className={`${primaryBtn} w-full`}
                  onClick={() => act(async () => { window.location.href = (await api.startBrandingCheckout(p.id)).url })}>
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

      {/* Proofs + decision */}
      {(hasProofs || p.status === 'in_design' || p.status === 'changes_requested') && (
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="font-bold text-slate-900">Design proofs</h2>
            <span className="text-xs text-slate-500">
              {p.changes_left} of {p.rounds_included} change round{p.rounds_included === 1 ? '' : 's'} left
            </span>
          </div>
          {p.status === 'in_design' && !hasProofs && <p className="text-sm text-slate-600 mb-3">We're working on your first designs. You'll get an email as soon as they're ready to review here.</p>}
          {p.status === 'changes_requested' && <p className="text-sm text-slate-600 mb-3">We're making your changes. Your next proof set will appear here.</p>}
          <ProofRounds projectId={p.id} files={p.files} />

          {p.status === 'proofs_ready' && (
            <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Happy with proof set {p.proof_round}?</p>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} className={primaryBtn}
                  onClick={() => { if (confirm('Approve these designs? We’ll prepare your final files.')) act(async () => setP(await api.approveBranding(p.id))) }}>
                  Approve designs
                </button>
                {p.changes_left > 0 ? (
                  <button disabled={busy} className={secondaryBtn} onClick={() => setShowChanges(s => !s)}>Ask for changes</button>
                ) : (
                  <a href={whatsappLink(CONTACT_WHATSAPP, `Hi AIMORO, I'd like extra changes on branding project #${p.id} (${p.business_name}).`)}
                    target="_blank" rel="noopener noreferrer" className={secondaryBtn}>Ask about extra changes</a>
                )}
              </div>
              {p.changes_left === 0 && <p className="text-xs text-slate-500">You've used the change rounds in your package. Extra changes are available as an add-on.</p>}
              {showChanges && p.changes_left > 0 && (
                <div className="space-y-2">
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className={inputClass}
                    placeholder="What would you like changed? Be as specific as you can: colours, fonts, layout, which option you prefer." />
                  <button disabled={busy || feedback.trim().length < 3} className={primaryBtn}
                    onClick={() => act(async () => { setP(await api.requestBrandingChanges(p.id, feedback.trim())); setFeedback(''); setShowChanges(false) })}>
                    Send changes ({p.changes_left - 1} round{p.changes_left - 1 === 1 ? '' : 's'} left after this)
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Final files */}
      {(finals.length > 0 || p.status === 'approved') && (
        <Card className={finals.length ? 'border-2 border-emerald-200' : ''}>
          <h2 className="font-bold text-slate-900 mb-1">Your final brand files</h2>
          <p className="text-sm text-slate-600 mb-3">
            {finals.length ? 'Download and keep these safe. Need products made with your new logo? Start a product request any time.'
              : 'You approved your designs. We’re preparing your final files now.'}
          </p>
          <BrandingFileGrid projectId={p.id} files={finals} />
          {finals.length > 0 && <Link href="/my-requests/new" className={`${secondaryBtn} mt-4`}>Get products made with my logo</Link>}
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-slate-900 mb-3">Updates</h2>
        <Timeline items={p.timeline} />
      </Card>

      <Card>
        <h2 className="font-bold text-slate-900 mb-2">Your brief</h2>
        <dl className="text-sm space-y-1">
          {p.industry && <div><dt className="inline text-slate-500">Business: </dt><dd className="inline">{p.industry}</dd></div>}
          {p.description && <div><dt className="inline text-slate-500">About: </dt><dd className="inline whitespace-pre-wrap">{p.description}</dd></div>}
          {p.style_notes && <div><dt className="inline text-slate-500">Style: </dt><dd className="inline whitespace-pre-wrap">{p.style_notes}</dd></div>}
          {p.colours && <div><dt className="inline text-slate-500">Colours: </dt><dd className="inline">{p.colours}</dd></div>}
          {p.reference_url && <div><dt className="inline text-slate-500">Examples: </dt><dd className="inline break-all"><a className="text-[#c40000] underline" href={p.reference_url} target="_blank" rel="noopener noreferrer">{p.reference_url}</a></dd></div>}
        </dl>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Your files</p>
          <BrandingFileGrid projectId={p.id} files={refs} empty="No files added yet." />
        </div>
        {!closed && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <UploadBox label="Add your current logo or examples you like" button="Upload files"
              onUpload={async (files, _m, onProgress) => setP(await api.uploadBrandingReferences(p.id, files, onProgress))} />
          </div>
        )}
      </Card>

      {p.status === 'awaiting_payment' && (
        <button disabled={busy} className="text-sm font-semibold text-slate-500 hover:text-red-600"
          onClick={() => { if (window.confirm('Cancel this branding request?')) act(async () => setP(await api.cancelBranding(p.id))) }}>
          Cancel request
        </button>
      )}
    </div>
  )
}

export default function BrandingDetailPage() {
  return <RequireAuth><Suspense><BrandingDetail /></Suspense></RequireAuth>
}
