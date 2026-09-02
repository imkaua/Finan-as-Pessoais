import { useState } from 'react'
import { OverviewSection } from './components/OverviewSection'
import { BudgetSection } from './components/BudgetSection'
import { EmergencyFundSection } from './components/EmergencyFundSection'
import { BigExpensesSection } from './components/BigExpensesSection'
import type { MonthKey } from './types'
import { useStore } from './store'

type Tab = 'overview' | 'budget' | 'fund' | 'expenses'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'budget', label: 'Orçamento mensal' },
  { key: 'fund', label: 'Reserva de emergência' },
  { key: 'expenses', label: 'Grandes gastos' },
]

function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState<MonthKey>('2026-09')
  const resetAll = useStore((s) => s.resetAll)

  return (
    <div className="min-h-screen">
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold">Minhas Finanças</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Orçamento pessoal · Setembro a Dezembro de 2026
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('Isso vai apagar todos os dados salvos neste navegador. Continuar?')) resetAll()
            }}
            className="text-xs cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            Limpar dados
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.key === tab
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px cursor-pointer transition-colors"
                style={{
                  borderColor: active ? 'var(--series-1)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'overview' && <OverviewSection month={month} />}
        {tab === 'budget' && <BudgetSection month={month} onMonth={setMonth} />}
        {tab === 'fund' && <EmergencyFundSection />}
        {tab === 'expenses' && <BigExpensesSection />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
        Os dados ficam salvos apenas neste navegador (localStorage).
      </footer>
    </div>
  )
}

export default App
