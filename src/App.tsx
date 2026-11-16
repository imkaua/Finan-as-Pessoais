import { useEffect, useMemo, useState } from 'react'
import { AppContext, useToday, type View } from './context'
import { ModalProvider } from './components/ui/Modal'
import { Icon } from './components/ui/Icon'
import { SYNC_COLOR, SYNC_LABEL, useCloudSync } from './hooks/useCloudSync'
import { addM, ymLabel } from './lib/dates'
import { Geral } from './views/Geral'
import { Pagamentos } from './views/Pagamentos'
import { Fixos } from './views/Fixos'
import { Variaveis } from './views/Variaveis'
import { Assinaturas } from './views/Assinaturas'
import { Objetivos } from './views/Objetivos'
import { Dados } from './views/Dados'

const NAV: { key: View; label: string; icon: string; sub: string }[] = [
  { key: 'geral', label: 'Visão geral', icon: 'grid', sub: 'Resumo do mês: renda, compromissos e o que sobra' },
  { key: 'pagamentos', label: 'Pagamentos', icon: 'receipt', sub: 'Faturas, boletos e Pix do mês num só checklist' },
  { key: 'fixos', label: 'Gastos fixos', icon: 'home', sub: 'Contas recorrentes que entram todo mês' },
  { key: 'variaveis', label: 'Gastos variáveis', icon: 'cart', sub: 'Limites por categoria e acompanhamento do que já foi gasto' },
  { key: 'assinaturas', label: 'Assinaturas', icon: 'repeat', sub: 'Serviços recorrentes e até quando cada um vai' },
  { key: 'objetivos', label: 'Objetivos', icon: 'target', sub: 'Metas, quanto já foi guardado e o aporte mensal necessário' },
]
const DADOS = { key: 'dados' as View, label: 'Dados e sincronização', icon: 'cloud', sub: 'Backup, sincronização entre aparelhos e limpeza' }
const VIEWS: View[] = [...NAV.map((n) => n.key), 'dados']

const viewFromHash = (): View => {
  const h = window.location.hash.slice(1) as View
  return VIEWS.includes(h) ? h : 'geral'
}

function App() {
  const today = useToday()
  const cur = today.slice(0, 7)
  const [ym, setYm] = useState(cur)
  const [view, setView] = useState<View>(viewFromHash)
  const sync = useCloudSync()

  useEffect(() => {
    const on = () => setView(viewFromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const ctx = useMemo(
    () => ({
      ym,
      setYm,
      today,
      cur,
      view,
      go: (v: View) => {
        window.location.hash = v
        setView(v)
        window.scrollTo(0, 0)
      },
    }),
    [ym, today, cur, view],
  )

  const nav = view === 'dados' ? DADOS : NAV.find((n) => n.key === view)!
  const mensal = view !== 'objetivos' && view !== 'dados'
  const tag = ym === cur ? 'MÊS ATUAL' : ym > cur ? 'PLANEJAMENTO' : 'HISTÓRICO'

  return (
    <AppContext.Provider value={ctx}>
      <ModalProvider>
        <div className="app">
          <aside className="side">
            <div className="brand">
              <span className="logo">
                <Icon name="wallet" size={18} stroke={2} />
              </span>
              Minhas Finanças
            </div>
            <nav className="nav" aria-label="Áreas">
              {NAV.map((n) => (
                <button key={n.key} className={view === n.key ? 'on' : ''} aria-current={view === n.key ? 'page' : undefined} onClick={() => ctx.go(n.key)}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
            <div className="side-foot nav">
              <button className={view === 'dados' ? 'on' : ''} onClick={() => ctx.go('dados')} title={SYNC_LABEL[sync.status]} aria-label="Dados e sincronização">
                <Icon name="cloud" />
                <span className="flex items-center gap-2">
                  Dados e sincronização
                  <i className="sync-dot" style={{ background: SYNC_COLOR[sync.status] }} />
                </span>
              </button>
              <small>{sync.status === 'synced' ? 'Salvo neste navegador e na nuvem' : 'Salvo neste navegador'}</small>
            </div>
          </aside>
          <main className="content">
            <header className="top">
              <div>
                <h1>{nav.label}</h1>
                <p>{nav.sub}</p>
              </div>
              {mensal && (
                <div className="monthsw">
                  <button className="iconbtn" aria-label="Mês anterior" onClick={() => setYm(addM(ym, -1))}>
                    <Icon name="left" />
                  </button>
                  <button
                    className="lbl"
                    style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 700 }}
                    onClick={() => setYm(cur)}
                    title={ym === cur ? undefined : 'Voltar ao mês atual'}
                    aria-live="polite"
                  >
                    <span className="tag">{tag}</span>
                    {ymLabel(ym)}
                  </button>
                  <button className="iconbtn" aria-label="Próximo mês" onClick={() => setYm(addM(ym, 1))}>
                    <Icon name="right" />
                  </button>
                </div>
              )}
            </header>
            {view === 'geral' && <Geral />}
            {view === 'pagamentos' && <Pagamentos />}
            {view === 'fixos' && <Fixos />}
            {view === 'variaveis' && <Variaveis />}
            {view === 'assinaturas' && <Assinaturas />}
            {view === 'objetivos' && <Objetivos />}
            {view === 'dados' && <Dados sync={sync} />}
          </main>
        </div>
      </ModalProvider>
    </AppContext.Provider>
  )
}

export default App
