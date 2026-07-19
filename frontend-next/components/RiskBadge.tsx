const STYLES: Record<string, string> = {
  'Low Risk': 'bg-green-100 text-green-700',
  'Medium Risk': 'bg-amber-100 text-amber-700',
  'High Risk': 'bg-red-100 text-red-700',
}

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STYLES[risk] ?? 'bg-gray-100 text-gray-600'}`}>
      {risk}
    </span>
  )
}
