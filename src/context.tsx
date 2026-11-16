import { createContext, useContext, useEffect, useState } from 'react'
import type { ISODate, YM } from './types'
import { todayISO } from './lib/dates'

export type View = 'geral' | 'pagamentos' | 'fixos' | 'variaveis' | 'assinaturas' | 'objetivos' | 'dados'

export interface AppCtx {
  /** Mês selecionado no topo. */
  ym: YM
  setYm: (ym: YM) => void
  /** Hoje (ISO) e mês atual. */
  today: ISODate
  cur: YM
  view: View
  go: (v: View) => void
}

export const AppContext = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const c = useContext(AppContext)
  if (!c) throw new Error('useApp fora do AppContext')
  return c
}

/** Data de hoje que se atualiza sozinha na virada do dia. */
export function useToday(): ISODate {
  const [t, setT] = useState(todayISO)
  useEffect(() => {
    const id = setInterval(() => setT((old) => (todayISO() !== old ? todayISO() : old)), 60_000)
    return () => clearInterval(id)
  }, [])
  return t
}
