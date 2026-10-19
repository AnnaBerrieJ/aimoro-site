'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader } from '@/components/agent/ui'
import { BrandingBadge } from '@/components/agent/BrandingParts'
import * as api from '@/lib/agent'
import { BRANDING_LABELS, bsd, locationText, shortDate, type BrandingStatus } from '@/lib/agent'

const FILTERS: (BrandingStatus | 'all')[] = ['all', 'awaiting_payment', 'in_design', 'changes_requested', 'proofs_ready', 'approved', 'completed', 'cancelled']
// What Ashley needs to do next, by status.
const NEXT: Partial<Record<BrandingStatus, string>> = {
  awaiting_payment: 'Waiting for payment',
  in_design: 'Send first proofs',
  changes_requested: 'Make changes, send new proofs',
  proofs_ready: 'Waiting for customer',
  approved: 'Upload final files',
}

function BrandingQueue() {
  const [filter, setFilter] = useState<BrandingStatus | 'all'>('all')
  const [rows, setRows] = useState<api.AdminBrandingProject[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    api.adminBrandingList(filter === 'all' ? undefined : filter).then(setRows).catch(e => setError(e.message))
  }, [filter])
  useEffect(() => { api.adminBrandingSummary().then(setCounts).catch(() => {}) }, [])

  const todo = (counts.in_design ?? 0) + (counts.changes_requested ?? 0) + (counts.approved ?? 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader title="Branding projects"
        subtitle={`${todo} ${todo === 1 ? 'project needs' : 'projects need'} your design work: first proofs, changes or final files.`} />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f ? 'bg-[#c40000] text-white border-[#c40000]' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f === 'all' ? 'All' : BRANDING_LABELS[f]}{f !== 'all' && counts[f] ? ` · ${counts[f]}` : ''}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {rows === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows?.length === 0 && <Card><p className="text-sm text-slate-500">Nothing here.</p></Card>}
      <div className="space-y-2">
        {rows?.map(p => (
          <Link key={p.id} href={`/admin/branding/${p.id}`} className="block">
            <Card className="hover:shadow-card-hover transition-shadow !p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {p.admin_unread && <span className="inline-block w-2 h-2 rounded-full bg-[#c40000] mr-2 align-middle" aria-label="Unread" />}
                    #{p.id} · {p.business_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.customer.name} · {locationText(p.customer)} · {p.package_name} · {shortDate(p.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {NEXT[p.status] && <span className="text-xs font-semibold text-amber-700">{NEXT[p.status]}</span>}
                  <span className="text-sm font-bold tabular-nums">{bsd(p.price_bsd)}</span>
                  <BrandingBadge status={p.status} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function AdminBrandingPage() {
  return <RequireAuth admin><BrandingQueue /></RequireAuth>
}
