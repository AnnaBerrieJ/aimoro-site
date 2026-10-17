'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/agent'
import { ATTACHMENT_LABELS, dateTime, type AttachmentKind, type EmailTemplate, type NotificationLog } from '@/lib/agent'
import { Card, ErrorNote, inputClass, labelClass, primaryBtn, secondaryBtn } from './ui'

interface Draft { subject: string; body: string; attachments: AttachmentKind[] }

const STATUS_STYLE: Record<NotificationLog['status'], string> = {
  draft: 'text-amber-700', queued: 'text-slate-500', sent: 'text-emerald-700', skipped: 'text-slate-400',
  failed: 'text-red-600', discarded: 'text-slate-400',
}

/** Admin email centre for one request: review automatic emails before they send, or write new ones from templates. */
export function EmailCenter({ req, onChanged }: { req: api.AdminRequest; onChanged: () => Promise<void> }) {
  const drafts = req.notifications.filter(n => n.status === 'draft' && n.to_address === req.customer.email)
  const history = req.notifications.filter(n => n.status !== 'draft')
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null)
  const [composing, setComposing] = useState<Draft | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.emailTemplates(req.id).then(setTemplates).catch(e => setError(e.message)) }, [req.id, req.quotes.length, req.status])

  function startNew(key: string) {
    const t = templates?.find(x => x.key === key)
    if (t) setComposing({ subject: t.subject, body: t.body, attachments: t.attachments })
  }

  return (
    <Card className="space-y-4" >
      <div id="emails" className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Emails to {req.customer.name}</h2>
          <p className="text-xs text-slate-500">{req.customer.email}</p>
        </div>
        {!composing && templates && (
          <select aria-label="New email from template" className={`${inputClass} !w-auto`} value=""
            onChange={e => startNew(e.target.value)}>
            <option value="" disabled>+ New email from template…</option>
            {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        )}
      </div>
      <ErrorNote message={error} />

      {drafts.map(d => (
        <EmailEditor key={d.id} heading="Waiting for your review" note="This automatic email has not been sent. Edit it, then send it, or discard it."
          initial={{ subject: d.subject, body: d.body, attachments: d.attachments }} templates={templates}
          onSave={async v => { await api.updateEmail(d.id, v); await onChanged() }}
          onSend={async v => { await api.updateEmail(d.id, v); await api.sendEmail(d.id); await onChanged() }}
          onDiscard={async () => { await api.discardEmail(d.id); await onChanged() }} />
      ))}

      {composing && (
        <EmailEditor heading="New email" initial={composing} templates={templates}
          onSave={async v => { await api.createEmail(req.id, { ...v, send: false }); setComposing(null); await onChanged() }}
          onSend={async v => { await api.createEmail(req.id, { ...v, send: true }); setComposing(null); await onChanged() }}
          onDiscard={async () => setComposing(null)} discardLabel="Cancel" />
      )}

      {!drafts.length && !composing && (
        <p className="text-sm text-slate-500">No emails waiting. Pick a template above to write one; it fills in this customer's details and options.</p>
      )}

      {history.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button className="text-xs font-semibold text-slate-600" onClick={() => setShowHistory(v => !v)}>
            {showHistory ? 'Hide' : 'Show'} email history ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {history.map(n => (
                <li key={n.id} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-slate-800">{n.subject}</span>
                    <span className={`text-xs font-semibold ${STATUS_STYLE[n.status]}`}>{n.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {n.to_address} · {dateTime(n.sent_at ?? n.created_at)}
                    {n.attachments.length > 0 && ` · ${n.attachments.length} attachment${n.attachments.length > 1 ? 's' : ''}`}
                    {n.error ? ` · ${n.error}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

function EmailEditor({ heading, note, initial, templates, onSave, onSend, onDiscard, discardLabel = 'Discard' }: {
  heading: string; note?: string; initial: Draft; templates: EmailTemplate[] | null
  onSave: (d: Draft) => Promise<void>; onSend: (d: Draft) => Promise<void>; onDiscard: () => Promise<void>
  discardLabel?: string
}) {
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError((e as Error).message); setConfirmSend(false) } finally { setBusy(false) }
  }
  const toggle = (k: AttachmentKind) =>
    setD(x => ({ ...x, attachments: x.attachments.includes(k) ? x.attachments.filter(a => a !== k) : [...x.attachments, k] }))

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{heading}</p>
          {note && <p className="text-xs text-slate-600">{note}</p>}
        </div>
        {templates && (
          <select aria-label="Use a template" className={`${inputClass} !w-auto !py-1.5 text-xs`} value=""
            onChange={e => { const t = templates.find(x => x.key === e.target.value); if (t) setD({ subject: t.subject, body: t.body, attachments: t.attachments }) }}>
            <option value="" disabled>Replace with template…</option>
            {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        )}
      </div>
      <div>
        <label className={labelClass}>Subject</label>
        <input aria-label="Subject" className={inputClass} value={d.subject} maxLength={255}
          onChange={e => setD({ ...d, subject: e.target.value })} />
      </div>
      <div>
        <label className={labelClass}>Message</label>
        <textarea aria-label="Message" rows={16} className={`${inputClass} text-sm leading-6`} value={d.body}
          onChange={e => setD({ ...d, body: e.target.value })} />
        <p className="text-[11px] text-slate-500 mt-1">
          Blank line = new paragraph · start a line with <b>*</b> for bullets or <b>1.</b> for a numbered list · <b>**text**</b> for bold.
          Your logo signature is added automatically.
        </p>
      </div>
      <div>
        <p className={labelClass}>Attach</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(Object.keys(ATTACHMENT_LABELS) as AttachmentKind[]).map(k => (
            <label key={k} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={d.attachments.includes(k)} onChange={() => toggle(k)} /> {ATTACHMENT_LABELS[k]}
            </label>
          ))}
        </div>
      </div>
      <ErrorNote message={error} />
      <div className="flex flex-wrap gap-2">
        {confirmSend ? (
          <>
            <button disabled={busy} className={primaryBtn} onClick={() => run(() => onSend(d))}>Yes, send now</button>
            <button disabled={busy} className={secondaryBtn} onClick={() => setConfirmSend(false)}>Not yet</button>
          </>
        ) : (
          <button disabled={busy || !d.subject.trim() || !d.body.trim()} className={primaryBtn} onClick={() => setConfirmSend(true)}>Send</button>
        )}
        <button disabled={busy} className={secondaryBtn}
          onClick={() => run(async () => setPreview((await api.previewEmail(d.body)).html))}>Preview</button>
        <button disabled={busy || !d.subject.trim() || !d.body.trim()} className={secondaryBtn} onClick={() => run(() => onSave(d))}>Save draft</button>
        <button disabled={busy} className="text-sm font-semibold text-slate-500 hover:text-red-600 px-2" onClick={() => run(onDiscard)}>{discardLabel}</button>
      </div>

      {preview !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Preview</p>
                <p className="font-bold text-slate-900 truncate">{d.subject}</p>
              </div>
              <button className={secondaryBtn} onClick={() => setPreview(null)}>Close</button>
            </div>
            <iframe title="Email preview" srcDoc={preview} className="w-full flex-1 min-h-[60vh] bg-[#F1F5F9]" />
            {d.attachments.length > 0 && (
              <p className="px-4 py-2 text-xs text-slate-600 border-t border-slate-200">
                Attached: {d.attachments.map(a => ATTACHMENT_LABELS[a]).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
