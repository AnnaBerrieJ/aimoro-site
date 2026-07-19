'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { Supplier } from '@/lib/types'

const PLATFORM_COLORS: Record<string, string> = {
  Alibaba: '#c40000',
  AliExpress: '#0f172a',
}

const RISK_COLORS: Record<string, string> = {
  'Low Risk': '#15803d',
  'Medium Risk': '#b45309',
  'High Risk': '#b91c1c',
}

interface Props {
  suppliers: Supplier[]
}

const tickStyle = { fontSize: 11, fill: '#94a3b8' }

export function PriceBarChart({ suppliers }: Props) {
  const data = suppliers.map(s => ({
    name: s.name.split(' ').slice(0, 2).join(' '),
    price: s.unit_price,
    platform: s.platform,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
        <XAxis dataKey="name" tick={tickStyle} angle={-40} textAnchor="end" interval={0} />
        <YAxis tick={tickStyle} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
          formatter={(v: number) => [`$${v}`, 'Price']}
        />
        <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={i} fill={PLATFORM_COLORS[entry.platform] ?? '#c40000'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreBarChart({ suppliers }: Props) {
  const data = suppliers.map(s => ({
    name: s.name.split(' ').slice(0, 2).join(' '),
    score: s.aimoro_score,
    risk: s.risk_level,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
        <XAxis dataKey="name" tick={tickStyle} angle={-40} textAnchor="end" interval={0} />
        <YAxis domain={[0, 100]} tick={tickStyle} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
          formatter={(v: number) => [`${v}%`, 'Score']}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={40}>
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
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={PLATFORM_COLORS[entry.name] ?? '#888'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
          formatter={(v: number, name: string) => [`${v} (${((v/total)*100).toFixed(0)}%)`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
        />
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
        <XAxis dataKey="risk" tick={tickStyle} />
        <YAxis allowDecimals={false} tick={tickStyle} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((entry, i) => (
            <Cell key={i} fill={RISK_COLORS[entry.risk] ?? '#888'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
