interface MetricCardProps {
  label: string
  value: string | number | null | undefined
  icon?: React.ReactNode
  accent?: string
}

export function MetricCard({ label, value, icon, accent = '#c40000' }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-extrabold text-[#0f172a]">{value ?? '—'}</p>
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
