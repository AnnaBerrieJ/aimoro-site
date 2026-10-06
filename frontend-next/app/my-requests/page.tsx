'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, StatusBadge, primaryBtn } from '@/components/agent/ui'
import { bsd, myRequests, shortDate, type ProductRequest } from '@/lib/agent'

function RequestList() {
  const [rows, setRows] = useState<ProductRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    myRequests().then(setRows).catch(e => setError(e.message))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title="My requests"
        subtitle="Everything you've asked us to source, with quotes and delivery status."
        action={<Link href="/my-requests/new" className={primaryBtn}>+ New request</Link>}
      />
      <ErrorNote message={error} />
      {rows === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows?.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-slate-700 font-semibold">No requests yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">Tell us what you're looking for and we'll send you a quote.</p>
          <Link href="/my-requests/new" className={primaryBtn}>Make your first request</Link>
        </Card>
      )}
      <div className="space-y-3">
        {rows?.map(r => (
          <Link key={r.id} href={`/my-requests/${r.id}`} className="block">
            <Card className="hover:shadow-card-hover transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{r.product_name}</p>
                  <p className="text-xs text-slate-500">#{r.id} · Qty {r.quantity} · {shortDate(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {r.quote && r.quote.status !== 'superseded' && (
                    <span className="text-sm font-bold text-slate-900">{bsd(r.quote.total_bsd)}</span>
                  )}
                  <StatusBadge status={r.status} />
                </div>
              </div>
              {r.status === 'quote_ready' && r.quote?.status === 'sent' && (
                <p className="text-xs font-semibold text-amber-700 mt-2">Your quote is ready. Review and approve it.</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function MyRequestsPage() {
  return <RequireAuth><RequestList /></RequireAuth>
}
