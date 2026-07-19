'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Sidebar } from './Sidebar'
import { KeyboardShortcuts } from './KeyboardShortcuts'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0f172a] border-b border-white/5 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image src="/favicon.png" alt="Aimoro" width={28} height={28} className="object-contain" />
          <span className="font-extrabold text-white text-sm">Aimoro Smart Sourcing</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <KeyboardShortcuts />
    </div>
  )
}
