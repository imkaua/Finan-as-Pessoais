/**
 * Versões do schema salvo:
 *  - v1/v2: orçamento set–dez/2026 (categorias com planejado/realizado por mês,
 *    renda por fonte, reserva de emergência e grandes gastos).
 *  - v3: modelo atual (`Dados`).
 */
import type { Dados, FonteRenda, Lancamento, Objetivo, RendaMes } from '../types'
import { FORMAS_PAGAMENTO, TIPOS_PAGAMENTO } from '../types'
import { addM, dueISO, isISO, isYM } from './dates'

export const SCHEMA_VERSION = 3

export const AVISO_CATEGORIAS_FIXAS = 'migracao-categorias-fixas'
/** Categorias antigas que, no modelo novo, deveriam virar gastos fixos/assinaturas. */
export const CATEGORIAS_FIXAS_LEGADAS = ['Moradia', 'Assinaturas', 'Educação']

export function dadosVazios(): Dados {
  return {
    fontesRenda: [{ id: 'renda', nome: 'Renda principal' }],
    rendaPadrao: {},
    renda: {},
    limitesPadrao: {},
    limites: {},
    fixos: [],
    assinaturas: [],
    lancamentos: [],
    pagamentos: [],
    pagosFixos: {},
    objetivos: [],
    avisos: [],
  }
}

/* ---------- v2 ---------- */

interface V2Category { id: string; name: string }
interface V2Month { income?: Record<string, number> | number; planned?: Record<string, number>; actual?: Record<string, number> }
export interface V2State {
  categories?: V2Category[]
  incomeSources?: { id: string; name: string }[]
  months?: Record<string, V2Month>
  emergencyFund?: { goal?: number; startingBalance?: number; contributions?: Record<string, number> }
  bigExpenses?: { id?: string; name?: string; totalAmount?: number; savedSoFar?: number; targetDate?: string; notes?: string }[]
}

export function isV2(x: unknown): x is V2State {
  return !!x && typeof x === 'object' && 'months' in x && 'categories' in x && !('fixos' in x)
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const total = (r: RendaMes) => Object.values(r).reduce((s, v) => s + num(v), 0)

/**
 * Converte os dados da v2 para a v3 sem perder informação:
 * - renda por fonte → `renda[mes]` (o mês mais recente com valor vira o padrão)
 * - planejado por categoria → limites dos gastos variáveis
 * - realizado por categoria → um lançamento "Total do mês (migrado)"
 * - reserva de emergência e grandes gastos → objetivos
 */
export function migrarV2(old: V2State, today: string, uid: () => string): Dados {
  const cur = today.slice(0, 7)
  const d = dadosVazios()
  const nomeCat = new Map((old.categories ?? []).map((c) => [c.id, c.name]))
  const months = Object.entries(old.months ?? {})
    .filter(([k]) => isYM(k))
    .sort(([a], [b]) => a.localeCompare(b))

  // Renda por fonte
  const fontes: FonteRenda[] = (old.incomeSources ?? []).map((s) => ({ id: s.id, nome: s.name }))
  d.fontesRenda = fontes.length ? fontes : d.fontesRenda
  for (const [ym, m] of months) {
    let r: RendaMes = {}
    if (typeof m.income === 'number') r = { [d.fontesRenda[0].id]: m.income }
    else if (m.income) for (const f of d.fontesRenda) if (num(m.income[f.id])) r[f.id] = num(m.income[f.id])
    if (total(r) > 0) {
      d.renda[ym] = r
      d.rendaPadrao = r
    }
  }

  // Planejado → limites; realizado → lançamentos
  const porNome = (rec: Record<string, number> | undefined) => {
    const out: Record<string, number> = {}
    for (const [id, v] of Object.entries(rec ?? {})) {
      const nome = nomeCat.get(id)
      if (nome && num(v) > 0) out[nome] = (out[nome] ?? 0) + num(v)
    }
    return out
  }
  let usaFixasLegadas = false
  for (const [ym, m] of months) {
    const lim = porNome(m.planned)
    if (Object.keys(lim).length) {
      d.limites[ym] = lim
      d.limitesPadrao = lim
      if (CATEGORIAS_FIXAS_LEGADAS.some((c) => lim[c] > 0)) usaFixasLegadas = true
    }
    const ultimoDia = dueISO(ym, 31)
    const data = ym === cur && today < ultimoDia ? today : ultimoDia
    for (const [categoria, valor] of Object.entries(porNome(m.actual))) {
      const l: Lancamento = { id: uid(), mes: ym, data, desc: 'Total do mês (migrado)', categoria, valor }
      d.lancamentos.push(l)
    }
  }
  if (usaFixasLegadas) d.avisos = [AVISO_CATEGORIAS_FIXAS]

  // Objetivos
  const inicioPadrao = months.length ? `${months[0][0]}-01` : today
  const fimPadrao = dueISO(addM(cur, 12), 31)
  const ef = old.emergencyFund
  if (ef && (num(ef.goal) > 0 || num(ef.startingBalance) > 0 || total(ef.contributions ?? {}) !== 0)) {
    const aportes = Object.entries(ef.contributions ?? {})
      .filter(([k, v]) => isYM(k) && num(v) !== 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ data: `${k}-01`, valor: num(v) }))
    d.objetivos.push({
      id: uid(),
      nome: 'Reserva de Emergência',
      icone: 'shield',
      valor: num(ef.goal),
      acumulado: Math.max(0, num(ef.startingBalance) + aportes.reduce((s, a) => s + a.valor, 0)),
      inicio: inicioPadrao,
      fim: fimPadrao,
      aportes,
    })
  }
  for (const b of old.bigExpenses ?? []) {
    const g: Objetivo = {
      id: b.id || uid(),
      nome: b.name || 'Objetivo',
      icone: 'star',
      valor: num(b.totalAmount),
      acumulado: num(b.savedSoFar),
      inicio: inicioPadrao,
      fim: isISO(b.targetDate) ? b.targetDate : fimPadrao,
      aportes: [],
    }
    if (b.notes) g.notas = b.notes
    d.objetivos.push(g)
  }
  return d
}

