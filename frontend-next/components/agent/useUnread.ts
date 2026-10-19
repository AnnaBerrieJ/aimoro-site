'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { adminUnread } from '@/lib/agent'

/** Unread counts for the admin menu badges. Refreshes every minute and after each page change
 *  (opening a request or project marks it as read). Returns zeros for customers. */
export function useAdminUnread() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [counts, setCounts] = useState({ requests: 0, branding: 0 })
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    const load = () => adminUnread().then(c => { if (alive) setCounts(c) }).catch(() => {})
    // Short delay so a just-opened detail page has marked itself read first.
    const t = setTimeout(load, 1200)
    const iv = setInterval(load, 60_000)
    window.addEventListener('focus', load)
    return () => { alive = false; clearTimeout(t); clearInterval(iv); window.removeEventListener('focus', load) }
  }, [isAdmin, pathname])

  return isAdmin ? counts : { requests: 0, branding: 0 }
}

/** Menu href -> badge count. */
export function badgeFor(href: string, counts: { requests: number; branding: number }) {
  if (href === '/admin') return counts.requests
  if (href === '/admin/branding') return counts.branding
  return 0
}
