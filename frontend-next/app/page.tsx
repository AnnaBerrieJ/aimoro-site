'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCatalogSnapshot, getSavedSuppliers } from '@/lib/api'
import type { Supplier, SavedSupplier } from '@/lib/types'

const STEPS = [
  {
    n: '01',
    title: 'Search & Score',
    copy: "Enter a product, country, and price target. Aimoro's ML model ranks every match by price, rating, delivery speed, and verification.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Compare & Save',
    copy: 'Review suppliers side by side with risk levels and plain-language recommendations, then shortlist the strongest candidates.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Negotiate with AI',
    copy: 'Aimoro AI drafts a professional negotiation message using your target price and terms — you review, edit, and send it yourself.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

const QUICK_LINKS = [
  { label: 'Find Suppliers', href: '/find-suppliers', caption: 'Search & rank suppliers', color: 'from-[#c40000] to-[#950000]' },
  { label: 'Saved Suppliers', href: '/saved-suppliers', caption: 'Your shortlist', color: 'from-slate-700 to-slate-900' },
  { label: 'Analytics', href: '/analytics', caption: 'Trends & charts', color: 'from-slate-700 to-slate-900' },
  { label: 'Negotiate', href: '/negotiate', caption: 'AI-drafted messages', color: 'from-slate-700 to-slate-900' },
]

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold text-white">{value}</p>
      <p className="text-slate-400 text-xs font-medium mt-0.5">{label}</p>
    </div>
  )
}

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
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1c0a0a] to-[#7f0000] px-8 py-14">
        <span className="inline-block bg-white/10 text-white/80 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 border border-white/10">
          AI-Powered Sourcing Intelligence
        </span>
        <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Source smarter from<br />
          <span className="text-[#ff4444]">Alibaba</span> & <span className="text-[#ff4444]">AliExpress</span>
        </h1>
        <p className="text-slate-300 text-base leading-relaxed max-w-xl mb-8">
          Aimoro searches, scores, and risk-checks suppliers across both platforms in seconds,
          then helps you negotiate better terms with an AI-drafted message.
        </p>
        <Link
          href="/find-suppliers"
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#c40000] font-bold px-6 py-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5"
        >
          Start Sourcing
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        {/* Stats strip */}
        <div className="flex items-center gap-10 mt-10 pt-8 border-t border-white/10">
          <StatPill value={loading ? '…' : catalog.length || '—'} label="Suppliers" />
          <div className="w-px h-8 bg-white/10" />
          <StatPill value={loading ? '…' : verified || '—'} label="Verified" />
          <div className="w-px h-8 bg-white/10" />
          <StatPill value={loading ? '…' : platforms || '—'} label="Platforms" />
          <div className="w-px h-8 bg-white/10" />
          <StatPill value={loading ? '…' : saved.length} label="Saved by You" />
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-10 max-w-5xl mx-auto space-y-10">

        {/* How it works */}
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-2">How it works</p>
          <h2 className="text-2xl font-extrabold text-[#0f172a] mb-6">Three steps to your best supplier</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map(({ n, title, copy, icon }) => (
              <div key={n} className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <span className="absolute top-2 right-4 text-7xl font-extrabold text-slate-100 select-none leading-none">{n}</span>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-[#fff1f1] text-[#c40000] flex items-center justify-center mb-4">
                    {icon}
                  </div>
                  <p className="font-bold text-[#0f172a] mb-2">{title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-2">Quick access</p>
          <h2 className="text-2xl font-extrabold text-[#0f172a] mb-6">Jump back in</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map(({ label, href, caption, color }) => (
              <Link
                key={href}
                href={href}
                className={`block bg-gradient-to-br ${color} text-white rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all`}
              >
                <p className="text-xs text-white/60 mb-1">{caption}</p>
                <p className="font-bold text-sm">{label} →</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
