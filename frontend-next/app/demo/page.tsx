'use client'

import Link from 'next/link'
import { useState } from 'react'

// ── Feature sections ──────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'search',
    badge: '01',
    title: 'Find Suppliers',
    subtitle: 'Search any product, get AI-scored results instantly',
    href: '/find-suppliers',
    steps: [
      {
        step: 'Type your product',
        detail: 'Enter any product name — "wireless earbuds", "bamboo cutting board", "LED strip lights". Be specific for better results.',
      },
      {
        step: 'Browse scored results',
        detail: 'Each supplier card shows an Aimoro Score (0–100%) calculated from price, rating, delivery speed, and verification status.',
      },
      {
        step: 'Click a card to preview',
        detail: 'The supplier detail drawer slides in from the right with a score breakdown, AI recommendation, and direct link to the platform listing.',
      },
      {
        step: 'Save the ones you like',
        detail: 'Hit Save on any card to add the supplier to your shortlist. Saved suppliers appear in Saved Suppliers immediately.',
      },
    ],
    tips: [
      'Use past searches — chips appear below the search bar for quick repeats',
      'Click trending products in the empty state to see popular searches',
      'Tick up to 3 cards and click Compare for a side-by-side breakdown',
    ],
  },
  {
    id: 'saved',
    badge: '02',
    title: 'Saved Suppliers',
    subtitle: 'Organise, annotate, and manage your shortlist',
    href: '/saved-suppliers',
    steps: [
      {
        step: 'Filter by platform or status',
        detail: 'Use the tab row at the top to filter by platform (Alibaba, AliExpress, DHgate…) or by status (Shortlisted, Contacted, Rejected).',
      },
      {
        step: 'Sort your list',
        detail: 'Sort by name, unit price, rating, or delivery days — ascending or descending — using the sort buttons on the right.',
      },
      {
        step: 'Add notes',
        detail: 'Click the note icon on any supplier card to type a private note. Notes save automatically to your browser.',
      },
      {
        step: 'Set a status tag',
        detail: 'Use the status dropdown on each card to mark suppliers as Shortlisted (blue), Contacted (amber), or Rejected (red).',
      },
      {
        step: 'Bulk actions',
        detail: 'Tick the Select All checkbox (or individual cards) to export selected suppliers to CSV or delete them in bulk.',
      },
    ],
    tips: [
      'Export to CSV includes supplier name, platform, price, MOQ, rating, delivery, status, and notes',
      'Bulk delete keeps your shortlist clean after you have made a decision',
    ],
  },
  {
    id: 'compare',
    badge: '03',
    title: 'Compare Suppliers',
    subtitle: 'Side-by-side comparison with best-value highlights',
    href: '/find-suppliers',
    steps: [
      {
        step: 'Tick the compare checkbox',
        detail: 'In Find Suppliers, each result card has a small checkbox in the top-right corner. Tick up to 3 cards.',
      },
      {
        step: 'Click Compare',
        detail: 'A "Compare N" button appears in the search results header once you select at least 2 suppliers. Click it.',
      },
      {
        step: 'Read the comparison table',
        detail: 'The modal shows all suppliers side by side across: Platform, Country, Unit Price, MOQ, Delivery, Rating, Score, Verified.',
      },
      {
        step: 'Spot the best values',
        detail: 'The best value in each row is highlighted in red with a "Best" badge — no mental maths required.',
      },
    ],
    tips: [
      'Press Escape to close the comparison modal',
      'You can compare up to 3 suppliers at once',
    ],
  },
  {
    id: 'negotiate',
    badge: '04',
    title: 'Negotiate',
    subtitle: 'AI-drafted emails ready to copy and send',
    href: '/negotiate',
    steps: [
      {
        step: 'Select a saved supplier',
        detail: 'Pick a supplier from the dropdown. Only saved suppliers appear here — save some first in Find Suppliers.',
      },
      {
        step: 'Choose an email type',
        detail: 'Pick from: First Contact, Sample Request, Price Negotiation, Bulk Order, or Payment Terms. Each pre-fills a context note.',
      },
      {
        step: 'Set your target terms',
        detail: 'Enter your target unit price, order quantity, and target delivery days. These appear directly in the drafted email.',
      },
      {
        step: 'Draft the message',
        detail: 'Click "Draft Negotiation Message". The AI writes a professional email in under 5 seconds.',
      },
      {
        step: 'Review, edit, and copy',
        detail: 'The draft is fully editable. Hit Copy, then paste it into the platform messaging tool or your email client.',
      },
    ],
    tips: [
      'Past drafts are saved — click History to restore a previous draft',
      'You can freely edit the draft before copying',
      'Aimoro AI never sends anything on your behalf',
    ],
  },
  {
    id: 'analytics',
    badge: '05',
    title: 'Analytics',
    subtitle: 'Portfolio insights and an AI sourcing report',
    href: '/analytics',
    steps: [
      {
        step: 'View your KPIs',
        detail: 'The top row shows: total saved suppliers, average unit price, average rating, and verified percentage.',
      },
      {
        step: 'Check top performers',
        detail: 'The Top Performers strip highlights your highest-scored, cheapest, and fastest-delivery suppliers.',
      },
      {
        step: 'Read the charts',
        detail: 'Four charts: Platform Distribution (pie), Verified vs Unverified (donut), Price Comparison (bar), and Delivery Time Distribution (bar).',
      },
      {
        step: 'Generate an AI Sourcing Report',
        detail: 'Click "AI Sourcing Report" in the header. Aimoro analyses your full shortlist and writes a 300-word report with recommendations, red flags, and next steps.',
      },
      {
        step: 'Download the report',
        detail: 'Hit Download on the report card to save it as a .txt file.',
      },
    ],
    tips: [
      'The report is generated fresh each time — useful after you update your shortlist',
      'The All Saved Suppliers table at the bottom is sorted by Aimoro Score by default',
    ],
  },
  {
    id: 'ai-assistant',
    badge: '06',
    title: 'AI Assistant',
    subtitle: 'Free-form chat for any sourcing question',
    href: '/ai-assistant',
    steps: [
      {
        step: 'Ask anything',
        detail: 'Type any sourcing question: product research, supplier vetting, pricing strategy, import regulations, shipping methods, platform comparisons.',
      },
      {
        step: 'Continue the conversation',
        detail: 'The assistant remembers the full thread. Ask follow-up questions, request clarifications, or change direction — it keeps context.',
      },
      {
        step: 'Start a new chat',
        detail: 'Click "New chat" in the header to clear the conversation and start fresh.',
      },
    ],
    tips: [
      '"What\'s a good MOQ for a first order in this niche?" is a great starter question',
      '"How do I spot a scam supplier?" — the assistant gives you a checklist',
      '"Compare Alibaba vs AliExpress for private label" — comparative analysis on demand',
    ],
  },
]

