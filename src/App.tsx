import { useState } from 'react'
import { OverviewSection } from './components/OverviewSection'
import { BudgetSection } from './components/BudgetSection'
import { EmergencyFundSection } from './components/EmergencyFundSection'
import { BigExpensesSection } from './components/BigExpensesSection'
import { SyncSection } from './components/SyncSection'
import type { MonthKey } from './types'
import { useStore } from './store'
import { useCloudSync } from './hooks/useCloudSync'

type Tab = 'overview' | 'budget' | 'fund' | 'expenses' | 'sync'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'budget', label: 'Orçamento mensal' },
  { key: 'fund', label: 'Reserva de emergência' },
  { key: 'expenses', label: 'Grandes gastos' },
  { key: 'sync', label: 'Sincronização' },
]

const SYNC_DOT_COLOR: Record<string, string> = {
  off: 'var(--text-muted)',
  connecting: 'var(--status-warning)',
  synced: 'var(--success-text)',
  error: 'var(--status-critical)',
}

function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState<MonthKey>('2026-09')
  const resetAll = useStore((s) => s.resetAll)
  const sync = useCloudSync()

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTab('sync')}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              title="Sincronização entre aparelhos"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SYNC_DOT_COLOR[sync.status] }} />
              {sync.code ? 'Sincronizado' : 'Não sincronizado'}
            </button>
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
        {tab === 'sync' && <SyncSection sync={sync} />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
        Os dados ficam salvos neste navegador
        {sync.code ? ' e sincronizados com a nuvem' : ' (localStorage)'}.
      </footer>
    </div>
  )
}

export default App
