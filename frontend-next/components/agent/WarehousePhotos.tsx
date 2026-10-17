'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/agent'
import { shortDate, type WarehousePhoto } from '@/lib/agent'
import { ErrorNote, inputClass, primaryBtn } from './ui'

/** China warehouse check photos and videos. Click a photo to open it full size; videos play in place. */
export function WarehousePhotoGrid({ requestId, photos, onDelete }: {
  requestId: number; photos: WarehousePhoto[]; onDelete?: (id: number) => void
}) {
  const [urls, setUrls] = useState<Record<number, string>>({})
  const key = photos.map(p => p.id).join(',')
  useEffect(() => {
    let alive = true
    const made: string[] = []
    Promise.all(photos.map(async p => {
      try { const u = await api.fetchFileUrl(api.warehousePhotoPath(requestId, p.id)); made.push(u); return [p.id, u] as const }
      catch { return null }
    })).then(rows => { if (alive) setUrls(Object.fromEntries(rows.filter((r): r is readonly [number, string] => !!r))) })
    return () => { alive = false; made.forEach(u => URL.revokeObjectURL(u)) }
  }, [requestId, key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!photos.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {photos.map(p => (
        <figure key={p.id} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {!urls[p.id] ? <div className="w-full aspect-square" />
            : p.media_type === 'video'
              ? <video src={urls[p.id]} controls playsInline preload="metadata" className="w-full aspect-square object-cover bg-black" />
              : <a href={urls[p.id]} target="_blank" rel="noopener noreferrer"><img src={urls[p.id]} alt={p.caption || 'Warehouse check photo'} className="w-full aspect-square object-cover" /></a>}
          <figcaption className="px-2 py-1.5 text-[11px] text-slate-600">{p.media_type === 'video' ? 'Video · ' : ''}{p.caption || 'Warehouse check'} · {shortDate(p.created_at)}</figcaption>
          {onDelete && (
            <button type="button" aria-label={p.media_type === 'video' ? 'Delete video' : 'Delete photo'} onClick={() => onDelete(p.id)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-slate-600 hover:text-red-600 font-bold shadow">×</button>
          )}
        </figure>
      ))}
    </div>
  )
}

/** Admin: upload warehouse check photos and videos (several at once) with an optional caption. */
export function WarehousePhotoUpload({ req, onChanged }: { req: api.AdminRequest; onChanged: () => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await fn(); await onChanged() } catch (e) { setError((e as Error).message) } finally { setBusy(false); setProgress(null) }
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-600">Warehouse check photos and videos <span className="font-normal text-slate-500">(the customer sees these on their request page)</span></p>
      <WarehousePhotoGrid requestId={req.id} photos={req.warehouse_photos}
        onDelete={id => run(() => api.deleteWarehousePhoto(id))} />
      <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2" onSubmit={e => {
        e.preventDefault()
        if (files.length) run(async () => { await api.uploadWarehousePhotos(req.id, files, caption, setProgress); setFiles([]); setCaption('') })
      }}>
        <input aria-label="Warehouse photos and videos" type="file" multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v"
          className="text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
          onChange={e => setFiles(Array.from(e.target.files ?? []))} key={files.length ? 'has' : 'empty'} />
        <input aria-label="Photo caption" placeholder="Caption (optional), e.g. Colour and size checked" className={inputClass} maxLength={200}
          value={caption} onChange={e => setCaption(e.target.value)} />
        <button disabled={busy || !files.length} className={primaryBtn}>
          {busy ? `Uploading${progress != null ? ` ${progress}%` : '…'}` : `Upload${files.length ? ` ${files.length}` : ''}`}
        </button>
      </form>
      {busy && progress != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#c40000] transition-all" style={{ width: `${progress}%` }} /></div>
      )}
      <p className="text-[11px] text-slate-500">Photos: JPG, PNG or WebP, up to 8 MB each. Videos: MP4, MOV or WebM, up to 100 MB each. Up to 20 files per order.</p>
      <ErrorNote message={error} />
    </div>
  )
}
