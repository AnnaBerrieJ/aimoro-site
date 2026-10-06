'use client'

import { SHIPMENT_FLOW, SHIPMENT_LABELS, dateTime, type ShipmentStatus } from '@/lib/agent'

export interface TimelineItem { kind: string; message: string; created_at: string; customer_visible?: boolean }

/** Newest-first list of events. `action` renders extra controls per item (e.g. WhatsApp share). */
export function Timeline({ items, action }: { items: TimelineItem[]; action?: (item: TimelineItem) => React.ReactNode }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">No updates yet.</p>
  return (
    <ol className="relative border-l border-slate-200 ml-1.5 space-y-4">
      {items.map((e, i) => (
        <li key={`${e.created_at}-${i}`} className="pl-4 relative">
          <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-[#c40000]' : 'bg-slate-300'}`} />
          <p className="text-sm text-slate-800">
            {e.customer_visible === false && <span className="mr-1.5 text-[10px] font-bold uppercase text-slate-400">Private</span>}
            {e.message}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">{dateTime(e.created_at)}</p>
            {action?.(e)}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ShipmentSteps({ status }: { status: ShipmentStatus }) {
  const cur = SHIPMENT_FLOW.indexOf(status)
  return (
    <ol className="grid grid-cols-3 gap-1 text-[10px] sm:text-[11px] font-semibold text-center">
      {SHIPMENT_FLOW.map((s, i) => (
        <li key={s}>
          <div className={`h-1.5 rounded-full mb-1 ${i <= cur ? 'bg-[#c40000]' : 'bg-slate-200'}`} />
          <span className={i <= cur ? 'text-slate-800' : 'text-slate-400'}>{SHIPMENT_LABELS[s]}</span>
        </li>
      ))}
    </ol>
  )
}
