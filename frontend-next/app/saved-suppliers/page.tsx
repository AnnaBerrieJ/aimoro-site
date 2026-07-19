'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSavedSuppliers, deleteSavedSupplier } from '@/lib/api'
import type { SavedSupplier } from '@/lib/types'

// ── localStorage helpers ──────────────────────────────────────────────────────

const NOTES_KEY = 'aimoro_supplier_notes'
const TAGS_KEY  = 'aimoro_supplier_tags'

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function saveLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function loadNotes(): Record<number, string> { return loadLS(NOTES_KEY, {}) }
function saveNote(id: number, note: string) {
  const notes = loadNotes()
  if (note.trim()) notes[id] = note.trim(); else delete notes[id]
  saveLS(NOTES_KEY, notes)
}

type SupplierStatus = 'Shortlisted' | 'Contacted' | 'Rejected' | ''
function loadTags(): Record<number, SupplierStatus> { return loadLS(TAGS_KEY, {}) }
function saveTag(id: number, tag: SupplierStatus) {
  const tags = loadTags()
  if (tag) tags[id] = tag; else delete tags[id]
  saveLS(TAGS_KEY, tags)
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'unit_price' | 'rating' | 'delivery_days'
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS: SupplierStatus[] = ['Shortlisted', 'Contacted', 'Rejected']
const STATUS_STYLES: Record<SupplierStatus, string> = {
  Shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted:   'bg-amber-50 text-amber-700 border-amber-200',
  Rejected:    'bg-red-50 text-red-600 border-red-200',
  '':          'bg-slate-50 text-slate-400 border-slate-200',
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(suppliers: SavedSupplier[], tags: Record<number, SupplierStatus>) {
  const headers = ['Name', 'Platform', 'Country', 'Product', 'Price ($)', 'MOQ', 'Rating', 'Delivery (days)', 'Verified', 'Score', 'Status', 'URL']
  const rows = suppliers.map(s => [
    s.name, s.platform, s.country, s.product, s.unit_price,
    s.minimum_order_quantity, s.rating, s.delivery_days,
    s.verified ? 'Yes' : 'No', s.aimoro_score ?? '',
    tags[s.saved_id] ?? '', s.supplier_url ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'aimoro-saved-suppliers.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SavedSuppliersPage() {
  const [suppliers, setSuppliers]   = useState<SavedSupplier[]>([])
  const [loading, setLoading]       = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [platformFilter, setPlatformFilter] = useState('All')
  const [statusFilter, setStatusFilter]     = useState<SupplierStatus | 'All'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [notes, setNotes]     = useState<Record<number, string>>({})
  const [tags, setTags]       = useState<Record<number, SupplierStatus>>({})
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [draftNote, setDraftNote]     = useState('')
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    getSavedSuppliers().then(setSuppliers).catch(() => {}).finally(() => setLoading(false))
    setNotes(loadNotes())
    setTags(loadTags())
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(savedId: number, name: string) {
    if (!confirm(`Remove ${name} from saved suppliers?`)) return
    setDeletingId(savedId)
    try {
      await deleteSavedSupplier(savedId)
      setSuppliers(prev => prev.filter(s => s.saved_id !== savedId))
      setSelected(prev => { const n = new Set(prev); n.delete(savedId); return n })
    } catch { alert('Could not delete supplier.') }
    finally { setDeletingId(null) }
  }

  async function handleBulkDelete() {
    if (!confirm(`Remove ${selected.size} supplier${selected.size > 1 ? 's' : ''}?`)) return
    setBulkDeleting(true)
    for (const id of Array.from(selected)) {
      try { await deleteSavedSupplier(id) } catch { /* skip */ }
    }
    setSuppliers(prev => prev.filter(s => !selected.has(s.saved_id)))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  function startEditNote(id: number) { setEditingNote(id); setDraftNote(notes[id] ?? '') }
  function commitNote(id: number) { saveNote(id, draftNote); setNotes(loadNotes()); setEditingNote(null) }

  // ── Tags ──────────────────────────────────────────────────────────────────

  function setStatus(id: number, status: SupplierStatus) {
    saveTag(id, status); setTags(loadTags())
  }

  // ── Sort / filter ─────────────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const platforms = useMemo(() => ['All', ...Array.from(new Set(suppliers.map(s => s.platform)))], [suppliers])

  const filtered = useMemo(() => {
    let list = platformFilter === 'All' ? suppliers : suppliers.filter(s => s.platform === platformFilter)
    if (statusFilter !== 'All') list = list.filter(s => (tags[s.saved_id] ?? '') === statusFilter)
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [suppliers, platformFilter, statusFilter, sortKey, sortDir, tags])

  // ── Selection ─────────────────────────────────────────────────────────────

  function toggleSelect(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.saved_id)))
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
        sortKey === k ? 'bg-[#c40000] text-white border-[#c40000]'
          : 'bg-white text-slate-500 border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000]'}`}>
      {label}<span className="opacity-70">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-1">Your shortlist</p>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Saved Suppliers</h1>
        </div>
        {suppliers.length > 0 && (
          <button onClick={() => exportCSV(filtered, tags)}
            className="flex items-center gap-2 text-sm font-semibold bg-white border border-slate-200 hover:border-[#c40000]/40 hover:text-[#c40000] text-slate-600 px-4 py-2 rounded-xl transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-[18px] border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" /><div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && suppliers.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">
          No saved suppliers yet. Go to <strong className="text-[#0f172a]">Find Suppliers</strong> and hit Save on any result.
        </div>
      )}

      {!loading && suppliers.length > 0 && (
        <>
          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {platforms.map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    platformFilter === p ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-[#0f172a]'}`}>
                  {p}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {(['All', ...STATUS_OPTIONS] as const).map(st => (
                <button key={st} onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === st ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-[#0f172a]'}`}>
                  {st}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Sort:</span>
              <SortBtn k="name" label="Name" />
              <SortBtn k="unit_price" label="Price" />
              <SortBtn k="rating" label="Rating" />
              <SortBtn k="delivery_days" label="Delivery" />
            </div>
          </div>

          {/* Bulk action bar */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-[#c40000]" />
              <span className="text-xs text-slate-500 font-medium">
                {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} supplier${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </label>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <button onClick={() => exportCSV(filtered.filter(s => selected.has(s.saved_id)), tags)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000] px-3 py-1.5 rounded-lg transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export selected
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {bulkDeleting ? 'Deleting…' : `Delete ${selected.size}`}
                </button>
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.saved_id} className={`relative overflow-hidden bg-white rounded-[18px] border p-5 shadow-card transition-all ${
                selected.has(s.saved_id) ? 'border-[#c40000]/40 ring-2 ring-[#c40000]/20' : 'border-[#e5e7eb]'}`}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c40000] via-[#ff5a5a] to-[#c40000]" />

                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input type="checkbox" checked={selected.has(s.saved_id)} onChange={() => toggleSelect(s.saved_id)}
                    className="w-4 h-4 mt-1 accent-[#c40000] flex-shrink-0 cursor-pointer" />

                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-extrabold text-[#111827]">{s.name}</p>
                          {/* Status badge */}
                          {tags[s.saved_id] && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[tags[s.saved_id]]}`}>
                              {tags[s.saved_id]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {s.platform} · {s.country} · {s.product} · <span className="font-semibold text-[#0f172a]">${s.unit_price}</span> · MOQ {s.minimum_order_quantity} · {s.delivery_days}d · ★ {s.rating}
                          {s.verified ? ' · ✓ Verified' : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {/* Status picker */}
                        <select
                          value={tags[s.saved_id] ?? ''}
                          onChange={e => setStatus(s.saved_id, e.target.value as SupplierStatus)}
                          className={`text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#c40000]/20 cursor-pointer ${STATUS_STYLES[tags[s.saved_id] ?? '']}`}
                        >
                          <option value="">Set status…</option>
                          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>

                        {s.supplier_url && (
                          <a href={s.supplier_url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-[#c40000] border border-[#c40000]/30 px-3 py-1.5 rounded-xl hover:bg-[#fff1f1] transition-colors">
                            View on {s.platform}
                          </a>
                        )}
                        <button onClick={() => handleDelete(s.saved_id, s.name)} disabled={deletingId === s.saved_id}
                          className="text-sm font-semibold text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                          {deletingId === s.saved_id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {editingNote === s.saved_id ? (
                        <div className="flex items-end gap-2">
                          <textarea autoFocus rows={2} value={draftNote} onChange={e => setDraftNote(e.target.value)}
                            placeholder="Add a private note…"
                            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c40000]/20 resize-none" />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => commitNote(s.saved_id)} className="text-xs font-bold text-white bg-[#c40000] px-3 py-1.5 rounded-lg hover:bg-[#a30000] transition-colors">Save</button>
                            <button onClick={() => setEditingNote(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => startEditNote(s.saved_id)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#c40000] transition-colors group">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {notes[s.saved_id]
                            ? <span className="text-slate-600 group-hover:text-[#c40000]">{notes[s.saved_id]}</span>
                            : <span>Add note</span>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
