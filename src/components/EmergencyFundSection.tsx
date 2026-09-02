import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store'
import { MONTHS } from '../types'
import { Card, StatTile } from './Card'
import { NumberInput } from './NumberInput'
import { formatBRL, formatBRLPrecise, formatPct } from '../lib/format'

function FundTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value = payload[0].value as number
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    >
      <p className="font-medium mb-1">{label}</p>
      <p style={{ color: 'var(--series-1)' }}>
        Saldo: <span style={{ color: 'var(--text-primary)' }}>{formatBRLPrecise(value)}</span>
      </p>
    </div>
  )
}

export function EmergencyFundSection() {
  const fund = useStore((s) => s.emergencyFund)
  const categories = useStore((s) => s.categories)
  const months = useStore((s) => s.months)
  const setGoal = useStore((s) => s.setEmergencyGoal)
  const setStarting = useStore((s) => s.setEmergencyStarting)
  const setContribution = useStore((s) => s.setEmergencyContribution)

  const chartData = useMemo(() => {
    let balance = fund.startingBalance
    const points = [{ label: 'Início', balance }]
    for (const m of MONTHS) {
      balance += fund.contributions[m.key] || 0
      points.push({ label: m.short, balance })
    }
    return points
  }, [fund])

  const currentBalance = chartData[chartData.length - 1].balance
  const progress = fund.goal > 0 ? Math.min(currentBalance / fund.goal, 1) : 0

  const avgMonthlyPlanned = useMemo(() => {
    const totalPlanned = MONTHS.reduce(
      (sum, m) => sum + categories.reduce((s, c) => s + (months[m.key].planned[c.id] || 0), 0),
      0,
    )
    return totalPlanned / MONTHS.length
  }, [months, categories])

  const monthsCovered = avgMonthlyPlanned > 0 ? currentBalance / avgMonthlyPlanned : 0

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Reserva de emergência</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Saldo inicial" subtitle="Quanto você já tem guardado hoje">
          <div className="max-w-xs">
            <NumberInput value={fund.startingBalance} onChange={setStarting} />
          </div>
        </Card>
        <Card title="Meta da reserva" subtitle="Ex.: 6 meses de gastos essenciais">
          <div className="max-w-xs">
            <NumberInput value={fund.goal} onChange={setGoal} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Saldo atual projetado" value={formatBRL(currentBalance)} tone="good" />
        <StatTile
          label="% da meta atingida"
          value={fund.goal > 0 ? formatPct(progress) : '—'}
          hint={fund.goal > 0 ? `faltam ${formatBRL(Math.max(fund.goal - currentBalance, 0))}` : 'defina uma meta'}
        />
        <StatTile
          label="Meses de gastos cobertos"
          value={avgMonthlyPlanned > 0 ? `${monthsCovered.toFixed(1)}x` : '—'}
          hint="com base no gasto planejado médio"
        />
      </div>

      {fund.goal > 0 && (
        <Card>
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            <span>Progresso até a meta</span>
            <span className="tabular-nums">{formatPct(progress)}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, background: 'var(--series-1)' }}
            />
          </div>
        </Card>
      )}

      <Card title="Evolução da reserva" subtitle="Saldo acumulado de setembro a dezembro de 2026">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="fundFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="label"
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
              <Tooltip content={<FundTooltip />} />
              {fund.goal > 0 && (
                <ReferenceLine
                  y={fund.goal}
                  stroke="var(--status-good)"
                  strokeDasharray="4 4"
                  label={{ value: 'Meta', position: 'insideTopRight', fill: 'var(--status-good)', fontSize: 11 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="url(#fundFill)"
                dot={{ r: 4, fill: 'var(--series-1)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Aportes mensais" subtitle="Quanto pretende guardar (ou retirar, com valor negativo) a cada mês">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MONTHS.map((m) => (
            <div key={m.key}>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                {m.label}
              </label>
              <NumberInput
                value={fund.contributions[m.key] || 0}
                onChange={(v) => setContribution(m.key, v)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
