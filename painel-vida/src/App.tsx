import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { firestoreBackend, localBackend, signInGoogle, signOutGoogle, watchUser } from './data/backend'
import { DataProvider, useData } from './data/DataContext'
import { daysBetween, toISO } from './lib/dates'
import { lastExport } from './lib/backup'
import { Button, Card } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TodayView } from './views/TodayView'
import { WeekView } from './views/WeekView'
import { FinanceView } from './views/FinanceView'
import { AdvisoryView } from './views/AdvisoryView'
import { HealthView } from './views/HealthView'
import { StudiesView } from './views/StudiesView'
import { SettingsView } from './views/SettingsView'

const DEMO = new URLSearchParams(location.search).has('demo')

type Tab = 'hoje' | 'semana' | 'financas' | 'assessoria' | 'saude' | 'estudos' | 'ajustes'
const TABS: { key: Tab; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'financas', label: 'Finanças' },
  { key: 'assessoria', label: 'Assessoria' },
  { key: 'saude', label: 'Saúde' },
  { key: 'estudos', label: 'Estudos' },
  { key: 'ajustes', label: 'Ajustes' },
]

const AUTH_ERRORS: Record<string, string> = {
  'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase. Veja o passo 2 de docs/configuracao.md.',
  'auth/operation-not-allowed': 'O login com Google ainda não foi ativado no Firebase. Veja o passo 1 de docs/configuracao.md.',
  'auth/popup-closed-by-user': 'A janela de login foi fechada antes de terminar.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
}

export default function App() {
  if (DEMO) return <DemoApp />
  return <AuthedApp />
}

function DemoApp() {
  const backend = useMemo(() => localBackend(), [])
  return (
    <DataProvider backend={backend}>
      <Shell userLabel="Modo demonstração — dados só neste navegador" demo />
    </DataProvider>
  )
}

function AuthedApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => watchUser(setUser), [])
  const backend = useMemo(() => (user ? firestoreBackend(user.uid) : null), [user])

  if (user === undefined) return <Centered>Carregando…</Centered>
  if (!user || !backend) {
    return (
      <Centered>
        <Card className="max-w-sm w-full">
          <h1 className="text-lg font-semibold">Painel de Vida</h1>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
            Finanças, assessoria, treinos, consultas e estudos em um lugar. Seus dados ficam presos à sua conta Google — ninguém
            mais tem acesso.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              setError(null)
              signInGoogle().catch((e: { code?: string }) => setError(AUTH_ERRORS[e.code ?? ''] ?? `Não foi possível entrar (${e.code ?? 'erro'}).`))
            }}
          >
            Entrar com Google
          </Button>
          {error && (
            <p className="text-sm mt-3" style={{ color: 'var(--status-critical)' }}>
              {error}
            </p>
          )}
        </Card>
      </Centered>
    )
  }
  return (
    <DataProvider key={user.uid} backend={backend}>
      <Shell userLabel={user.email ?? user.displayName ?? 'Conta Google'} onSignOut={() => signOutGoogle()} />
    </DataProvider>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Shell({ userLabel, onSignOut, demo }: { userLabel: string; onSignOut?: () => void; demo?: boolean }) {
  const { today, ready, error, data } = useData()
  const [tab, setTab] = useState<Tab>('hoje')
  const [date, setDate] = useState(today)
  const online = useOnline()
  // Se o dia virar com o app aberto na aba Hoje, acompanha o novo dia.
  const [lastToday, setLastToday] = useState(today)
  if (lastToday !== today) {
    setLastToday(today)
    if (date === lastToday) setDate(today)
  }

  const exported = lastExport()
  const hasData = data.days.length + data.expenses.length + data.workouts.length > 10
  const backupDue = hasData && (!exported || daysBetween(exported, toISO(new Date())) > 30)

  return (
    <div className="min-h-screen">
      <header className="border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-3 flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold">Painel de Vida</h1>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: demo ? 'var(--status-warning)' : online ? 'var(--status-good)' : 'var(--status-warning)' }} />
            {demo ? 'Demonstração' : online ? 'Sincronizado' : 'Offline — salva quando voltar'}
          </span>
        </div>
        <nav className="max-w-3xl mx-auto px-2 flex gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => {
            const active = t.key === tab
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px cursor-pointer"
                style={{ borderColor: active ? 'var(--series-1)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {error && (
          <Card>
            <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
              {error}
            </p>
          </Card>
        )}
        {backupDue && tab !== 'ajustes' && (
          <Card>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm">
                {exported ? `Último backup em ${exported.split('-').reverse().join('/')}.` : 'Você ainda não fez nenhum backup.'} Leva 10 segundos.
              </p>
              <Button variant="secondary" onClick={() => setTab('ajustes')}>
                Fazer backup
              </Button>
            </div>
          </Card>
        )}
        {!ready ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Carregando seus dados…
          </p>
        ) : (
          <ErrorBoundary resetKey={tab}>
            {tab === 'hoje' && <TodayView date={date > today ? today : date} onDate={setDate} />}
            {tab === 'semana' && <WeekView />}
            {tab === 'financas' && <FinanceView />}
            {tab === 'assessoria' && <AdvisoryView />}
            {tab === 'saude' && <HealthView />}
            {tab === 'estudos' && <StudiesView />}
            {tab === 'ajustes' && <SettingsView userLabel={userLabel} onSignOut={onSignOut} />}
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}
