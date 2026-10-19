'use client'

import { useEffect, useId, useRef, useState } from 'react'
import * as api from '@/lib/agent'
import { BRANDING_FLOW, BRANDING_LABELS, fileSize, shortDate, type BrandingFile, type BrandingStatus } from '@/lib/agent'
import { ErrorNote, inputClass, labelClass, primaryBtn } from './ui'

const STYLES: Record<BrandingStatus, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-800 border-amber-200',
  in_design: 'bg-blue-50 text-blue-700 border-blue-200',
  proofs_ready: 'bg-violet-50 text-violet-700 border-violet-200',
  changes_requested: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export function BrandingBadge({ status }: { status: BrandingStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STYLES[status]}`}>
      {BRANDING_LABELS[status]}
    </span>
  )
}

export function BrandingSteps({ status }: { status: BrandingStatus }) {
  if (status === 'cancelled') return <BrandingBadge status="cancelled" />
  // Changes requested sits on the design step until new proofs arrive.
  const current = BRANDING_FLOW.indexOf(status === 'changes_requested' ? 'in_design' : status)
  return (
    <ol className="grid grid-cols-5 gap-1 text-[10px] sm:text-[11px] font-semibold text-center">
      {BRANDING_FLOW.map((s, i) => (
        <li key={s}>
          <div className={`h-1.5 rounded-full mb-1.5 ${i <= current ? 'bg-[#c40000]' : 'bg-slate-200'}`} />
          <span className={i === current ? 'text-[#c40000]' : i < current ? 'text-slate-800' : 'text-slate-400'}>
            {s === 'in_design' && status === 'changes_requested' ? 'Making changes' : BRANDING_LABELS[s]}
          </span>
        </li>
      ))}
    </ol>
  )
}

const isImage = (f: BrandingFile) => /^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(f.content_type)

/** Files with image previews (fetched with the login token) and a download button. */
export function BrandingFileGrid({ projectId, files, onDelete, empty }: {
  projectId: number; files: BrandingFile[]; onDelete?: (id: number) => void; empty?: string
}) {
  const [urls, setUrls] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const key = files.map(f => f.id).join(',')
  useEffect(() => {
    let alive = true
    const made: string[] = []
    Promise.all(files.filter(isImage).map(async f => {
      try { const u = await api.fetchFileUrl(api.brandingFilePath(projectId, f.id)); made.push(u); return [f.id, u] as const }
      catch { return null }
    })).then(rows => { if (alive) setUrls(Object.fromEntries(rows.filter((r): r is readonly [number, string] => !!r))) })
    return () => { alive = false; made.forEach(u => URL.revokeObjectURL(u)) }
  }, [projectId, key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!files.length) return empty ? <p className="text-sm text-slate-500">{empty}</p> : null
  const download = (f: BrandingFile) =>
    api.downloadFile(api.brandingFilePath(projectId, f.id), f.filename).catch(e => setError(e.message))
  return (
    <div className="space-y-2">
      <ErrorNote message={error} />
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {files.map(f => (
          <li key={f.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
            <button type="button" onClick={() => urls[f.id] ? window.open(urls[f.id], '_blank') : download(f)}
              className="block aspect-[4/3] bg-slate-50 border-b border-slate-100" title={f.filename}>
              {urls[f.id]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={urls[f.id]} alt={f.filename} className="w-full h-full object-contain" />
                : <span className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    {f.filename.split('.').pop()}
                  </span>}
            </button>
            <div className="p-2.5 flex-1 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-slate-800 break-all line-clamp-2">{f.filename}</p>
              <p className="text-[11px] text-slate-500">{fileSize(f.size_bytes)} · {shortDate(f.created_at)}</p>
              <div className="mt-auto flex gap-2">
                <button type="button" onClick={() => download(f)} className="text-xs font-semibold text-[#c40000] hover:underline">Download</button>
                {onDelete && (
                  <button type="button" onClick={() => { if (confirm(`Remove ${f.filename}?`)) onDelete(f.id) }}
                    className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.zip,.ai,.eps,.psd,.ttf,.otf'

/** Drop zone (click or drag files in) + optional message + upload button with a progress bar. */
export function UploadBox({ label, button, withMessage = false, messagePlaceholder = '', onUpload, hint }: {
  label: string; button: string; withMessage?: boolean; messagePlaceholder?: string; hint?: string
  onUpload: (files: File[], message: string, onProgress: (pct: number) => void) => Promise<unknown>
}) {
  const uid = useId()
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [pct, setPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const incoming = Array.from(list)
    setFiles(prev => [...prev, ...incoming.filter(f => !prev.some(p => p.name === f.name && p.size === f.size))])
    setError(null)
  }

  async function submit() {
    if (!files.length) { setError('Choose at least one file first'); return }
    setError(null); setPct(0)
    try {
      await onUpload(files, message, setPct)
      setFiles([]); setMessage('')
      if (input.current) input.current.value = ''
    } catch (e) { setError((e as Error).message) }
    finally { setPct(null) }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass}>{label}</p>
        <label htmlFor={uid}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${dragging ? 'border-[#c40000] bg-[#c40000]/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
          <span className="text-sm font-semibold text-slate-800">Click to choose files, or drag them here</span>
          <span className="text-xs text-slate-500">Images, PDF, SVG, AI, EPS, PSD, fonts or ZIP</span>
        </label>
        <input id={uid} ref={input} type="file" multiple accept={ACCEPT} className="sr-only"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map(f => (
              <li key={f.name + f.size} className="flex items-center justify-between gap-2 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="truncate text-slate-700">{f.name} <span className="text-slate-400">· {fileSize(f.size)}</span></span>
                <button type="button" disabled={pct !== null} onClick={() => setFiles(fs => fs.filter(x => x !== f))}
                  className="shrink-0 font-semibold text-slate-400 hover:text-red-600">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {withMessage && (
        <div>
          <label className={labelClass} htmlFor={`${uid}-msg`}>Note for the customer (optional)</label>
          <textarea id={`${uid}-msg`} value={message} onChange={e => setMessage(e.target.value)} rows={3}
            placeholder={messagePlaceholder} className={inputClass} />
        </div>
      )}
      <ErrorNote message={error} />
      {pct !== null && (
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#c40000] transition-all" style={{ width: `${pct}%` }} /></div>
      )}
      <button type="button" onClick={submit} disabled={pct !== null} className={primaryBtn}>
        {pct !== null ? `Uploading… ${pct}%` : files.length ? `${button} (${files.length} file${files.length === 1 ? '' : 's'})` : button}
      </button>
    </div>
  )
}

/** Proof files grouped by round, newest first. */
export function ProofRounds({ projectId, files, onDelete }: {
  projectId: number; files: BrandingFile[]; onDelete?: (id: number) => void
}) {
  const proofs = files.filter(f => f.kind === 'proof')
  const rounds = Array.from(new Set(proofs.map(f => f.round_no ?? 1))).sort((a, b) => b - a)
  if (!rounds.length) return <p className="text-sm text-slate-500">No proofs yet.</p>
  return (
    <div className="space-y-5">
      {rounds.map((r, i) => (
        <div key={r}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Proof set {r}{i === 0 ? ' · latest' : ''}
          </p>
          <BrandingFileGrid projectId={projectId} files={proofs.filter(f => (f.round_no ?? 1) === r)} onDelete={onDelete} />
        </div>
      ))}
    </div>
  )
}
