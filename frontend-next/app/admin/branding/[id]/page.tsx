'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import { BrandingBadge, BrandingFileGrid, BrandingSteps, ProofRounds, UploadBox } from '@/components/agent/BrandingParts'
import { Timeline } from '@/components/agent/Timeline'
import * as api from '@/lib/agent'
import { BRANDING_LABELS, bsd, dateTime, locationText, shortDate, whatsappLink, type BrandingStatus } from '@/lib/agent'

const STATUSES = Object.keys(BRANDING_LABELS) as BrandingStatus[]
const projectUrl = (id: number) =>
  `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://aimoro.co')}/my-branding/${id}`

function AdminBrandingDetail() {
  const id = Number(useParams<{ id: string }>().id)
  const [p, setP] = useState<api.AdminBrandingProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [payRef, setPayRef] = useState('')

  const load = useCallback(async () => {
    try { const d = await api.adminBranding(id); setP(d); setNotes(d.admin_notes) } catch (e) { setError((e as Error).message) }
  }, [id])
  useEffect(() => { load() }, [load])

  async function act(fn: () => Promise<api.AdminBrandingProject | void>) {
    setBusy(true); setError(null)
    try { const d = await fn(); if (d) setP(d) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (!p) {
    return <div className="max-w-6xl mx-auto px-4 py-8"><ErrorNote message={error} />{!error && <p className="text-sm text-slate-500">Loading…</p>}</div>
  }

  const refs = p.files.filter(f => f.kind === 'reference')
  const finals = p.files.filter(f => f.kind === 'final')
  const del = (fileId: number) => act(() => api.adminDeleteBrandingFile(fileId))
  const lastChange = p.events.find(e => e.kind === 'changes')
  const first = p.customer.name.split(' ')[0]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <Link href="/admin/branding" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Branding projects</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">#{p.id} · {p.business_name}</h1>
          <p className="text-xs text-slate-500 mt-1">{p.package_name} package · {bsd(p.price_bsd)} · {shortDate(p.created_at)} · Invoice {p.invoice_number}</p>
        </div>
        <BrandingBadge status={p.status} />
      </div>
      <BrandingSteps status={p.status} />
      <ErrorNote message={error} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          {/* Next step */}
          {p.status === 'awaiting_payment' && (
            <Card className="border-2 border-amber-200">
              <h2 className="font-bold text-slate-900 mb-1">Confirm payment</h2>
              <p className="text-sm text-slate-600 mb-3">When {first}&apos;s payment for {p.invoice_number} arrives, confirm it here. They get an email and the project moves to design.</p>
              <div className="flex flex-wrap gap-2">
                <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Payment reference, e.g. RBC-1234 or PayPal" className={`${inputClass} flex-1 min-w-[200px]`} />
                <button disabled={busy} className={primaryBtn} onClick={() => act(() => api.adminBrandingMarkPaid(p.id, payRef.trim() || 'bank transfer'))}>Mark paid</button>
              </div>
            </Card>
          )}

          {['in_design', 'changes_requested', 'proofs_ready'].includes(p.status) && (
            <Card className={p.status === 'proofs_ready' ? '' : 'border-2 border-amber-200'}>
              <h2 className="font-bold text-slate-900 mb-1">
                {p.status === 'proofs_ready' ? `Add files to proof set ${p.proof_round}` : `Send proof set ${p.proof_round + 1}`}
              </h2>
              {p.status === 'changes_requested' && lastChange && (
                <p className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3 whitespace-pre-wrap">{lastChange.message.replace(/^You asked/, `${first} asked`)}</p>
              )}
              <p className="text-sm text-slate-600 mb-3">
                {p.status === 'proofs_ready'
                  ? 'The customer is reviewing these. Anything you add goes into the same set and they get another email.'
                  : `The customer gets an email to approve or ask for changes. ${p.changes_left} of ${p.rounds_included} change round${p.rounds_included === 1 ? '' : 's'} left.`}
              </p>
              <UploadBox label="Proof files (logo options, mockups, PDF)" button="Send proofs to customer" withMessage
                messagePlaceholder="Optional note for the customer, e.g. 'Option A uses your teal, option B is bolder.'"
                onUpload={(files, message, onProgress) => api.adminSendProofs(p.id, files, message, onProgress).then(setP)} />
            </Card>
          )}

          {['approved', 'completed'].includes(p.status) && (
            <Card className={p.status === 'approved' ? 'border-2 border-amber-200' : ''}>
              <h2 className="font-bold text-slate-900 mb-1">{p.status === 'approved' ? 'Deliver final files' : 'Add more final files'}</h2>
              <p className="text-sm text-slate-600 mb-3">
                {p.status === 'approved'
                  ? 'Upload the final logo files, colour codes, mockups and brand guide. Delivering them completes the project and emails the customer.'
                  : 'The project is complete. Anything you add here is emailed to the customer.'}
              </p>
              <UploadBox label="Final files" button={p.status === 'approved' ? 'Deliver final files' : 'Add files'} withMessage
                hint="Tip: a ZIP with PNG, SVG and PDF versions is easiest for the customer."
                messagePlaceholder="Optional note for the customer"
                onUpload={(files, message, onProgress) => api.adminDeliverFinals(p.id, files, message, onProgress).then(setP)} />
            </Card>
          )}

          <Card>
            <h2 className="font-bold text-slate-900 mb-3">Proofs</h2>
            <ProofRounds projectId={p.id} files={p.files} onDelete={del} />
          </Card>

          {finals.length > 0 && (
            <Card>
              <h2 className="font-bold text-slate-900 mb-3">Final files</h2>
              <BrandingFileGrid projectId={p.id} files={finals} onDelete={del} />
            </Card>
          )}

          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Brief</h2>
            <dl className="text-sm space-y-1">
              {p.industry && <div><dt className="inline text-slate-500">Business: </dt><dd className="inline">{p.industry}</dd></div>}
              {p.description && <div><dt className="inline text-slate-500">About: </dt><dd className="inline whitespace-pre-wrap">{p.description}</dd></div>}
              {p.style_notes && <div><dt className="inline text-slate-500">Style: </dt><dd className="inline whitespace-pre-wrap">{p.style_notes}</dd></div>}
              {p.colours && <div><dt className="inline text-slate-500">Colours: </dt><dd className="inline">{p.colours}</dd></div>}
              {p.reference_url && <div><dt className="inline text-slate-500">Examples: </dt><dd className="inline break-all"><a className="text-[#c40000] underline" href={p.reference_url} target="_blank" rel="noopener noreferrer">{p.reference_url}</a></dd></div>}
              {!p.industry && !p.description && !p.style_notes && !p.colours && !p.reference_url && <p className="text-slate-500">No details given.</p>}
            </dl>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-4 mb-2">Customer&apos;s files</p>
            <BrandingFileGrid projectId={p.id} files={refs} empty="None uploaded." />
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 mb-3">Timeline</h2>
            <Timeline items={p.events} action={e => e.customer_visible === false ? null : (
              <a className="text-xs font-semibold text-emerald-700 hover:underline" target="_blank" rel="noopener noreferrer"
                href={whatsappLink(p.customer.phone, `Hi ${first}, update on your AIMORO branding project "${p.business_name}": ${e.message}\n\nView your project: ${projectUrl(p.id)}`)}>
                Send on WhatsApp
              </a>
            )} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Customer</h2>
            <p className="text-sm font-semibold">{p.customer.name}</p>
            <p className="text-sm text-slate-600 break-all">{p.customer.email}</p>
            {p.customer.phone && (
              <p className="text-sm text-slate-600">{p.customer.phone} · <a className="text-[#c40000] font-semibold" target="_blank" rel="noopener noreferrer"
                href={whatsappLink(p.customer.phone)}>WhatsApp</a></p>
            )}
            <p className="text-sm text-slate-600">{locationText(p.customer)}</p>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Package</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Package</dt><dd className="font-semibold">{p.package_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-semibold tabular-nums">{bsd(p.price_bsd)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd>{p.paid_at ? `${shortDate(p.paid_at)}${p.payment_ref ? ` · ${p.payment_ref}` : ''}` : 'Not yet'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Proof sets sent</dt><dd>{p.proof_round}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Change rounds used</dt><dd>{p.changes_used} of {p.rounds_included}</dd></div>
            </dl>
            <button className={`${secondaryBtn} w-full mt-3`} onClick={() => api.downloadBrandingInvoice(p).catch(e => setError(e.message))}>Download invoice</button>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Status & notes</h2>
            <label className={labelClass} htmlFor="status">Status (override)</label>
            <select id="status" className={inputClass} value={p.status} disabled={busy}
              onChange={e => act(() => api.adminUpdateBranding(p.id, { status: e.target.value as BrandingStatus }))}>
              {STATUSES.map(s => <option key={s} value={s}>{BRANDING_LABELS[s]}</option>)}
            </select>
            <label className={`${labelClass} mt-3`} htmlFor="notes">Private notes</label>
            <textarea id="notes" rows={4} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} />
            <button disabled={busy} className={`${secondaryBtn} w-full mt-3`}
              onClick={() => act(() => api.adminUpdateBranding(p.id, { admin_notes: notes }))}>Save notes</button>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 mb-2">Emails</h2>
            {p.notifications.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : (
              <ul className="space-y-2 text-xs">
                {p.notifications.map(n => (
                  <li key={n.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="font-semibold text-slate-800">{n.subject}</p>
                    <p className="text-slate-500">{n.to_address} · {dateTime(n.created_at)} · <span className={n.status === 'failed' ? 'text-red-600 font-semibold' : ''}>{n.status}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AdminBrandingDetailPage() {
  return <RequireAuth admin><AdminBrandingDetail /></RequireAuth>
}
