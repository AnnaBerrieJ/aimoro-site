'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, primaryBtn } from '@/components/agent/ui'
import { BrandingBadge } from '@/components/agent/BrandingParts'
import { bsd, myBranding, shortDate, type BrandingProject } from '@/lib/agent'

const PROMPTS: Partial<Record<BrandingProject['status'], string>> = {
  awaiting_payment: 'Pay your invoice so we can start designing.',
  proofs_ready: 'Your proofs are ready. Review and approve them, or ask for changes.',
  completed: 'Your final files are ready to download.',
}

function BrandingList() {
  const [rows, setRows] = useState<BrandingProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { myBranding().then(setRows).catch(e => setError(e.message)) }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader title="My branding" subtitle="Your logo and brand design projects, proofs and final files."
        action={<Link href="/my-branding/new" className={primaryBtn}>+ New branding project</Link>} />
      <ErrorNote message={error} />
      {rows === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows?.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-slate-700 font-semibold">No branding projects yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">Get a logo, brand colours and mockups designed for your business.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/my-branding/new" className={primaryBtn}>Start a branding project</Link>
            <Link href="/branding#packages" className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">See packages</Link>
          </div>
        </Card>
      )}
      <div className="space-y-3">
        {rows?.map(p => (
          <Link key={p.id} href={`/my-branding/${p.id}`} className="block">
            <Card className="hover:shadow-card-hover transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{p.business_name}</p>
                  <p className="text-xs text-slate-500">#{p.id} · {p.package_name} package · {shortDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{bsd(p.price_bsd)}</span>
                  <BrandingBadge status={p.status} />
                </div>
              </div>
              {PROMPTS[p.status] && <p className="text-xs font-semibold text-amber-700 mt-2">{PROMPTS[p.status]}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function MyBrandingPage() {
  return <RequireAuth><BrandingList /></RequireAuth>
}
