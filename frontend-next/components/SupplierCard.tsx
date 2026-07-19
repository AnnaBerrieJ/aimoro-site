import type { Supplier } from '@/lib/types'
import { RiskBadge } from './RiskBadge'
import { ScoreBox } from './ScoreBox'

interface SupplierCardProps {
  supplier: Supplier
  isFirst?: boolean
  onSave: (supplier: Supplier) => void
  saving?: boolean
}

export function SupplierCard({ supplier, isFirst, onSave, saving }: SupplierCardProps) {
  return (
    <div className="relative overflow-hidden bg-white rounded-[18px] border border-[#e5e7eb] shadow-[0_10px_28px_rgba(17,24,39,0.05)] mb-4 transition-all hover:shadow-[0_16px_36px_rgba(17,24,39,0.09)] hover:-translate-y-0.5">
      {/* Red top bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c40000] via-[#ff5a5a] to-[#c40000]" />

      <div className="p-5 pt-6">
        {isFirst && (
          <span className="inline-block mb-3 bg-gradient-to-r from-[#c40000] to-[#950000] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_6px_16px_rgba(196,0,0,0.28)]">
            Best Match
          </span>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr_1.2fr_1.5fr] gap-4 items-start">
          {/* Identity */}
          <div>
            <span className="inline-block bg-[#fff1f1] text-[#c40000] text-xs font-bold px-3 py-1 rounded-full border border-[#c40000]/10 mb-2">
              {supplier.platform}
            </span>
            <h3 className="font-extrabold text-[#111827] text-base leading-tight">{supplier.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{supplier.country} · {supplier.product}</p>
          </div>

          {/* Stats */}
          <div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { value: `$${supplier.unit_price}`, label: 'Unit Price' },
                { value: supplier.minimum_order_quantity, label: 'MOQ' },
                { value: supplier.rating, label: 'Rating' },
                { value: `${supplier.delivery_days}d`, label: 'Delivery' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-bold text-[#111827] text-sm">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-600">Risk:</span>
              <RiskBadge risk={supplier.risk_level} />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
              {supplier.recommendation}
            </div>
          </div>

          {/* Score */}
          <ScoreBox score={supplier.aimoro_score} />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onSave(supplier)}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#c40000] to-[#950000] text-white text-sm font-bold py-2 px-4 rounded-xl shadow-[0_8px_20px_rgba(196,0,0,0.22)] hover:shadow-[0_10px_24px_rgba(196,0,0,0.3)] hover:-translate-y-px transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <a
              href={supplier.supplier_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center text-sm font-semibold text-[#c40000] border border-[#c40000]/30 py-2 px-4 rounded-xl hover:bg-[#fff1f1] transition-colors"
            >
              View on {supplier.platform}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
