'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MetricCard } from '@/components/MetricCard'
import { getCatalogSnapshot, getSavedSuppliers } from '@/lib/api'
import type { Supplier, SavedSupplier } from '@/lib/types'

const STEPS = [
  {
    n: '1',
    title: 'Search & Score',
    copy: "Enter a product, country, and price target. Aimoro's ML model ranks every match by price, rating, delivery speed, and verification.",
  },
  {
    n: '2',
    title: 'Compare & Save',
    copy: 'Review suppliers side by side with risk levels and plain-language recommendations, then shortlist the strongest candidates.',
  },
  {
    n: '3',
    title: 'Negotiate with AI',
    copy: 'Aimoro AI drafts a professional negotiation message using your target price and terms — you review, edit, and send it yourself.',
  },
]

const QUICK_LINKS = [
  { label: 'Find Suppliers', href: '/find-suppliers', caption: 'Run a new sourcing search' },
  { label: 'Saved Suppliers', href: '/saved-suppliers', caption: 'Your shortlist' },
  { label: 'Analytics', href: '/analytics', caption: 'Review saved-supplier trends' },
  { label: 'Negotiate', href: '/negotiate', caption: 'Draft an AI negotiation message' },
]

export default function DashboardPage() {
  const [catalog, setCatalog] = useState<Supplier[]>([])
  const [saved, setSaved] = useState<SavedSupplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCatalogSnapshot().catch(() => []),
      getSavedSuppliers().catch(() => []),
    ]).then(([cat, sav]) => {
      setCatalog(cat)
      setSaved(sav)
      setLoading(false)
    })
  }, [])

  const platforms = new Set(catalog.map(s => s.platform)).size
  const verified = catalog.filter(s => s.verified).length

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-white to-[#fff5f5] border border-[#f1d0d0] rounded-[22px] p-8 shadow-[0_14px_34px_rgba(17,24,39,0.06)]">
        <span className="inline-block bg-[#fff1f1] text-[#c40000] text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          AI-Powered Sourcing Intelligence
        </span>
        <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight mb-3">
          Source smarter from Alibaba &amp; AliExpress
        </h1>
        <p className="text-base text-gray-500 leading-relaxed max-w-2xl">
          Aimoro searches, scores, and risk-checks suppliers across both platforms in seconds,
          then helps you negotiate better terms with an AI-drafted message. Compare offers side
          by side, save the ones worth pursuing, and move from research to outreach without
          leaving the app.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Suppliers in Catalog" value={loading ? '…' : catalog.length || '—'} />
        <MetricCard label="Verified Suppliers" value={loading ? '…' : verified || '—'} />
        <MetricCard label="Platforms Covered" value={loading ? '…' : platforms || '—'} />
        <MetricCard label="Saved by You" value={loading ? '…' : saved.length} />
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-xl font-extrabold text-[#111827] mb-4">How Aimoro Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map(({ n, title, copy }) => (
            <div key={n} className="bg-white border border-[#e5e7eb] rounded-[18px] p-5 shadow-[0_10px_24px_rgba(17,24,39,0.04)]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c40000] to-[#950000] text-white text-sm font-extrabold flex items-center justify-center mb-3">
                {n}
              </div>
              <p className="font-bold text-[#111827] mb-1">{title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xl font-extrabold text-[#111827] mb-4">Jump Back In</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map(({ label, href, caption }) => (
            <Link
              key={href}
              href={href}
              className="block bg-white border border-[#e5e7eb] rounded-[18px] p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all group"
            >
              <p className="text-xs text-gray-400 mb-1">{caption}</p>
              <p className="font-bold text-[#111827] group-hover:text-[#c40000] transition-colors">{label} →</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
