import Link from 'next/link'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Home</Link>
      <h1 className="text-4xl font-extrabold tracking-tight mt-6">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">Last updated {updated}</p>
      <div className="mt-10 space-y-8 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0f172a] [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#c40000] [&_a]:underline">
        {children}
      </div>
    </div>
  )
}