const FAQ = [
  {
    q: 'Does Aimoro send messages to suppliers for me?',
    a: 'No. Aimoro drafts negotiation emails but never sends anything. You copy the message and send it yourself via the platform or your email client.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Notes, tags, search history, and negotiate drafts are stored in your browser\'s localStorage. They never leave your device. Saved suppliers are stored on the Aimoro backend.',
  },
  {
    q: 'What platforms does Aimoro search?',
    a: 'Aimoro currently indexes suppliers from Alibaba, AliExpress, and DHgate. More platforms are being added.',
  },
  {
    q: 'How is the Aimoro Score calculated?',
    a: 'The score is a weighted composite of unit price (vs category average), supplier rating, delivery speed, and verification status. A higher score means a better overall profile.',
  },
  {
    q: 'Can I export my supplier list?',
    a: 'Yes. In Saved Suppliers, select any suppliers and click Export CSV. The file includes name, platform, price, MOQ, rating, delivery, status, and notes.',
  },
  {
    q: 'How do I replay the onboarding tour?',
    a: 'Go to Settings → Help & Onboarding → Restart tour.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeFeature, setActiveFeature] = useState<string>('search')

  const feature = FEATURES.find(f => f.id === activeFeature) ?? FEATURES[0]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-8 py-14 text-center">
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-2">Feature guide</p>
        <h1 className="text-3xl font-extrabold text-white mb-3">How Aimoro works</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Everything you need to find, compare, and negotiate with suppliers — all in one place.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/find-suppliers"
            className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
          >
            Start searching
          </Link>
          <Link
            href="/settings"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            Restart guided tour
          </Link>
        </div>
      </div>

      {/* Feature nav + detail */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Feature tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {FEATURES.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
                activeFeature === f.id
                  ? 'bg-[#c40000] text-white border-[#c40000]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'
              }`}
            >
              {f.badge}  {f.title}
            </button>
          ))}
        </div>

        {/* Feature detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-6">
              <p className="text-4xl font-extrabold text-slate-100 mb-1">{feature.badge}</p>
              <h2 className="text-xl font-extrabold text-[#0f172a] mb-1">{feature.title}</h2>
              <p className="text-sm text-slate-500 mb-6">{feature.subtitle}</p>
              <Link
                href={feature.href}
                className="flex items-center gap-2 bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all w-full justify-center"
              >
                Try it now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {feature.tips.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-3">Pro tips</p>
                  <ul className="space-y-2">
                    {feature.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="text-[#c40000] mt-0.5 flex-shrink-0">▸</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right: steps */}
          <div className="lg:col-span-2 space-y-3">
            {feature.steps.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#fff1f1] text-[#c40000] font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-[#0f172a] text-sm mb-1">{s.step}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All features overview strip */}
        <div className="mt-16">
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-6">All features at a glance</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFeature(f.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-[#c40000]/30 hover:shadow-md transition-all group"
              >
                <p className="text-2xl font-extrabold text-slate-100 mb-1 group-hover:text-[#c40000]/20 transition-colors">{f.badge}</p>
                <p className="font-bold text-[#0f172a] text-sm mb-1">{f.title}</p>
                <p className="text-xs text-slate-400">{f.subtitle}</p>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-6">Frequently asked questions</p>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-[#0f172a] text-sm">{item.q}</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-3 ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-extrabold text-white mb-2">Ready to start sourcing?</h2>
          <p className="text-slate-400 text-sm mb-6">Find your first verified supplier in under 60 seconds.</p>
          <Link
            href="/find-suppliers"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-3 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
          >
            Find suppliers now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
