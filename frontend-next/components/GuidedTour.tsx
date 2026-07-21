'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const TOUR_KEY = 'aimoro_tour_done'

interface Step {
  title: string
  body: string
  cta?: { label: string; href: string }
  icon: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Aimoro',
    body: 'Aimoro finds and scores verified suppliers on Alibaba, AliExpress, and more — powered by AI. This quick tour shows you how to get the most out of it.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Find Suppliers',
    body: 'Type any product — "LED strip lights", "wireless earbuds", "bamboo cutting board" — and Aimoro searches across platforms and scores each supplier on price, delivery, rating, and verification.',
    cta: { label: 'Go to Find Suppliers', href: '/find-suppliers' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: 'Save & Organise Your Shortlist',
    body: 'Hit Save on any supplier card to add them to your shortlist. Then add notes, set a status (Shortlisted / Contacted / Rejected), and sort or filter by price, rating, or delivery speed.',
    cta: { label: 'Go to Saved Suppliers', href: '/saved-suppliers' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    title: 'Compare Side by Side',
    body: 'Tick the checkbox on up to 3 supplier cards and click "Compare". A modal shows every metric side by side, with the best value in each row highlighted in red.',
    cta: { label: 'Try it in Find Suppliers', href: '/find-suppliers' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    title: 'Draft Negotiation Emails',
    body: 'Select a saved supplier, pick an email type (First Contact, Sample Request, Price Negotiation…), set your target price and order qty, and Aimoro AI writes the email. Copy it and send it yourself.',
    cta: { label: 'Go to Negotiate', href: '/negotiate' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Track Analytics',
    body: 'The Analytics page gives you KPIs, charts (platform split, price comparison, delivery distribution), and a one-click AI Sourcing Report that analyses your entire shortlist and gives actionable next steps.',
    cta: { label: 'Go to Analytics', href: '/analytics' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Ask the AI Assistant',
    body: 'The AI Assistant is a free-form chat for anything sourcing-related — "What\'s a good MOQ for my first order?", "How do I spot a scam supplier?", "Compare Alibaba vs AliExpress for my niche".',
    cta: { label: 'Go to AI Assistant', href: '/ai-assistant' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "You're ready to source smarter",
    body: "That's everything. Start by searching for your product. You can replay this tour anytime from Settings → Restart tour.",
    cta: { label: 'Start searching', href: '/find-suppliers' },
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
]

interface GuidedTourProps {
  /** Call with false to force-open the tour (e.g. from Settings) */
  forceOpen?: boolean
  onClose?: () => void
}

export function GuidedTour({ forceOpen, onClose }: GuidedTourProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen) {
      setStep(0)
      setOpen(true)
      return
    }
    // Auto-show on first visit
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // Slight delay so the page renders first
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [forceOpen])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setOpen(false)
    setStep(0)
    onClose?.()
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  function goToPage(href: string) {
    dismiss()
    router.push(href)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Red top bar */}
        <div className="bg-gradient-to-r from-[#c40000] to-[#7f0000] px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
              How Aimoro works
            </span>
            <button
              onClick={dismiss}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close tour"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Step indicator dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1 rounded-full transition-all ${
                  i === step ? 'bg-white w-6' : i < step ? 'bg-white/60 w-2' : 'bg-white/25 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="w-12 h-12 rounded-2xl bg-[#fff1f1] text-[#c40000] flex items-center justify-center mb-4">
            {current.icon}
          </div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-xl font-extrabold text-[#0f172a] mb-3">{current.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{current.body}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={step === 0}
            className="text-sm font-semibold text-slate-400 hover:text-[#0f172a] transition-colors disabled:opacity-0"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {current.cta && !isLast && (
              <button
                onClick={() => goToPage(current.cta!.href)}
                className="text-sm font-semibold text-[#c40000] hover:underline"
              >
                {current.cta.label}
              </button>
            )}
            {isLast && current.cta ? (
              <button
                onClick={() => goToPage(current.cta!.href)}
                className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
              >
                {current.cta.label}
              </button>
            ) : (
              <button
                onClick={next}
                className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
              >
                {isLast ? 'Finish' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Call this to mark tour as not done so it shows again */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY)
}
