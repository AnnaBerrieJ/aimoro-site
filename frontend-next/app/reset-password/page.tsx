'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, ErrorNote, inputClass, labelClass, primaryBtn } from '@/components/agent/ui'
import { resetPassword, setToken } from '@/lib/agent'

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Use at least 8 characters'); return }
    if (password !== confirm) { setError("The two passwords don't match"); return }
    setBusy(true); setError(null)
    try {
      const res = await resetPassword(token, password)
      setToken(res.token)
      // Full reload so the app picks up the new login.
      window.location.href = res.user.role === 'admin' ? '/admin' : '/my-requests'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password')
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <Card>
        <p className="text-sm text-slate-700">This reset link is incomplete. <Link href="/forgot-password" className="font-semibold text-[#c40000]">Ask for a new one</Link>.</p>
      </Card>
    )
  }
  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass}
            value={password} onChange={e => setPassword(e.target.value)} />
          <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="confirm">Type it again</label>
          <input id="confirm" type="password" required autoComplete="new-password" className={inputClass}
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <ErrorNote message={error} />
        {error?.includes('expired') && <Link href="/forgot-password" className="block text-sm font-semibold text-[#c40000]">Send me a new link</Link>}
        <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Saving…' : 'Save new password and log in'}</button>
      </form>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Choose a new password</h1>
      <p className="text-sm text-slate-500 mb-6">You&apos;ll be logged in straight after.</p>
      <Suspense><ResetForm /></Suspense>
    </div>
  )
}
