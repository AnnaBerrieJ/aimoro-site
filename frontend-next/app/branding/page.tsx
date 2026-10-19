import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CONTACT_EMAIL, CONTACT_WHATSAPP, CONTACT_WHATSAPP_2, whatsappLink } from '@/lib/agent'

export const metadata: Metadata = {
  title: 'Branding · AIMORO',
  description: 'Logos, brand guides and branded products like t-shirts, caps, mugs, tumblers and pens, designed by AIMORO and produced in China.',
}

const WA_TEXT = 'Hi AIMORO, I’d like to talk about a branding project.'

const SERVICES = [
  { title: 'Logo design', body: 'A full logo suite: main, stacked, icon, simplified and one-colour versions, with clear rules for when to use each.' },
  { title: 'Colours and fonts', body: 'Exact colour codes for screen, print and embroidery, plus the fonts that pull everything together.' },
  { title: 'T-shirts and apparel', body: 'T-shirts, polos, hoodies and caps with your logo, printed or embroidered in your colours.' },
  { title: 'Branded merch', body: 'Mugs, tumblers, pens, tote bags, stickers and more, for your team, your customers and giveaways.' },
  { title: 'Signs and displays', body: 'Shop signs, vehicle decals, banners, table covers and feather flags for events.' },
  { title: 'Digital and social', body: 'Profile pictures, cover photos, website banners and email signature logos in the right sizes.' },
  { title: 'Website design', body: 'A custom one-page website in HTML, designed around your brand and ready to put online.' },
]

const PRODUCTS = [
  { src: 'tshirts-dark', label: 'T-shirts', w: 434, h: 298 },
  { src: 'polos-dark', label: 'Polo shirts', w: 478, h: 298 },
  { src: 'polos-white', label: 'Polo shirts, light style', w: 440, h: 294 },
  { src: 'longsleeve-white', label: 'Dry-fit long sleeve', w: 394, h: 294 },
  { src: 'hats-dark', label: 'Caps and hats', w: 318, h: 300 },
  { src: 'tumblers-white', label: 'Tumblers and water bottles', w: 335, h: 282 },
  { src: 'hoodie-dark', label: 'Hoodies and jackets', w: 390, h: 296 },
  { src: 'merch-white', label: 'Notebooks, pens, keychains and totes', w: 379, h: 282 },
  { src: 'vehicle-white', label: 'Vehicle decal', w: 462, h: 282 },
]

const PACKAGES = [
  {
    name: 'Basic', tagline: 'Logo and colours', price: '$200', time: 'Delivered in 5 business days',
    items: ['Logo design: main, icon and one-colour versions', 'Logo sized for social media: 1:1, 4:5, 9:16 and 16:9',
      'Brand colours and fonts', '1 product mockup', '1 round of changes'],
  },
  {
    name: 'Standard', tagline: 'Brand plus products', price: '$400', time: 'Delivered in 7 to 10 business days', featured: true,
    items: ['Everything in Basic', 'Mockups of your logo on up to 5 products', 'Logo placement guide',
      'Social media kit: profile picture, cover and 3 post templates', 'Business card design', '2 rounds of changes'],
  },
  {
    name: 'Full', tagline: 'Complete brand package', price: '$600', time: 'Delivered in 10 to 14 business days',
    items: ['Everything in Standard', 'Website design: a custom one-page HTML website', 'Signage and marketing materials', 'Packaging design', 'Complete brand guide (PDF)',
      'Production-ready files for manufacturing', 'Sourcing fee waived on your first order', '3 rounds of changes'],
  },
]

const STEPS = [
  { title: 'Tell us about your business', body: 'What you do, who you serve and the look you like. Send examples if you have them.' },
  { title: 'We design your brand', body: 'You get your logo, colours and mockups, and we refine them with you until they’re right.' },
  { title: 'Get your brand guide', body: 'Every file and rule your printers, sign makers and web designer need, in one place.' },
  { title: 'We produce it in China', body: 'Want shirts, cups or pens made? We source them from our manufacturers, with samples to approve, and deliver to your door.' },
]

function Check({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  )
}

