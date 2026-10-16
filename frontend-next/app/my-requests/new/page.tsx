'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RequireAuth } from '@/components/agent/RequireAuth'
import { Card, ErrorNote, PageHeader, inputClass, labelClass, primaryBtn } from '@/components/agent/ui'
import { createRequest, uploadPhoto } from '@/lib/agent'
import { useAuth } from '@/components/AuthProvider'

function NewRequestForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [form, setForm] = useState({ product_name: '', description: '', reference_url: '', quantity: '1', target_price_bsd: '', delivery_address: '' })
  useEffect(() => {
    if (user) setForm(f => (f.delivery_address ? f : { ...f, delivery_address: [user.address, user.island].filter(Boolean).join(', ') }))
  }, [user])
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (photo && photo.size > 8 * 1024 * 1024) { setError('Photo must be under 8 MB'); return }
    setBusy(true); setError(null)
    try {
      const req = await createRequest({
        product_name: form.product_name.trim(),
        description: form.description.trim(),
        reference_url: form.reference_url.trim(),
        delivery_address: form.delivery_address.trim(),
        quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
        target_price_bsd: form.target_price_bsd ? Number(form.target_price_bsd) : null,
      })
      if (photo) await uploadPhoto(req.id, photo)
      router.replace(`/my-requests/${req.id}?new=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader title="New request" subtitle="Describe the product. A photo or a link helps us find the exact item." />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="product_name">What do you want?</label>
            <input id="product_name" required minLength={2} placeholder="e.g. Rattan beach bag" className={inputClass}
              value={form.product_name} onChange={set('product_name')} />
          </div>
          <div>
            <label className={labelClass} htmlFor="description">Details</label>
            <textarea id="description" rows={3} placeholder="Size, colour, material, anything that matters" className={inputClass}
              value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className={labelClass} htmlFor="photo">Photo (optional)</label>
            <input id="photo" type="file" accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="reference_url">Link to a similar product (optional)</label>
            <input id="reference_url" type="url" placeholder="https://…" className={inputClass}
              value={form.reference_url} onChange={set('reference_url')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="quantity">Quantity</label>
              <input id="quantity" type="number" min={1} required className={inputClass}
                value={form.quantity} onChange={set('quantity')} />
            </div>
            <div>
              <label className={labelClass} htmlFor="budget">Budget (BSD, optional)</label>
              <input id="budget" type="number" min={0} step="0.01" className={inputClass}
                value={form.target_price_bsd} onChange={set('target_price_bsd')} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="delivery_address">Deliver to</label>
            <textarea id="delivery_address" rows={2} required className={inputClass} placeholder="Street, settlement, island"
              value={form.delivery_address} onChange={set('delivery_address')} />
          </div>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Sending…' : 'Send request'}</button>
          <p className="text-xs text-slate-500">Your quote covers the product, shipping to this address and our service fee. We can't ship batteries, liquids or other restricted items.</p>
        </form>
      </Card>
    </div>
  )
}

export default function NewRequestPage() {
  return <RequireAuth><NewRequestForm /></RequireAuth>
}
