'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export function RequireAuth({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>
  }
  if (admin && user.role !== 'admin') {
    return <div className="p-8 text-sm text-slate-600">This page is for AIMORO staff only.</div>
  }
  return <>{children}</>
}
