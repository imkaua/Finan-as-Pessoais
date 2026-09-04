import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { MONTHS, type MonthKey } from '../types'
import { MonthTabs } from './MonthTabs'
import { Card, StatTile } from './Card'
import { NumberInput } from './NumberInput'
import { formatBRL, formatBRLPrecise, formatPct } from '../lib/format'
import { seriesVar } from '../lib/colors'

export function BudgetSection({ month, onMonth }: { month: MonthKey; onMonth: (m: MonthKey) => void }) {
  const categories = useStore((s) => s.categories)
  const incomeSources = useStore((s) => s.incomeSources)
  const monthData = useStore((s) => s.months[month])
  const setIncomeAmount = useStore((s) => s.setIncomeAmount)
  const addIncomeSource = useStore((s) => s.addIncomeSource)
  const removeIncomeSource = useStore((s) => s.removeIncomeSource)
  const setPlanned = useStore((s) => s.setPlanned)
  const setActual = useStore((s) => s.setActual)
  const addCategory = useStore((s) => s.addCategory)
  const removeCategory = useStore((s) => s.removeCategory)
  const [newCategory, setNewCategory] = useState('')
  const [newIncomeSource, setNewIncomeSource] = useState('')

  const monthLabel = MONTHS.find((m) => m.key === month)?.label ?? ''

  const totals = useMemo(() => {
    const income = incomeSources.reduce((sum, src) => sum + (monthData.income[src.id] || 0), 0)
    const planned = categories.reduce((sum, c) => sum + (monthData.planned[c.id] || 0), 0)
    const actual = categories.reduce((sum, c) => sum + (monthData.actual[c.id] || 0), 0)
    return {
      income,
      planned,
      actual,
      balancePlanned: income - planned,
      balanceActual: income - actual,
    }
  }, [categories, incomeSources, monthData])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Orçamento mensal</h2>
        <MonthTabs value={month} onChange={onMonth} />
      </div>

      <Card title={`Receita em ${monthLabel}`} subtitle="Detalhe quanto espera receber de cada fonte">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase tracking-wide">
                <th className="font-medium px-2 pb-2">Fonte</th>
                <th className="font-medium px-2 pb-2 w-40">Valor</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {incomeSources.map((src) => {
                const value = monthData.income[src.id] || 0
                return (
                  <tr key={src.id} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: seriesVar(src.colorSlot) }}
                        />
                        {src.name}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumberInput value={value} onChange={(v) => setIncomeAmount(month, src.id, v)} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => removeIncomeSource(src.id)}
                        title="Remover fonte de receita"
                        className="cursor-pointer text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t font-semibold" style={{ borderColor: 'var(--baseline)' }}>
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 tabular-nums">{formatBRLPrecise(totals.income)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <form
          className="flex gap-2 mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newIncomeSource.trim()) return
            addIncomeSource(newIncomeSource.trim())
            setNewIncomeSource('')
          }}
        >
          <input
            value={newIncomeSource}
            onChange={(e) => setNewIncomeSource(e.target.value)}
            placeholder="Nova fonte de receita (ex: Bônus)"
            className="flex-1 rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer text-white"
            style={{ background: 'var(--series-1)' }}
          >
            Adicionar
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Renda do mês" value={formatBRL(totals.income)} />
        <StatTile label="Planejado por categoria" value={formatBRL(totals.planned)} />
        <StatTile
          label="Saldo previsto"
          value={formatBRL(totals.balancePlanned)}
          tone={totals.balancePlanned >= 0 ? 'good' : 'critical'}
          hint={totals.balancePlanned >= 0 ? 'sobra estimada' : 'orçamento estourado'}
        />
      </div>

      <Card title="Gasto por área" subtitle="Defina o planejado e, quando souber, o realizado de cada categoria">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase tracking-wide">
                <th className="font-medium px-2 pb-2">Categoria</th>
                <th className="font-medium px-2 pb-2 w-40">Planejado</th>
                <th className="font-medium px-2 pb-2 w-40">Realizado</th>
                <th className="font-medium px-2 pb-2 w-28">% da renda</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const planned = monthData.planned[c.id] || 0
                const actual = monthData.actual[c.id] || 0
                const pct = totals.income > 0 ? planned / totals.income : 0
                return (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: seriesVar(c.colorSlot) }}
                        />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumberInput value={planned} onChange={(v) => setPlanned(month, c.id, v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumberInput value={actual} onChange={(v) => setActual(month, c.id, v)} />
                    </td>
                    <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {formatPct(pct)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => removeCategory(c.id)}
                        title="Remover categoria"
                        className="cursor-pointer text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t font-semibold" style={{ borderColor: 'var(--baseline)' }}>
                <td className="px-2 py-2">Total</td>
                <td className="px-2 py-2 tabular-nums">{formatBRLPrecise(totals.planned)}</td>
                <td className="px-2 py-2 tabular-nums">{formatBRLPrecise(totals.actual)}</td>
                <td className="px-2 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatPct(totals.income > 0 ? totals.planned / totals.income : 0)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <form
          className="flex gap-2 mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newCategory.trim()) return
            addCategory(newCategory.trim())
            setNewCategory('')
          }}
        >
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria (ex: Pets)"
            className="flex-1 rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer text-white"
            style={{ background: 'var(--series-1)' }}
          >
            Adicionar
          </button>
        </form>
      </Card>
    </div>
  )
}
