'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { CONTACT_EMAIL } from '@/lib/agent'

// Inline stroke icons (24px grid)
const ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h14V9',
  shirt: 'M8 3 4 5.5 5.5 10 8 9v12h8V9l2.5 1L20 5.5 16 3a4 4 0 0 1-8 0Z',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  gift: 'M4 11h16v10H4zM2 7h20v4H2zm10 0v14M12 7c-1.5-3-5-3-5-1s3 1 5 1Zm0 0c1.5-3 5-3 5-1s-3 1-5 1Z',
  box: 'M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-10L3 8m9 5v8M3 8v8l9 5',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm4.5-4.5h.01',
  shield: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-3 9 2 2 4-4',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  chat: 'M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z',
  check: 'M5 12.5 10 17l9-10',
}

function Icon({ d, className = 'w-6 h-6' }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const CATEGORIES = [
  { icon: ICONS.home, label: 'Home & kitchen' },
  { icon: ICONS.shirt, label: 'Fashion & accessories' },
  { icon: ICONS.phone, label: 'Phone & tech accessories' },
  { icon: ICONS.sparkle, label: 'Beauty & hair' },
  { icon: ICONS.gift, label: 'Party & events' },
  { icon: ICONS.box, label: 'Supplies for your business' },
]

const STEPS = [
  { title: 'Tell us what you want', body: 'Describe it, add a photo or a link, and say how many you need.' },
  { title: 'We source it in China', body: 'We search trusted suppliers and factories in China and send you one all-in quote: product, shipping to your address and our fee.' },
  { title: 'Approve and pay', body: 'Happy with the price? Approve it and pay your invoice from your account.' },
  { title: 'Delivered to you', body: 'We check your order at our warehouse in China, ship it to The Bahamas, and deliver it to your address.' },
]

const REASONS = [
  { icon: ICONS.box, title: 'Straight from the source', body: 'Most of the world’s products are made in China. We buy from suppliers there, so you skip the extra middlemen and pay closer to the source price.' },
  { icon: ICONS.tag, title: 'One clear price', body: 'You see the full price before you pay anything. No surprises from us.' },
  { icon: ICONS.shield, title: 'Checked before it ships', body: 'Every order is checked at our warehouse in China before it leaves, with photos, so you get what you asked for.' },
  { icon: ICONS.chat, title: 'Real people, real answers', body: 'Questions before or after you order? Email us and a person replies.' },
]

const FAQS = [
  { q: 'Where do the products come from?', a: 'We source everything from suppliers and factories in China. Your order is checked at our warehouse there, then shipped to The Bahamas and delivered to your address.' },
  { q: 'How much does it cost?', a: 'Every request gets its own all-in quote. It covers the product, shipping to your address and our service fee, so you know the full price before you pay.' },
  { q: 'Is there a minimum order?', a: 'No. Order one item or a hundred.' },
  { q: 'How long does delivery take?', a: 'It depends on the item and the shipping method. Your quote tells you how it will be shipped and roughly how long it takes, and you can follow every step in your account.' },
  { q: 'How do I pay?', a: 'Once you approve your quote, you’ll get an invoice in your account showing how to pay. We only order your item after payment is received.' },
  { q: 'What if something is wrong with my order?', a: 'We check items at our warehouse before they ship. If something still isn’t right, email us your request number and photos, and we’ll sort it out with you.' },
  { q: 'Can I cancel?', a: 'Yes, any time before you pay. Once we have ordered your item from the supplier, contact us and we’ll see what we can do.' },
  { q: 'Is there anything you can’t get?', a: 'We can’t ship batteries, liquids, weapons or weapon parts, or other restricted items. If you’re not sure, send the request and we’ll let you know.' },
]

function ExampleOrder() {
  const steps = ['Received', 'Quote ready', 'Paid', 'Ordered', 'Shipped', 'Delivered']
  const current = 4
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[28px] bg-[#c40000]/20 blur-2xl" aria-hidden="true" />
      <div className="relative bg-white text-[#0f172a] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Example order</p>
            <p className="font-extrabold text-lg mt-1">Rattan beach bag × 2</p>
            <p className="text-xs text-slate-500">Request #1042 · Deliver to Nassau</p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold px-2.5 py-1">Shipped</span>
        </div>
        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${i <= current ? 'bg-[#c40000] text-white' : 'border-2 border-slate-200'}`}>
                {i <= current && <Icon d={ICONS.check} className="w-3 h-3" />}
              </span>
              <span className={i <= current ? 'font-semibold' : 'text-slate-400'}>{s}</span>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-1.5">
          <div className="flex justify-between text-slate-600"><span>Product</span><span className="tabular-nums">$30.80</span></div>
          <div className="flex justify-between text-slate-600"><span>Shipping to your address</span><span className="tabular-nums">$38.00</span></div>
          <div className="flex justify-between text-slate-600"><span>Service fee</span><span className="tabular-nums">$15.00</span></div>
          <div className="flex justify-between font-extrabold pt-1.5 border-t border-slate-200"><span>Total</span><span className="tabular-nums">$83.80</span></div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const startHref = user ? (user.role === 'admin' ? '/admin' : '/my-requests/new') : '/signup'
  const startLabel = user?.role === 'admin' ? 'Go to request queue' : 'Start a request'

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0f172a] text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              Sourced from China · Delivered to your door
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Anything you want, sourced from China.<br /><span className="text-[#f87171]">Delivered to your door.</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
              Tell us what you&apos;re looking for. We find it from trusted suppliers in China, send you one all-in price, and deliver it to your address in The Bahamas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={startHref} className="inline-flex items-center rounded-xl bg-[#c40000] hover:bg-[#950000] text-white font-semibold px-6 py-3.5 shadow-[0_10px_30px_rgba(196,0,0,0.35)] transition-colors">{startLabel}</Link>
              <Link href="/#how" className="inline-flex items-center rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold px-6 py-3.5 transition-colors">See how it works</Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {['Sourced direct from China', 'One all-in price', 'No minimum order', 'Track every step'].map(t => (
                <li key={t} className="flex items-center gap-2"><Icon d={ICONS.check} className="w-4 h-4 text-[#f87171]" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="max-w-md w-full lg:justify-self-end">
            <ExampleOrder />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Popular requests</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map(c => (
              <li key={c.label} className="flex flex-col items-center text-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-5">
                <span className="text-[#c40000]"><Icon d={c.icon} /></span>
                <span className="text-sm font-semibold text-slate-700">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">From &ldquo;I want this&rdquo; to your doorstep in four steps</h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card">
                <span className="w-10 h-10 rounded-full bg-[#0f172a] text-white font-bold flex items-center justify-center">{i + 1}</span>
                <p className="font-bold text-lg mt-5">{s.title}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why AIMORO */}
      <section id="why" className="scroll-mt-20 bg-[#f5ebdd]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">Why AIMORO</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Shopping from China without the guesswork</h2>
            <p className="text-slate-700 mt-4 leading-relaxed">China has almost anything you can think of, often for far less. But finding a reliable seller, paying in yuan and arranging shipping across the world is a lot of work. We do it for you and keep you posted the whole way.</p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-5">
            {REASONS.map(r => (
              <li key={r.title} className="rounded-3xl bg-white p-6">
                <span className="inline-flex w-11 h-11 rounded-2xl bg-[#c40000]/10 text-[#c40000] items-center justify-center"><Icon d={r.icon} /></span>
                <p className="font-bold text-lg mt-4">{r.title}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3 text-center">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center mb-10">Questions, answered</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-lg">
                  {f.q}
                  <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-45 text-2xl leading-none" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-center text-slate-600 mt-8">
            Still have a question? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#c40000] underline">{CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto rounded-[32px] bg-[#c40000] text-white px-6 sm:px-14 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Seen something you want?</h2>
            <p className="text-white/85 mt-3 text-lg">Send us a photo or a link. We&apos;ll find it in China and come back with one price.</p>
          </div>
          <Link href={startHref} className="shrink-0 inline-flex items-center justify-center rounded-xl bg-white text-[#c40000] hover:bg-[#fff1f1] font-bold px-7 py-4 transition-colors">{startLabel}</Link>
        </div>
      </section>
    </>
  )
}
