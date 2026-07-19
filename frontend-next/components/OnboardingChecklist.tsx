'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'aimoro_onboarding'

export interface OnboardingState {
  searched: boolean
  saved: boolean
  negotiated: boolean
  usedAI: boolean
  dismissed: boolean
}

const DEFAULT: OnboardingState = { searched: false, saved: false, negotiated: false, usedAI: false, dismissed: false }

export function loadOnboarding(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULT }
}

export function markOnboarding(key: keyof OnboardingState) {
  const state = loadOnboarding()
  state[key] = true
  localStorage.setItem(KEY, JSON.stringify(state))
}

const STEPS = [
  { key: 'searched' as const,    label: 'Run your first supplier search',   href: '/find-suppliers',  icon: '🔍' },
  { key: 'saved' as const,       label: 'Save a supplier to your shortlist', href: '/find-suppliers',  icon: '🔖' },
  { key: 'negotiated' as const,  label: 'Draft a negotiation message',       href: '/negotiate',       icon: '✉️' },
  { key: 'usedAI' as const,      label: 'Ask the AI sourcing assistant',     href: '/ai-assistant',    icon: '🤖' },
]

export function OnboardingChecklist() {
  const [state, setState] = useState<OnboardingState>(DEFAULT)

  useEffect(() => { setState(loadOnboarding()) }, [])

  const done = STEPS.filter(s => state[s.key]).length
  const allDone = done === STEPS.length

  if (state.dismissed) return null

  function dismiss() {
    markOnboarding('dismissed')
    setState(loadOnboarding())
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-0.5">Getting started</p>
          <h3 className="font-extrabold text-[#0f172a]">
            {allDone ? '🎉 You\'re all set!' : `${done} of ${STEPS.length} complete`}
          </h3>
        </div>
        <button onClick={dismiss} className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
          {allDone ? 'Dismiss' : 'Skip'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-1 bg-gradient-to-r from-[#c40000] to-[#ff5a5a] transition-all duration-500"
          style={{ width: `${(done / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="px-6 py-4 space-y-3">
        {STEPS.map(({ key, label, href, icon }) => {
          const completed = state[key]
          return (
            <Link key={key} href={href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                completed ? 'opacity-50 cursor-default pointer-events-none' : 'hover:bg-slate-50'
              }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                completed ? 'bg-[#c40000] border-[#c40000]' : 'border-slate-200 group-hover:border-[#c40000]/40'
              }`}>
                {completed
                  ? <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  : <span className="text-[10px]">{icon}</span>
                }
              </div>
              <span className={`text-sm font-semibold ${completed ? 'line-through text-slate-400' : 'text-[#0f172a]'}`}>
                {label}
              </span>
              {!completed && (
                <svg className="w-4 h-4 text-slate-300 group-hover:text-[#c40000] ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
