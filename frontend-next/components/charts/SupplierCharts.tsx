'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { Supplier } from '@/lib/types'

const PLATFORM_COLORS: Record<string, string> = {
  Alibaba: '#c40000',
  AliExpress: '#111827',
}

const RISK_COLORS: Record<string, string> = {
  'Low Risk': '#15803d',
  'Medium Risk': '#b45309',
  'High Risk': '#b91c1c',
}

interface Props {
  suppliers: Supplier[]
}

export function PriceBarChart({ suppliers }: Props) {
  const data = suppliers.map(s => ({ name: s.name.split(' ')[0], price: s.unit_price, platform: s.platform }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`$${v}`, 'Price']} />
        <Bar dataKey="price" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={PLATFORM_COLORS[entry.platform] ?? '#c40000'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreBarChart({ suppliers }: Props) {
  const data = suppliers.map(s => ({ name: s.name.split(' ')[0], score: s.aimoro_score, risk: s.risk_level }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={RISK_COLORS[entry.risk] ?? '#c40000'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PlatformPieChart({ suppliers }: Props) {
  const counts: Record<string, number> = {}
  suppliers.forEach(s => { counts[s.platform] = (counts[s.platform] ?? 0) + 1 })
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
          {data.map((entry, i) => (
            <Cell key={i} fill={PLATFORM_COLORS[entry.name] ?? '#888'} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function RiskBarChart({ suppliers }: Props) {
  const counts: Record<string, number> = { 'Low Risk': 0, 'Medium Risk': 0, 'High Risk': 0 }
  suppliers.forEach(s => { counts[s.risk_level] = (counts[s.risk_level] ?? 0) + 1 })
  const data = Object.entries(counts).map(([risk, count]) => ({ risk, count }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis dataKey="risk" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={RISK_COLORS[entry.risk] ?? '#888'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
