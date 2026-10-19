'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, ErrorNote, inputClass, labelClass, primaryBtn } from '@/components/agent/ui'
import { CONTACT_EMAIL, forgotPassword } from '@/lib/agent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await forgotPassword(email.trim()); setSent(true) }
    catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setBusy(false) }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Forgot your password?</h1>
      <p className="text-sm text-slate-500 mb-6">Enter the email you signed up with and we&apos;ll send you a link to choose a new one.</p>
      <Card>
        {sent ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              If an account exists for {email.trim()}, a reset link is on its way. It works for 1 hour.
            </p>
            <p className="text-xs text-slate-500">Didn&apos;t get it? Check your spam folder, or email {CONTACT_EMAIL}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className={inputClass}
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <ErrorNote message={error} />
            <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
      </Card>
      <p className="text-sm text-slate-500 mt-4 text-center">
        Remembered it? <Link href="/login" className="font-semibold text-[#c40000]">Log in</Link>
      </p>
    </div>
  )
}
