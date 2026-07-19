'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SHORTCUTS = [
  { keys: 'G then F', description: 'Go to Find Suppliers' },
  { keys: 'G then S', description: 'Go to Saved Suppliers' },
  { keys: 'G then A', description: 'Go to Analytics' },
  { keys: 'G then N', description: 'Go to Negotiate' },
  { keys: 'G then I', description: 'Go to AI Assistant' },
  { keys: 'G then H', description: 'Go to Dashboard' },
  { keys: '?', description: 'Show this help' },
  { keys: 'Esc', description: 'Close modals / panels' },
]

export function KeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)
  const [gPressed, setGPressed] = useState(false)

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout>

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'Escape') { setShowHelp(false); return }

      if (isInput) return

      if (e.key === '?') { setShowHelp(h => !h); return }

      if (e.key === 'g' || e.key === 'G') {
        setGPressed(true)
        clearTimeout(gTimer)
        gTimer = setTimeout(() => setGPressed(false), 1000)
        return
      }

      if (gPressed) {
        const map: Record<string, string> = {
          f: '/find-suppliers',
          s: '/saved-suppliers',
          a: '/analytics',
          n: '/negotiate',
          i: '/ai-assistant',
          h: '/',
        }
        const route = map[e.key.toLowerCase()]
        if (route) { router.push(route); setGPressed(false); clearTimeout(gTimer) }
      }
    }

    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(gTimer) }
  }, [gPressed, router])

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-extrabold text-[#0f172a]">Keyboard Shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={keys} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-slate-600">{description}</span>
              <kbd className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200">{keys}</kbd>
            </div>
          ))}
        </div>
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-400">Press <kbd className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Esc</kbd> or click outside to close</p>
        </div>
      </div>
    </div>
  )
}
