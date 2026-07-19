function getTier(score: number) {
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

const TIER_STYLES = {
  high: 'bg-gradient-to-b from-[#ecfdf5] to-white border-[#86efac] text-[#15803d]',
  medium: 'bg-gradient-to-b from-[#fffbeb] to-white border-[#fcd34d] text-[#b45309]',
  low: 'bg-gradient-to-b from-[#fef2f2] to-white border-[#fca5a5] text-[#b91c1c]',
}

export function ScoreBox({ score }: { score: number }) {
  const tier = getTier(score)
  return (
    <div className={`rounded-2xl border p-4 text-center shadow-[0_8px_20px_rgba(17,24,39,0.05)] ${TIER_STYLES[tier]}`}>
      <div className="text-2xl font-extrabold">{score}%</div>
      <div className="text-xs font-medium mt-1 opacity-70">Match Score</div>
    </div>
  )
}
