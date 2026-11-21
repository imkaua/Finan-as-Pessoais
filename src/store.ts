import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Assinatura,
  Dados,
  FonteRenda,
  GastoFixo,
  ISODate,
  Lancamento,
  Objetivo,
  Pagamento,
  RendaMes,
  YM,
} from './types'
import { aplicarLimites, aplicarRenda, definirTotalCategoria, registrarAporte, repetirFaturas } from './lib/finance'
import { dadosVazios, migrarV2, normalizar, SCHEMA_VERSION, type V2State } from './lib/migrate'
import { todayISO } from './lib/dates'

export const STORAGE_KEY = 'financas-pessoais-dashboard'
export const BACKUP_V2_KEY = `${STORAGE_KEY}.backup-v2`

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

interface Acoes {
  salvarFontes: (fontes: FonteRenda[]) => void
  salvarRenda: (ym: YM, valores: RendaMes, padrao: boolean) => void
  salvarLimites: (ym: YM, limites: Record<string, number>, padrao: boolean) => void
  salvarFixo: (f: GastoFixo) => void
  removerFixo: (id: string) => void
  salvarAssinatura: (a: Assinatura) => void
  removerAssinatura: (id: string) => void
  salvarLancamento: (l: Lancamento) => void
  removerLancamento: (id: string) => void
  definirTotais: (mes: YM, totais: Record<string, number>, data: ISODate) => void
  salvarPagamento: (p: Pagamento) => void
  removerPagamento: (id: string) => void
  alternarPagoFixo: (ym: YM, fixoId: string) => void
  alternarPagoAvulso: (id: string) => void
  repetirFaturas: (ym: YM) => number
  salvarObjetivo: (g: Objetivo) => void
  removerObjetivo: (id: string) => void
  registrarAporte: (id: string, data: ISODate, valor: number, resgate: boolean) => void
  dispensarAviso: (id: string) => void
  substituirTudo: (d: Dados) => void
  limparTudo: () => void
}

export type Store = Dados & Acoes

const CAMPOS: (keyof Dados)[] = [
  'fontesRenda', 'rendaPadrao', 'renda', 'limitesPadrao', 'limites', 'fixos', 'assinaturas',
  'lancamentos', 'pagamentos', 'pagosFixos', 'objetivos', 'avisos',
]

export function getDados(s: Store = useStore.getState()): Dados {
  const out = {} as Record<string, unknown>
  for (const k of CAMPOS) out[k] = s[k]
  return out as unknown as Dados
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...dadosVazios(),

      salvarFontes: (fontesRenda) => set({ fontesRenda }),
      salvarRenda: (ym, valores, padrao) => set(aplicarRenda(getDados(get()), ym, valores, padrao)),
      salvarLimites: (ym, limites, padrao) => set(aplicarLimites(getDados(get()), ym, limites, padrao)),

      salvarFixo: (f) => set((s) => ({ fixos: upsert(s.fixos, f) })),
      removerFixo: (id) => set((s) => ({ fixos: s.fixos.filter((x) => x.id !== id) })),
      salvarAssinatura: (a) => set((s) => ({ assinaturas: upsert(s.assinaturas, a) })),
      removerAssinatura: (id) => set((s) => ({ assinaturas: s.assinaturas.filter((x) => x.id !== id) })),
      salvarLancamento: (l) => set((s) => ({ lancamentos: upsert(s.lancamentos, l) })),
      removerLancamento: (id) => set((s) => ({ lancamentos: s.lancamentos.filter((x) => x.id !== id) })),
      definirTotais: (mes, totais, data) =>
        set((s) => {
          let lancamentos = s.lancamentos
          for (const [categoria, total] of Object.entries(totais)) {
            lancamentos = definirTotalCategoria(lancamentos, mes, categoria, total, data, uid)
          }
          return { lancamentos }
        }),
      salvarPagamento: (p) => set((s) => ({ pagamentos: upsert(s.pagamentos, p) })),
      removerPagamento: (id) => set((s) => ({ pagamentos: s.pagamentos.filter((x) => x.id !== id) })),

      alternarPagoFixo: (ym, fixoId) =>
        set((s) => {
          const mes = { ...(s.pagosFixos[ym] ?? {}) }
          if (mes[fixoId]) delete mes[fixoId]
          else mes[fixoId] = true
          return { pagosFixos: { ...s.pagosFixos, [ym]: mes } }
        }),
      alternarPagoAvulso: (id) =>
        set((s) => ({
          pagamentos: s.pagamentos.map((p) =>
            p.id === id ? { ...p, pago: !p.pago, pagoEm: p.pago ? null : todayISO() } : p,
          ),
        })),
      repetirFaturas: (ym) => {
        const novos = repetirFaturas(get().pagamentos, ym, uid)
        if (novos.length) set((s) => ({ pagamentos: [...s.pagamentos, ...novos] }))
        return novos.length
      },

      salvarObjetivo: (g) => set((s) => ({ objetivos: upsert(s.objetivos, g) })),
      removerObjetivo: (id) => set((s) => ({ objetivos: s.objetivos.filter((x) => x.id !== id) })),
      registrarAporte: (id, data, valor, resgate) =>
        set((s) => ({
          objetivos: s.objetivos.map((g) => (g.id === id ? registrarAporte(g, data, valor, resgate) : g)),
        })),

      dispensarAviso: (id) => set((s) => ({ avisos: (s.avisos ?? []).filter((a) => a !== id) })),
      substituirTudo: (d) => set(normalizar(d)),
      limparTudo: () => set(dadosVazios()),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (s) => getDados(s),
      migrate: (persisted, version) => {
        if (version < 3) {
          // Guarda uma cópia intacta dos dados antigos antes de converter.
          try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw && !localStorage.getItem(BACKUP_V2_KEY)) localStorage.setItem(BACKUP_V2_KEY, raw)
          } catch {
            /* sem storage: segue com a migração em memória */
          }
          return migrarV2((persisted ?? {}) as V2State, todayISO(), uid) as unknown as Store
        }
        return normalizar(persisted as Partial<Dados>) as unknown as Store
      },
      merge: (persisted, current) => ({ ...current, ...normalizar((persisted ?? {}) as Partial<Dados>) }),
    },
  ),
)
