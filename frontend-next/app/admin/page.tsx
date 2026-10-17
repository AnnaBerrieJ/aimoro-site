'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, StatusBadge } from '@/components/agent/ui'
import * as api from '@/lib/agent'
import { STATUS_LABELS, bsd, locationText, shortDate, type RequestStatus } from '@/lib/agent'

const FILTERS: (RequestStatus | 'all')[] = ['all', 'received', 'sourcing', 'quote_ready', 'paid', 'ordered', 'shipped', 'delivered', 'cancelled']

function AdminQueue() {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all')
  const [rows, setRows] = useState<api.AdminRequest[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    api.adminRequests(filter === 'all' ? undefined : filter).then(setRows).catch(e => setError(e.message))
  }, [filter])
  useEffect(() => { api.adminSummary().then(setCounts).catch(() => {}) }, [])
  const [drafts, setDrafts] = useState<api.EmailDraftBrief[]>([])
  useEffect(() => { api.emailDrafts().then(setDrafts).catch(() => {}) }, [])

  const needsAction = (counts.received ?? 0) + (counts.sourcing ?? 0) + (counts.paid ?? 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader title="Request queue" subtitle={`${needsAction} ${needsAction === 1 ? 'request needs' : 'requests need'} action: new, being sourced, or paid and waiting to be ordered.`} />
      {drafts.length > 0 && (
        <Card className="!p-4 mb-4 border-2 border-amber-200 bg-amber-50/60">
          <p className="text-sm font-bold text-amber-900 mb-2">
            {drafts.length} customer {drafts.length === 1 ? 'email is' : 'emails are'} waiting for your review
          </p>
          <ul className="space-y-1 text-sm">
            {drafts.map(d => (
              <li key={d.id}>
                <Link href={`/admin/requests/${d.request_id}#emails`} className="text-slate-800 hover:text-[#c40000]">
                  <span className="font-semibold">#{d.request_id} · {d.customer_name}</span> · {d.subject}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f ? 'bg-[#c40000] text-white border-[#c40000]' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f === 'all' ? 'All' : STATUS_LABELS[f]}{f !== 'all' && counts[f] ? ` · ${counts[f]}` : ''}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {rows === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows?.length === 0 && <Card><p className="text-sm text-slate-500">Nothing here.</p></Card>}
      <div className="space-y-2">
        {rows?.map(r => (
          <Link key={r.id} href={`/admin/requests/${r.id}`} className="block">
            <Card className="hover:shadow-card-hover transition-shadow !p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">#{r.id} · {r.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {r.customer.name} · {locationText(r.customer)} · Qty {r.quantity}
                    {r.target_price_bsd != null && ` · budget ${bsd(r.target_price_bsd)}`} · {shortDate(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{r.listings.length} listing{r.listings.length === 1 ? '' : 's'}</span>
                  {r.quote && <span className="text-sm font-bold tabular-nums">{bsd(r.quote.total_bsd)}</span>}
                  <StatusBadge status={r.status} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return <RequireAuth admin><AdminQueue /></RequireAuth>
}
