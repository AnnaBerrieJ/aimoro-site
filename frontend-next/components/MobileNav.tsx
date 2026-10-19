'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const icon = (d: string) => (active: boolean) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const HOME = 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
const PLUS = 'M12 4v16m8-8H4'
const BOX = 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
const QUEUE = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
const BRUSH = 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
const TRUCK = 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0'

const CUSTOMER_NAV = [
  { label: 'Home', href: '/', icon: icon(HOME) },
  { label: 'New', href: '/my-requests/new', icon: icon(PLUS) },
  { label: 'Requests', href: '/my-requests', icon: icon(BOX) },
  { label: 'Branding', href: '/my-branding', icon: icon(BRUSH) },
]
const ADMIN_NAV = [
  { label: 'Home', href: '/', icon: icon(HOME) },
  { label: 'Queue', href: '/admin', icon: icon(QUEUE) },
  { label: 'Branding', href: '/admin/branding', icon: icon(BRUSH) },
  { label: 'Shipments', href: '/admin/shipments', icon: icon(TRUCK) },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/requests')
  if (href === '/my-requests') return pathname === '/my-requests' || /^\/my-requests\/\d+/.test(pathname)
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const nav = user?.role === 'admin' ? ADMIN_NAV : CUSTOMER_NAV

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0f172a] border-t border-white/5 flex items-center justify-around px-2 pb-safe">
      {nav.map(({ label, href, icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all min-w-0 ${
              active ? 'text-[#c40000]' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {icon(active)}
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-[#c40000]' : 'text-slate-600'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
