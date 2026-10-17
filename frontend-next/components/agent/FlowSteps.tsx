'use client'

import type { ProductRequest } from '@/lib/agent'

const AFTER_PAYMENT = ['paid', 'ordered', 'shipped', 'delivered']

/** The order journey, in AIMORO's order of steps. Each step is done / current / to do. */
export function flowSteps(req: ProductRequest, listingCount?: number) {
  const s = req.status
  const paid = req.invoice?.status === 'paid' || AFTER_PAYMENT.includes(s)
  const done = [
    true,                                                                     // request received
    (listingCount ?? 0) > 0 || s !== 'received',                              // items found
    req.options.length > 0 || paid,                                           // preview report sent
    req.report_unlocked || paid,                                              // report fee paid -> full report
    !!req.invoice || paid,                                                    // option chosen, invoice sent
    paid,                                                                     // order paid
    ['ordered', 'shipped', 'delivered'].includes(s),                          // ordered
    req.warehouse_photos.length > 0 || ['shipped', 'delivered'].includes(s),  // quality check
    ['shipped', 'delivered'].includes(s),                                     // shipped
    s === 'delivered',                                                        // delivered
  ]
  const fee = `$${Math.round(req.report_fee_bsd)}`
  const labels = [
    'Request received', 'Items found', 'Preview report', `Report fee (${fee}) · full report`,
    'Option chosen · invoice', 'Payment', 'Ordered', 'Quality check', 'Shipped', 'Delivered',
  ]
  const current = done.findIndex(d => !d)
  return labels.map((label, i) => ({ label, done: done[i], current: i === current }))
}

export function FlowSteps({ req, listingCount }: { req: ProductRequest; listingCount?: number }) {
  if (req.status === 'cancelled') return null
  const steps = flowSteps(req, listingCount)
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2 text-[11px] font-semibold" aria-label="Order progress">
      {steps.map((st, i) => (
        <li key={st.label} className="flex items-center gap-1">
          <span aria-current={st.current ? 'step' : undefined}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${st.done
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : st.current ? 'border-[#c40000] bg-[#c40000] text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
            {st.done ? '✓' : i + 1} {st.label}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  )
}