/* ---------- v3: validação leve ---------- */

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const obj = <T>(v: unknown): Record<string, T> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {}

/** Garante que todos os campos existem e têm o tipo esperado (para import/sync). */
export function normalizar(x: Partial<Dados>): Dados {
  const base = dadosVazios()
  const fontes = arr<FonteRenda>(x.fontesRenda).filter((f) => f && typeof f.id === 'string')
  return {
    fontesRenda: fontes.length ? fontes : base.fontesRenda,
    rendaPadrao: obj<number>(x.rendaPadrao),
    renda: obj<RendaMes>(x.renda),
    limitesPadrao: obj<number>(x.limitesPadrao),
    limites: obj<Record<string, number>>(x.limites),
    fixos: arr<Dados['fixos'][number]>(x.fixos).map((f) => ({
      ...f,
      forma: (FORMAS_PAGAMENTO as readonly string[]).includes(f.forma) ? f.forma : 'Boleto',
      fim: f.fim || null,
    })),
    assinaturas: arr<Dados['assinaturas'][number]>(x.assinaturas).map((a) => ({ ...a, fim: a.fim || null })),
    lancamentos: arr(x.lancamentos),
    pagamentos: arr<Dados['pagamentos'][number]>(x.pagamentos).map((p) => ({
      ...p,
      tipo: (TIPOS_PAGAMENTO as readonly string[]).includes(p.tipo) ? p.tipo : 'Boleto',
    })),
    pagosFixos: obj<Record<string, boolean>>(x.pagosFixos),
    objetivos: arr<Objetivo>(x.objetivos).map((g) => ({ ...g, aportes: arr(g.aportes) })),
    avisos: arr<string>(x.avisos),
  }
}

/**
 * Aceita qualquer versão conhecida (v2 ou v3, com ou sem envelope de backup)
 * e devolve os dados no formato atual. Lança erro se não reconhecer.
 */
export function paraDadosAtuais(raw: unknown, today: string, uid: () => string): Dados {
  let x = raw as Record<string, unknown>
  if (x && typeof x === 'object' && 'dados' in x && x.dados && typeof x.dados === 'object') {
    x = x.dados as Record<string, unknown>
  }
  if (x && typeof x === 'object' && 'state' in x && x.state && typeof x.state === 'object') {
    // formato bruto do zustand persist: { state, version }
    x = x.state as Record<string, unknown>
  }
  if (isV2(x)) return migrarV2(x, today, uid)
  const y = x as Record<string, unknown> | null
  if (y && typeof y === 'object' && Array.isArray(y.fixos) && Array.isArray(y.objetivos)) {
    return normalizar(y as Partial<Dados>)
  }
  throw new Error('Arquivo não reconhecido como backup do dashboard.')
}
