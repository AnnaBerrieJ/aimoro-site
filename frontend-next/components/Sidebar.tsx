'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useAuth } from './AuthProvider'
import { CONTACT_EMAIL } from '@/lib/agent'

const AGENT_ITEMS = [
  {
    label: 'Home', href: '/', adminOnly: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'My Requests', href: '/my-requests', adminOnly: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Request Queue', href: '/admin', adminOnly: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Shipments', href: '/admin/shipments', adminOnly: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const agentItems = AGENT_ITEMS.filter(i => !i.adminOnly || user?.role === 'admin')

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={[
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col',
        'bg-[#0f172a] border-r border-white/5',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto',
      ].join(' ')}>

        {/* Logo */}
        <Link href="/" onClick={onClose} className="relative overflow-hidden block border-b border-white/5 hover:opacity-90 transition-opacity">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'url(/favicon.png)', backgroundSize: '110px', backgroundPosition: 'right -10px center', backgroundRepeat: 'no-repeat', opacity: 0.12 }}
          />
          <div className="relative z-10 flex items-center gap-3 px-5 py-5">
            <Image src="/favicon.png" alt="Aimoro" width={38} height={38} className="object-contain" />
            <div>
              <p className="text-white font-extrabold text-sm leading-tight">AIMORO</p>
              <p className="text-slate-400 text-xs font-medium">China to The Bahamas</p>
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Menu</p>
          {agentItems.map(({ label, href, icon }) => {
            const active = href === '/' ? pathname === '/' : href === '/admin' ? pathname === '/admin' || pathname.startsWith('/admin/requests') : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  active
                    ? 'bg-[#c40000] text-white shadow-[0_4px_14px_rgba(196,0,0,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/8',
                ].join(' ')}
              >
                <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 space-y-3">
          <a href={`mailto:${CONTACT_EMAIL}`} className="block text-[11px] text-slate-400 hover:text-white truncate">{CONTACT_EMAIL}</a>
          {/* Account */}
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.role === 'admin' ? 'Admin' : user.email}</p>
              </div>
              <button onClick={() => { logout(); onClose() }} className="text-[11px] font-semibold text-slate-400 hover:text-white">Log out</button>
            </div>
          ) : (
            <Link href="/login" onClick={onClose} className="block text-center text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-xl py-2">Log in / Sign up</Link>
          )}
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
            aria-label="Toggle dark mode"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.772 17.303a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.106a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 00-1.06-1.061l-1.591 1.59z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
            </div>
            <div className={`w-7 h-4 rounded-full transition-colors ${theme === 'dark' ? 'bg-amber-400' : 'bg-slate-600'}`}>
              <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
