import { useState } from 'react'
import { useStore } from '../store'
import { Card } from './Card'
import { NumberInput } from './NumberInput'
import { formatBRL, formatDate } from '../lib/format'

const TODAY = new Date('2026-09-02T00:00:00')

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const target = new Date(`${iso}T00:00:00`)
  return Math.ceil((target.getTime() - TODAY.getTime()) / 86_400_000)
}

export function BigExpensesSection() {
  const expenses = useStore((s) => s.bigExpenses)
  const addExpense = useStore((s) => s.addBigExpense)
  const updateExpense = useStore((s) => s.updateBigExpense)
  const removeExpense = useStore((s) => s.removeBigExpense)

  const [form, setForm] = useState({ name: '', totalAmount: 0, savedSoFar: 0, targetDate: '', notes: '' })

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Grandes gastos planejados</h2>
      <p className="text-sm -mt-3" style={{ color: 'var(--text-secondary)' }}>
        Metas maiores fora do orçamento do dia a dia, como uma viagem, um curso ou uma troca de equipamento.
      </p>

      <Card title="Nova meta">
        <form
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim() || form.totalAmount <= 0) return
            addExpense(form)
            setForm({ name: '', totalAmount: 0, savedSoFar: 0, targetDate: '', notes: '' })
          }}
        >
          <div className="lg:col-span-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Nome
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Viagem para o Chile"
              className="w-full rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Valor total
            </label>
            <NumberInput value={form.totalAmount} onChange={(v) => setForm((f) => ({ ...f, totalAmount: v }))} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Já guardado
            </label>
            <NumberInput value={form.savedSoFar} onChange={(v) => setForm((f) => ({ ...f, savedSoFar: v }))} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Data alvo
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="w-full rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="lg:col-span-5">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer text-white"
              style={{ background: 'var(--series-1)' }}
            >
              Adicionar meta
            </button>
          </div>
        </form>
      </Card>

      {expenses.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            Nenhuma meta cadastrada ainda.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenses.map((exp) => {
            const progress = exp.totalAmount > 0 ? Math.min(exp.savedSoFar / exp.totalAmount, 1) : 0
            const remaining = Math.max(exp.totalAmount - exp.savedSoFar, 0)
            const days = daysUntil(exp.targetDate)
            const barColor =
              progress >= 1 ? 'var(--status-good)' : progress >= 0.5 ? 'var(--series-1)' : 'var(--status-warning)'
            return (
              <Card key={exp.id}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{exp.name}</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Meta para {formatDate(exp.targetDate)}
                      {days !== null && days >= 0 ? ` · faltam ${days} dias` : ''}
                      {days !== null && days < 0 ? ' · data já passou' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExpense(exp.id)}
                    className="text-xs cursor-pointer shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="tabular-nums">{formatBRL(exp.savedSoFar)} guardados</span>
                  <span className="tabular-nums">{formatBRL(exp.totalAmount)}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress * 100}%`, background: barColor }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {remaining > 0 ? `faltam ${formatBRL(remaining)}` : 'meta concluída'}
                  </span>
                  <div className="w-32">
                    <NumberInput
                      value={exp.savedSoFar}
                      onChange={(v) => updateExpense(exp.id, { savedSoFar: v })}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
