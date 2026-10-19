'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Card, ErrorNote, inputClass, labelClass, primaryBtn } from '@/components/agent/ui'

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const next = useSearchParams().get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const user = await login(email, password)
      router.replace(next || (user.role === 'admin' ? '/admin' : '/my-requests'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Log in</h1>
      <p className="text-sm text-slate-500 mb-6">Track your requests, quotes and deliveries.</p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className={inputClass}
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#c40000] mb-1">Forgot password?</Link>
            </div>
            <input id="password" type="password" required autoComplete="current-password" className={inputClass}
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
      </Card>
      <p className="text-sm text-slate-500 mt-4 text-center">
        New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-[#c40000]">Create an account</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
