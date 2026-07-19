interface MetricCardProps {
  label: string
  value: string | number | null | undefined
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden bg-white rounded-[18px] border border-[#f1d0d0] p-5 shadow-[0_10px_24px_rgba(17,24,39,0.05)]">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#c40000] via-[#ff5a5a] to-[#c40000]" />
      <p className="text-sm font-medium text-gray-500 mt-1 leading-snug">{label}</p>
      <p className="text-2xl font-extrabold text-[#111827] mt-1">
        {value ?? '—'}
      </p>
    </div>
  )
}
