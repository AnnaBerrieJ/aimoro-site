import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Logo watermark */}
      <div className="relative mb-8">
        <div className="w-20 h-20 relative opacity-20">
          <Image src="/favicon.png" alt="Aimoro" fill className="object-contain" />
        </div>
      </div>

      <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-2">404</p>
      <h1 className="text-3xl font-extrabold text-[#0f172a] mb-3">Page not found</h1>
      <p className="text-slate-500 text-sm max-w-xs mb-8">
        This supplier may have moved or doesn&apos;t exist. Let&apos;s get you back to sourcing.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-2.5 rounded-xl shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all text-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/find-suppliers"
          className="bg-white border border-slate-200 text-[#0f172a] font-bold px-6 py-2.5 rounded-xl hover:border-[#c40000]/30 hover:text-[#c40000] transition-all text-sm"
        >
          Find Suppliers
        </Link>
      </div>
    </div>
  )
}
