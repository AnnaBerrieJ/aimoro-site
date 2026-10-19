'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import { CONTACT_EMAIL } from '@/lib/agent'

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="AIMORO home">
      <Image src="/favicon.png" alt="" width={36} height={36} className="object-contain" />
      <span className={`font-extrabold tracking-[0.18em] text-lg ${dark ? 'text-white' : 'text-[#0f172a]'}`}>AIMORO</span>
    </Link>
  )
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const accountHref = user?.role === 'admin' ? '/admin' : '/my-requests'

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0f172a]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600" aria-label="Main">
            <Link href="/#how" className="hover:text-[#0f172a]">How it works</Link>
            <Link href="/#why" className="hover:text-[#0f172a]">Why AIMORO</Link>
            <Link href="/#faq" className="hover:text-[#0f172a]">FAQ</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#0f172a]">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={accountHref} className="inline-flex items-center rounded-xl bg-[#c40000] hover:bg-[#950000] text-white text-sm font-semibold px-4 py-2.5 transition-colors">
                {user.role === 'admin' ? 'Request queue' : 'My requests'}
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex items-center rounded-xl text-sm font-semibold px-4 py-2.5 text-slate-700 hover:bg-slate-100 transition-colors">Log in</Link>
                <Link href="/signup" className="inline-flex items-center rounded-xl bg-[#c40000] hover:bg-[#950000] text-white text-sm font-semibold px-4 py-2.5 transition-colors">Start a request</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#0f172a] text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            <Logo dark />
            <p className="text-sm leading-relaxed text-slate-400">Your sourcing agent in China. Tell us what you want and we deliver it to your door in The Bahamas.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">AIMORO</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#how" className="hover:text-white">How it works</Link></li>
              <li><Link href="/#why" className="hover:text-white">Why AIMORO</Link></li>
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/signup" className="hover:text-white">Create an account</Link></li>
              <li><Link href="/login" className="hover:text-white">Log in</Link></li>
              <li><Link href="/my-requests" className="hover:text-white">My requests</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Contact & legal</p>
            <ul className="space-y-2 text-sm">
              <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white break-all">{CONTACT_EMAIL}</a></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
            <span>© {new Date().getFullYear()} AIMORO. All rights reserved.</span>
            <span>Sourced from China · Delivered to your door</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
