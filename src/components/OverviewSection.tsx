import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store'
import { MONTHS, type MonthKey } from '../types'
import { Card, StatTile } from './Card'
import { formatBRL, formatBRLPrecise } from '../lib/format'
import { seriesVar } from '../lib/colors'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    >
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span style={{ color: 'var(--text-primary)' }}>{formatBRLPrecise(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function OverviewSection({ month }: { month: MonthKey }) {
  const categories = useStore((s) => s.categories)
  const incomeSources = useStore((s) => s.incomeSources)
  const months = useStore((s) => s.months)
  const fund = useStore((s) => s.emergencyFund)

  const monthChartData = useMemo(
    () =>
      MONTHS.map((m) => {
        const data = months[m.key]
        const income = incomeSources.reduce((sum, src) => sum + (data.income[src.id] || 0), 0)
        const planned = categories.reduce((sum, c) => sum + (data.planned[c.id] || 0), 0)
        return { month: m.short, Renda: income, Planejado: planned }
      }),
    [months, categories, incomeSources],
  )

  const pieData = useMemo(() => {
    const data = months[month]
    return categories
      .map((c) => ({ name: c.name, value: data.planned[c.id] || 0, colorSlot: c.colorSlot }))
      .filter((d) => d.value > 0)
  }, [months, month, categories])

  const totals = useMemo(() => {
    let income = 0
    let planned = 0
    for (const m of MONTHS) {
      const data = months[m.key]
      income += incomeSources.reduce((sum, src) => sum + (data.income[src.id] || 0), 0)
      planned += categories.reduce((sum, c) => sum + (data.planned[c.id] || 0), 0)
    }
    return { income, planned }
  }, [months, categories, incomeSources])

  const fundBalance = useMemo(() => {
    let balance = fund.startingBalance
    for (const m of MONTHS) balance += fund.contributions[m.key] || 0
    return balance
  }, [fund])

  const monthLabel = MONTHS.find((m) => m.key === month)?.label ?? ''

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Visão geral · Set–Dez 2026</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Renda total no período" value={formatBRL(totals.income)} />
        <StatTile label="Planejado total no período" value={formatBRL(totals.planned)} />
        <StatTile
          label="Saldo previsto no período"
          value={formatBRL(totals.income - totals.planned)}
          tone={totals.income - totals.planned >= 0 ? 'good' : 'critical'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card title="Renda vs. planejado por mês" subtitle="Setembro a dezembro de 2026" className="lg:col-span-3">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthChartData} barGap={4} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke="var(--gridline)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--baseline)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => formatBRL(v)}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="Renda" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Planejado" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={`Gastos por área · ${monthLabel}`} subtitle="Distribuição do planejado no mês" className="lg:col-span-2">
          {pieData.length === 0 ? (
            <p className="text-sm py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              Nenhum valor planejado ainda para {monthLabel}.
            </p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={seriesVar(d.colorSlot)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <StatTile
        label="Reserva de emergência (saldo projetado ao fim do período)"
        value={formatBRL(fundBalance)}
        hint={fund.goal > 0 ? `Meta: ${formatBRL(fund.goal)}` : undefined}
      />
    </div>
  )
}
