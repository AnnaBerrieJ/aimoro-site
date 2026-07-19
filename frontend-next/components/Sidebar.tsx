'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Find Suppliers', href: '/find-suppliers' },
  { label: 'Saved Suppliers', href: '/saved-suppliers' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Negotiate', href: '/negotiate' },
  { label: 'AI Assistant', href: '/ai-assistant' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-60 z-30 flex flex-col',
          'bg-gradient-to-b from-white to-[#fff7f7] border-r border-[#f1d0d0]',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 p-4 border-b border-[#f1d0d0] hover:bg-[#fff1f1] transition-colors"
        >
          <Image
            src="/favicon.png"
            alt="Aimoro"
            width={36}
            height={36}
            className="rounded-lg flex-shrink-0"
          />
          <span className="font-extrabold text-[#111827] text-sm leading-tight">
            Aimoro Smart Sourcing
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">
            Navigation
          </p>
          {NAV_ITEMS.map(({ label, href }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={[
                  'flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  active
                    ? 'bg-gradient-to-r from-[#c40000] to-[#950000] text-white shadow-[0_8px_20px_rgba(196,0,0,0.28)]'
                    : 'text-[#374151] hover:bg-[#fff1f1] hover:text-[#c40000]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#f1d0d0]">
          <p className="text-xs font-semibold text-gray-500">Aimoro</p>
          <p className="text-xs text-gray-400">Innovate. Elevate. Dominate.</p>
        </div>
      </aside>
    </>
  )
}
