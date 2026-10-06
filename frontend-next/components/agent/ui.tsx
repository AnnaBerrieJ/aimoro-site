'use client'

import { STATUS_FLOW, STATUS_LABELS, type RequestStatus } from '@/lib/agent'

const STATUS_STYLES: Record<RequestStatus, string> = {
  received: 'bg-slate-100 text-slate-700 border-slate-200',
  sourcing: 'bg-blue-50 text-blue-700 border-blue-200',
  quote_ready: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ordered: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function StatusSteps({ status }: { status: RequestStatus }) {
  if (status === 'cancelled') return <StatusBadge status="cancelled" />
  const current = STATUS_FLOW.indexOf(status)
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2 text-[11px] font-semibold">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={[
            'px-2 py-1 rounded-full border',
            i < current ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : i === current ? 'bg-[#c40000] text-white border-[#c40000]'
              : 'bg-white text-slate-400 border-slate-200',
          ].join(' ')}>
            {STATUS_LABELS[s]}
          </span>
          {i < STATUS_FLOW.length - 1 && <span className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-card border border-slate-100 shadow-card p-5 ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{message}</p>
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c40000]/30 focus:border-[#c40000]'
export const labelClass = 'block text-xs font-semibold text-slate-600 mb-1'
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#c40000] hover:bg-[#950000] text-white text-sm font-semibold px-4 py-2.5 shadow-btn disabled:opacity-50 transition-colors'
export const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 disabled:opacity-50 transition-colors'
