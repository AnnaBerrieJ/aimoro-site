'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { Card, primaryBtn, secondaryBtn } from '@/components/agent/ui'
import { CONTACT_EMAIL } from '@/lib/agent'

const STEPS = [
  { n: '1', title: 'Tell us what you want', body: 'Describe the product, add a photo or a link, and say how many you need.' },
  { n: '2', title: 'Get one price', body: 'We find it in China and send you a single quote in BSD: product, shipping to your address and our fee.' },
  { n: '3', title: 'Approve and pay', body: 'Approve the quote, pay the invoice, and track every step from your account.' },
  { n: '4', title: 'Delivered to you', body: 'We check it at our China warehouse, ship it, and deliver it to the address you give us.' },
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Anything from China, delivered to your door in The Bahamas</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Tell us what you're looking for. AIMORO finds it, quotes one all-in price, and delivers it to your address.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {user?.role === 'admin' ? (
            <>
              <Link href="/admin" className={primaryBtn}>Request queue</Link>
              <Link href="/admin/shipments" className={secondaryBtn}>Shipments</Link>
            </>
          ) : user ? (
            <>
              <Link href="/my-requests/new" className={primaryBtn}>Start a request</Link>
              <Link href="/my-requests" className={secondaryBtn}>My requests</Link>
            </>
          ) : (
            <>
              <Link href="/signup" className={primaryBtn}>Start a request</Link>
              <Link href="/login" className={secondaryBtn}>Log in</Link>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">How it works</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {STEPS.map(s => (
            <Card key={s.n}>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#c40000] text-white font-bold flex items-center justify-center">{s.n}</span>
                <div>
                  <p className="font-bold text-slate-900">{s.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{s.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="font-bold text-slate-900 mb-1">What we can't ship</h2>
        <p className="text-sm text-slate-600">Branded replicas, batteries, liquids, weapons or weapon parts, and other restricted items.</p>
      </Card>

      <Card>
        <h2 className="font-bold text-slate-900 mb-1">Questions?</h2>
        <p className="text-sm text-slate-600">
          Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#c40000] underline">{CONTACT_EMAIL}</a>
        </p>
      </Card>
    </div>
  )
}
