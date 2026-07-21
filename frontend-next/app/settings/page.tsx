'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { GuidedTour, resetTour } from '@/components/GuidedTour'

const STORAGE_KEYS = [
  { key: 'aimoro_search_history', label: 'Search history' },
  { key: 'aimoro_supplier_notes', label: 'Supplier notes' },
  { key: 'aimoro_supplier_tags',  label: 'Supplier status tags' },
  { key: 'aimoro_negotiate_history', label: 'Negotiate history' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-bold text-[#0f172a] text-sm">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme()
  const [showTour, setShowTour] = useState(false)
  const [apiUrl, setApiUrl]     = useState('')
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null)
  const [saved, setSaved]       = useState(false)
  const [storageInfo, setStorageInfo] = useState<Record<string, number>>({})

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? '')
    const info: Record<string, number> = {}
    STORAGE_KEYS.forEach(({ key }) => {
      const raw = localStorage.getItem(key)
      info[key] = raw ? JSON.parse(raw).length ?? Object.keys(JSON.parse(raw)).length : 0
    })
    setStorageInfo(info)
  }, [])

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) })
      setTestResult(res.ok ? 'ok' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  function clearKey(key: string) {
    localStorage.removeItem(key)
    setStorageInfo(prev => ({ ...prev, [key]: 0 }))
  }

  function clearAll() {
    if (!confirm('Clear all Aimoro local data? This cannot be undone.')) return
    STORAGE_KEYS.forEach(({ key }) => localStorage.removeItem(key))
    setStorageInfo(Object.fromEntries(STORAGE_KEYS.map(({ key }) => [key, 0])))
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Configuration</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Settings</h1>
      </div>

      {showTour && <GuidedTour forceOpen onClose={() => setShowTour(false)} />}

      {/* Appearance */}
      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Dark mode</p>
            <p className="text-xs text-slate-400 mt-0.5">Switch between light and dark interface</p>
          </div>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-amber-400' : 'bg-slate-200'
            }`}
            aria-label="Toggle dark mode"
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </Section>

      {/* Backend */}
      <Section title="Backend API">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">API Base URL</label>
          <div className="flex gap-2">
            <input
              value={apiUrl}
              onChange={e => { setApiUrl(e.target.value); setTestResult(null) }}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c40000]/20"
              placeholder="https://aimoro-backend.onrender.com"
            />
            <button
              onClick={handleTest}
              disabled={testing || !apiUrl}
              className="flex items-center gap-1.5 text-sm font-semibold bg-slate-50 border border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000] text-slate-600 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {testing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Test'}
            </button>
          </div>
          {testResult === 'ok' && (
            <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Backend reachable
            </p>
          )}
          {testResult === 'error' && (
            <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Could not reach backend
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            This value is baked in at build time via <code className="bg-slate-100 px-1 rounded text-[11px]">NEXT_PUBLIC_API_BASE_URL</code>. To change it permanently, update the environment variable on Render and redeploy.
          </p>
        </div>
      </Section>

      {/* Local data */}
      <Section title="Local Data">
        <p className="text-xs text-slate-400">Notes, tags, search history, and negotiate drafts are stored locally in your browser.</p>
        <div className="space-y-2">
          {STORAGE_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
                <p className="text-xs text-slate-400">{storageInfo[key] ?? 0} item{(storageInfo[key] ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => clearKey(key)}
                disabled={!storageInfo[key]}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={clearAll}
          className="w-full text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl transition-colors"
        >
          Clear all local data
        </button>
      </Section>

      {/* Help */}
      <Section title="Help & Onboarding">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Guided tour</p>
            <p className="text-xs text-slate-400 mt-0.5">Replay the step-by-step walkthrough</p>
          </div>
          <button
            onClick={() => { resetTour(); setShowTour(true) }}
            className="flex items-center gap-1.5 text-sm font-semibold bg-[#fff1f1] text-[#c40000] hover:bg-[#fde8e8] px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Restart tour
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Feature guide</p>
            <p className="text-xs text-slate-400 mt-0.5">Full written walkthrough of every feature</p>
          </div>
          <a
            href="/demo"
            className="text-sm font-semibold text-slate-600 hover:text-[#c40000] border border-slate-200 hover:border-[#c40000]/30 px-4 py-2 rounded-xl transition-all"
          >
            View guide
          </a>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex justify-between"><span>App</span><span className="font-semibold text-[#0f172a]">Aimoro Smart Sourcing</span></div>
          <div className="flex justify-between"><span>Frontend</span><span className="font-semibold text-[#0f172a]">Next.js 14 · TypeScript · Tailwind</span></div>
          <div className="flex justify-between"><span>Backend</span><span className="font-semibold text-[#0f172a]">FastAPI · Python</span></div>
          <div className="flex justify-between"><span>AI</span><span className="font-semibold text-[#0f172a]">OpenAI gpt-4o-mini</span></div>
          <div className="flex justify-between"><span>Hosting</span><span className="font-semibold text-[#0f172a]">Render</span></div>
        </div>
      </Section>
    </div>
  )
}