export default function BrandingPage() {
  const wa = whatsappLink(CONTACT_WHATSAPP, WA_TEXT)
  return (
    <>
      {/* Hero */}
      <section className="bg-[#0f172a] text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              Branding · Designed by us, produced in China
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
              A brand that looks<br /><span className="text-[#f87171]">the part, everywhere.</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
              We design your logo and colours, put them on the products your business uses, then make them for you through our manufacturers in China. One team from first sketch to finished product.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/my-branding/new" className="inline-flex items-center rounded-xl bg-[#c40000] hover:bg-[#950000] text-white font-semibold px-6 py-3.5 shadow-[0_10px_30px_rgba(196,0,0,0.35)] transition-colors">Start a branding project</Link>
              <a href="#packages" className="inline-flex items-center rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold px-6 py-3.5 transition-colors">See packages</a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {['Logo suite and brand guide', 'Branded merch', 'Made in China, delivered to you'].map(t => (
                <li key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-[#f87171]" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="relative max-w-lg w-full lg:justify-self-end">
            <div className="absolute -inset-4 rounded-[28px] bg-[#c40000]/20 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white p-6 sm:p-10">
              <Image src="/AimoroLogo.png" alt="AIMORO logo" width={500} height={500} priority className="w-full max-w-sm mx-auto h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">What we create</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything your business needs to look professional</h2>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <li key={s.title} className={`rounded-3xl border border-slate-100 bg-white p-6 shadow-card ${i === SERVICES.length - 1 && SERVICES.length % 3 === 1 ? 'lg:col-span-3' : ''} ${i === SERVICES.length - 1 && SERVICES.length % 2 === 1 ? 'sm:col-span-2' : ''}`}>
                <span className="text-sm font-extrabold text-[#c40000] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-bold text-lg mt-3">{s.title}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Branded products */}
      <section id="products" className="scroll-mt-20 bg-[#f5ebdd]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-end mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">Branded products</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Sample brand kit: AIMORO</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              We design how your logo sits on each product, then have it made by our manufacturers in China and delivered to you. Great for your team, your customers and giveaways. Here’s our own brand kit, in both a dark and a light style. Yours is designed around your logo and colours.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden bg-white shadow-card mb-5">
            <Image src="/branding/brand-board.jpg" alt="AIMORO brand board: main logo, logo variations, icon, brand colours and fonts" width={1536} height={362} className="w-full h-auto" />
            <p className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Logo suite, colours and fonts</p>
          </div>
          <ul className="flex flex-wrap gap-4 sm:gap-5">
            {PRODUCTS.map(p => (
              <li key={p.src} className="rounded-3xl overflow-hidden bg-white shadow-card" style={{ flexGrow: p.w / p.h, flexBasis: `${(p.w / p.h) * 230}px` }}>
                <div className="relative bg-slate-100" style={{ aspectRatio: `${p.w} / ${p.h}` }}>
                  <Image src={`/branding/${p.src}.jpg`} alt={`${p.label} with the AIMORO logo`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
                <p className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{p.label}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-600 mt-6">Need something else? Mugs, stickers, lanyards, phone cases, packaging and more. Just ask.</p>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">Packages</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Choose your package</h2>
            <p className="text-slate-600 mt-4 leading-relaxed">One-time design price. Producing your branded products is quoted separately, by item and quantity.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 items-stretch">
            {PACKAGES.map(p => (
              <div key={p.name} className={`relative rounded-3xl p-7 flex flex-col ${p.featured ? 'bg-[#0f172a] text-white shadow-2xl lg:-my-3' : 'bg-white border border-slate-200'}`}>
                {p.featured && <span className="absolute -top-3 left-7 rounded-full bg-[#c40000] text-white text-xs font-bold uppercase tracking-wider px-3 py-1">Most popular</span>}
                <p className={`text-2xl font-extrabold ${p.featured ? 'text-[#fbbf24]' : 'text-[#c40000]'}`}>{p.name}</p>
                <p className={`text-sm mt-1 ${p.featured ? 'text-slate-300' : 'text-slate-500'}`}>{p.tagline}</p>
                <p className="text-5xl font-extrabold tracking-tight mt-6 tabular-nums">{p.price}</p>
                <p className={`text-sm mt-2 ${p.featured ? 'text-slate-300' : 'text-slate-500'}`}>{p.time}</p>
                <ul className={`mt-6 pt-6 space-y-3 text-sm flex-1 border-t ${p.featured ? 'border-white/15' : 'border-slate-200'}`}>
                  {p.items.map((it, i) => (
                    <li key={it} className="flex gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.featured ? 'text-[#fbbf24]' : 'text-[#c40000]'}`} />
                      <span className={i === 0 && it.startsWith('Everything') ? 'font-bold' : ''}>{it}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/my-branding/new?package=${p.name.toLowerCase()}`}
                  className={`mt-8 inline-flex justify-center items-center rounded-xl font-semibold px-5 py-3 transition-colors ${p.featured ? 'bg-[#c40000] hover:bg-[#950000] text-white' : 'border border-slate-300 hover:bg-slate-50 text-[#0f172a]'}`}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="font-bold text-lg">Add-ons and custom quotes</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">Extra changes, rush delivery, flyers or extra mockups are available on request. Need something different? Ask us for a custom quote.</p>
            </div>
            <a href={whatsappLink(CONTACT_WHATSAPP, 'Hi AIMORO, I’d like a custom branding quote.')} target="_blank" rel="noopener noreferrer"
              className="shrink-0 inline-flex justify-center items-center rounded-xl bg-[#0f172a] hover:bg-black text-white font-semibold px-5 py-3 transition-colors">
              Ask for a custom quote
            </a>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c40000] mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">From idea to branded products in your hands</h2>
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

      {/* CTA */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto rounded-[32px] bg-[#c40000] text-white px-6 sm:px-14 py-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to build your brand?</h2>
            <p className="text-white/85 mt-3 text-lg">Message us on WhatsApp or email <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold">{CONTACT_EMAIL}</a>.</p>
            <p className="text-white/85 mt-2 text-lg">WhatsApp: {[CONTACT_WHATSAPP, CONTACT_WHATSAPP_2].map((n, i) => (
              <span key={n}>{i > 0 && ' · '}<a href={whatsappLink(n, WA_TEXT)} target="_blank" rel="noopener noreferrer" className="underline font-semibold whitespace-nowrap">{n}</a></span>
            ))}</p>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center justify-center rounded-xl bg-white text-[#c40000] hover:bg-[#fff1f1] font-bold px-7 py-4 transition-colors">Message us on WhatsApp</a>
        </div>
      </section>
    </>
  )
}
