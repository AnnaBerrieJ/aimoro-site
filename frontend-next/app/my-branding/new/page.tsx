'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, inputClass, labelClass, primaryBtn } from '@/components/agent/ui'
import * as api from '@/lib/agent'
import { bsd, type BrandingPackage, type BrandingPackageKey } from '@/lib/agent'

const KEYS: BrandingPackageKey[] = ['basic', 'standard', 'full']

function NewBrandingForm() {
  const router = useRouter()
  const params = useSearchParams()
  const initial = params.get('package')
  const [pkg, setPkg] = useState<BrandingPackageKey>(KEYS.includes(initial as BrandingPackageKey) ? initial as BrandingPackageKey : 'standard')
  const [packages, setPackages] = useState<BrandingPackage[]>([])
  const [form, setForm] = useState({ business_name: '', industry: '', description: '', style_notes: '', colours: '', reference_url: '' })
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.brandingPackages().then(setPackages).catch(e => setError(e.message)) }, [])
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const p = await api.createBranding({
        package: pkg,
        business_name: form.business_name.trim(),
        industry: form.industry.trim(),
        description: form.description.trim(),
        style_notes: form.style_notes.trim(),
        colours: form.colours.trim(),
        reference_url: form.reference_url.trim(),
      })
      if (files.length) {
        try { await api.uploadBrandingReferences(p.id, files) }
        catch { router.replace(`/my-branding/${p.id}?new=1&upload_failed=1`); return }
      }
      router.replace(`/my-branding/${p.id}?new=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your branding request')
      setBusy(false)
    }
  }

  const chosen = packages.find(p => p.key === pkg)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/branding" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Branding packages</Link>
      <div className="mt-3">
        <PageHeader title="Start a branding project" subtitle="Tell us about your business. Your invoice is ready as soon as you send this, and we start designing once it's paid." />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <h2 className="font-bold text-slate-900 mb-3">1. Choose your package</h2>
          <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Package">
            {KEYS.map(k => {
              const p = packages.find(x => x.key === k)
              const on = pkg === k
              return (
                <button type="button" key={k} role="radio" aria-checked={on} onClick={() => setPkg(k)}
                  className={`text-left rounded-xl border-2 p-4 transition-colors ${on ? 'border-[#c40000] bg-[#c40000]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className={`font-extrabold ${on ? 'text-[#c40000]' : 'text-slate-900'}`}>{p?.name ?? k}</p>
                  <p className="text-xl font-extrabold mt-1 tabular-nums">{p ? bsd(p.price) : '…'}</p>
                  {p && <p className="text-xs text-slate-500 mt-1">{p.rounds} round{p.rounds === 1 ? '' : 's'} of changes · {p.days}</p>}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">Not sure? <Link href="/branding#packages" target="_blank" className="font-semibold text-[#c40000] underline">Compare what each package includes</Link>.</p>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-bold text-slate-900">2. About your business</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="business_name">Business or brand name *</label>
              <input id="business_name" required minLength={2} value={form.business_name} onChange={set('business_name')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry">What kind of business?</label>
              <input id="industry" value={form.industry} onChange={set('industry')} placeholder="e.g. food truck, salon, cleaning company" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="description">What do you do, and who are your customers?</label>
            <textarea id="description" rows={3} value={form.description} onChange={set('description')} className={inputClass} />
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-bold text-slate-900">3. The look you want</h2>
          <div>
            <label className={labelClass} htmlFor="style_notes">Style and feel</label>
            <textarea id="style_notes" rows={3} value={form.style_notes} onChange={set('style_notes')}
              placeholder="e.g. modern and clean, bold and fun, luxury, island feel. Anything you don't want?" className={inputClass} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="colours">Colours you like</label>
              <input id="colours" value={form.colours} onChange={set('colours')} placeholder="e.g. teal and gold" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="reference_url">Link to examples (optional)</label>
              <input id="reference_url" type="url" value={form.reference_url} onChange={set('reference_url')} placeholder="https://" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="refs">Your current logo or examples you like (optional)</label>
            <input id="refs" type="file" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))}
              accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.zip,.ai,.eps,.psd"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" />
            <p className="text-xs text-slate-500 mt-1">Images, PDF, SVG, AI, EPS, PSD or ZIP. You can add more later.</p>
          </div>
        </Card>

        <ErrorNote message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{chosen ? <>Total: <span className="font-extrabold text-slate-900">{bsd(chosen.price)}</span>, one-time design price</> : ''}</p>
          <button type="submit" disabled={busy || !packages.length} className={primaryBtn}>
            {busy ? 'Sending…' : 'Send and get my invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewBrandingPage() {
  return <RequireAuth><Suspense><NewBrandingForm /></Suspense></RequireAuth>
}
