/**
 * Regras de cálculo do dashboard. Todas as funções são puras: recebem os
 * dados e a data de hoje (ISO) por parâmetro, sem ler relógio ou storage.
 */
import type {
  Assinatura,
  Dados,
  GastoFixo,
  ISODate,
  Lancamento,
  Objetivo,
  Pagamento,
  RendaMes,
  YM,
} from '../types'
import { addM, dayDiff, daysIn, diffM, dueISO, mIdx, ymShort } from './dates'

export const sum = (a: number[]) => a.reduce((s, x) => s + (Number(x) || 0), 0)
export const round2 = (v: number) => Math.round(v * 100) / 100

/* ---------- Recorrentes ---------- */

/** Item recorrente ativo no mês: inicio <= mes && (fim == null || mes <= fim). */
export function isActive(item: { inicio: YM; fim: YM | null }, ym: YM): boolean {
  return item.inicio <= ym && (item.fim == null || ym <= item.fim)
}

export { dueISO }

/* ---------- Renda e limites ---------- */

export function rendaDoMes(d: Pick<Dados, 'renda' | 'rendaPadrao'>, ym: YM): RendaMes {
  return d.renda[ym] ?? d.rendaPadrao
}

export function rendaTotal(d: Pick<Dados, 'renda' | 'rendaPadrao' | 'fontesRenda'>, ym: YM): number {
  const r = rendaDoMes(d, ym)
  return sum(d.fontesRenda.map((f) => r[f.id] ?? 0))
}

export function limitesDoMes(d: Pick<Dados, 'limites' | 'limitesPadrao'>, ym: YM): Record<string, number> {
  return d.limites[ym] ?? d.limitesPadrao
}

/**
 * Valor de um gasto fixo no mês. Para itens percentuais (ex.: 10% da renda),
 * calcula sobre a renda do mês das fontes escolhidas (todas, se nenhuma).
 */
export function valorFixo(
  d: Pick<Dados, 'renda' | 'rendaPadrao' | 'fontesRenda'>,
  f: Pick<GastoFixo, 'valor' | 'percentual' | 'baseFontes'>,
  ym: YM,
): number {
  if (f.percentual == null) return f.valor
  const r = rendaDoMes(d, ym)
  const ids = f.baseFontes?.length ? f.baseFontes : d.fontesRenda.map((x) => x.id)
  return round2(f.percentual * sum(ids.map((id) => r[id] ?? 0)))
}

/** Primeiro mês com algum dado registrado (ou `fallback` se não houver). */
export function primeiroMes(d: Dados, fallback: YM): YM {
  const ms: YM[] = [
    ...d.lancamentos.map((l) => l.mes),
    ...d.pagamentos.map((p) => p.mes),
    ...Object.keys(d.renda),
    ...Object.keys(d.limites),
    ...Object.keys(d.pagosFixos),
    ...d.fixos.map((f) => f.inicio),
    ...d.assinaturas.map((a) => a.inicio),
    ...d.objetivos.flatMap((g) => g.aportes.map((a) => a.data.slice(0, 7))),
  ]
  return ms.reduce((min, m) => (m < min ? m : min), fallback)
}

/**
 * Antes de trocar um valor padrão a partir de `ym`, congela os meses
 * anteriores que usavam o padrão antigo, para que o histórico não mude.
 */
function congelarAnteriores<T>(
  overrides: Record<YM, T>,
  padraoAntigo: T,
  desde: YM,
  ate: YM,
): Record<YM, T> {
  const out = { ...overrides }
  for (let m = desde; m < ate; m = addM(m, 1)) {
    if (!(m in out)) out[m] = padraoAntigo
  }
  return out
}

/**
 * Edita a renda do mês. Com `padrao`, vira o novo padrão a partir deste mês:
 * remove ajustes do mês e dos meses futuros e preserva os meses anteriores.
 */
export function aplicarRenda(d: Dados, ym: YM, valores: RendaMes, padrao: boolean): Pick<Dados, 'renda' | 'rendaPadrao'> {
  if (!padrao) return { renda: { ...d.renda, [ym]: valores }, rendaPadrao: d.rendaPadrao }
  const renda = congelarAnteriores(d.renda, d.rendaPadrao, primeiroMes(d, ym), ym)
  for (const k of Object.keys(renda)) if (k >= ym) delete renda[k]
  return { renda, rendaPadrao: valores }
}

/** Mesma lógica da renda, para os limites dos gastos variáveis. */
export function aplicarLimites(
  d: Dados,
  ym: YM,
  limites: Record<string, number>,
  padrao: boolean,
): Pick<Dados, 'limites' | 'limitesPadrao'> {
  if (!padrao) return { limites: { ...d.limites, [ym]: limites }, limitesPadrao: d.limitesPadrao }
  const out = congelarAnteriores(d.limites, d.limitesPadrao, primeiroMes(d, ym), ym)
  for (const k of Object.keys(out)) if (k >= ym) delete out[k]
  return { limites: out, limitesPadrao: limites }
}

/* ---------- Objetivos ---------- */

export type StatusObjetivo = 'concluido' | 'encerrado' | 'andamento'
export type Prazo = 'Curto' | 'Médio' | 'Longo'

export interface CalcObjetivo {
  falta: number
  pct: number
  parcelas: number
  mensal: number
  prazo: Prazo
  status: StatusObjetivo
  fimYM: YM
}

/** Meses do mês atual até o mês da data final, inclusive (mínimo 1). */
export function parcelasObjetivo(fim: ISODate, today: ISODate): number {
  return Math.max(1, diffM(today.slice(0, 7), fim.slice(0, 7)) + 1)
}

/** Mínimo mensal = falta / parcelas. */
export function minimoMensal(g: Pick<Objetivo, 'valor' | 'acumulado' | 'fim'>, today: ISODate): number {
  const falta = Math.max(0, g.valor - g.acumulado)
  return falta / parcelasObjetivo(g.fim, today)
}

export function statusObjetivo(g: Pick<Objetivo, 'valor' | 'acumulado' | 'fim'>, today: ISODate): StatusObjetivo {
  if (Math.max(0, g.valor - g.acumulado) <= 0) return 'concluido'
  if (today > g.fim) return 'encerrado'
  return 'andamento'
}

export function prazoObjetivo(fim: ISODate, today: ISODate): Prazo {
  const h = diffM(today.slice(0, 7), fim.slice(0, 7))
  return h <= 12 ? 'Curto' : h <= 36 ? 'Médio' : 'Longo'
}

export function calcObjetivo(g: Objetivo, today: ISODate): CalcObjetivo {
  const falta = Math.max(0, g.valor - g.acumulado)
  return {
    falta,
    pct: g.valor > 0 ? Math.min(1, Math.max(0, g.acumulado / g.valor)) : 0,
    parcelas: parcelasObjetivo(g.fim, today),
    mensal: minimoMensal(g, today),
    prazo: prazoObjetivo(g.fim, today),
    status: statusObjetivo(g, today),
    fimYM: g.fim.slice(0, 7),
  }
}

/** Registra um aporte (ou resgate) e devolve o objetivo atualizado. */
export function registrarAporte(g: Objetivo, data: ISODate, valor: number, resgate: boolean): Objetivo {
  const v = resgate ? -Math.abs(valor) : Math.abs(valor)
  return {
    ...g,
    acumulado: Math.max(0, round2(g.acumulado + v)),
    aportes: [...g.aportes, { data, valor: v }],
  }
}

/**
 * Aportes de objetivos no mês.
 * Mês >= atual: soma dos mínimos mensais dos objetivos em andamento cujo mês final >= mês.
 * Mês passado: soma dos aportes registrados naquele mês.
 */
export function aportesDoMes(objetivos: Objetivo[], ym: YM, today: ISODate): number {
  const cur = today.slice(0, 7)
  if (ym < cur) {
    return sum(objetivos.flatMap((g) => g.aportes.filter((a) => a.data.slice(0, 7) === ym).map((a) => a.valor)))
  }
  return sum(
    objetivos.map((g) => {
      const c = calcObjetivo(g, today)
      return c.status === 'andamento' && c.fimYM >= ym ? c.mensal : 0
    }),
  )
}

/* ---------- Resumo do mês ---------- */

export interface ResumoMes {
  ym: YM
  fixos: GastoFixo[]
  assinaturas: Assinatura[]
  limites: Record<string, number>
  limiteTotal: number
  lancamentos: Lancamento[]
  gastoVar: number
  tFix: number
  tAss: number
  varPrevisto: number
  renda: number
  /** Fixos + assinaturas + variável previsto. Aportes de objetivos não entram. */
  comprometido: number
  /** O que sobra da renda após os compromissos, considerado como investimento. */
  investimentos: number
}

export function resumoMes(d: Dados, ym: YM, _today?: ISODate): ResumoMes {
  const fixos = d.fixos.filter((f) => isActive(f, ym))
  const assinaturas = d.assinaturas.filter((a) => isActive(a, ym))
  const limites = limitesDoMes(d, ym)
  const limiteTotal = sum(Object.values(limites))
  const lancamentos = d.lancamentos.filter((l) => l.mes === ym)
  const gastoVar = sum(lancamentos.map((l) => l.valor))
  const tFix = sum(fixos.map((f) => valorFixo(d, f, ym)))
  const tAss = sum(assinaturas.map((a) => a.valor))
  const varPrevisto = Math.max(limiteTotal, gastoVar)
  const renda = rendaTotal(d, ym)
  const comprometido = tFix + tAss + varPrevisto
  return {
    ym, fixos, assinaturas, limites, limiteTotal, lancamentos, gastoVar,
    tFix, tAss, varPrevisto, renda, comprometido, investimentos: renda - comprometido,
  }
}

/* ---------- Gastos variáveis ---------- */

export type StatusCategoria = 'ok' | 'atencao' | 'estourou' | 'sem-limite'

/** < 80% Ok; 80–100% Atenção; > 100% Estourou; sem limite = Sem limite. */
export function statusCategoria(gasto: number, limite: number | undefined): StatusCategoria {
  if (!limite || limite <= 0) return 'sem-limite'
  const p = gasto / limite
  return p > 1 ? 'estourou' : p >= 0.8 ? 'atencao' : 'ok'
}

export interface Categoria {
  nome: string
  gasto: number
  limite: number
  status: StatusCategoria
}

export function categoriasDoMes(r: ResumoMes): Categoria[] {
  const nomes = [...new Set([...Object.keys(r.limites), ...r.lancamentos.map((l) => l.categoria)])]
  return nomes.map((nome) => {
    const gasto = sum(r.lancamentos.filter((l) => l.categoria === nome).map((l) => l.valor))
    const limite = r.limites[nome] ?? 0
    return { nome, gasto, limite, status: statusCategoria(gasto, limite) }
  })
}

export interface Ritmo {
  /** Fração do mês decorrida (0–1). */
  mes: number
  /** Fração do limite já usada. */
  gasto: number
  acima: boolean
  diasRestantes: number
  porDia: number
}

/** Ritmo de gasto no mês atual; alerta se o gasto passar o ritmo em mais de 5 p.p. */
export function ritmoDoMes(r: ResumoMes, today: ISODate): Ritmo {
  const dim = daysIn(r.ym)
  const dia = Number(today.slice(8, 10))
  const diasRestantes = dim - dia + 1
  const mes = dia / dim
  const gasto = r.limiteTotal ? r.gastoVar / r.limiteTotal : 0
  const disponivel = r.limiteTotal - r.gastoVar
  return { mes, gasto, acima: gasto > mes + 0.05, diasRestantes, porDia: Math.max(0, disponivel) / diasRestantes }
}

/**
 * Define o total gasto numa categoria no mês (ex.: o valor visto na fatura).
 * Mantém um único lançamento de ajuste por categoria/mês com a diferença
 * entre o total informado e os outros lançamentos; remove o ajuste se ela
 * zerar. Devolve a lista de lançamentos atualizada.
 */
export function definirTotalCategoria(
  lancamentos: Lancamento[],
  mes: YM,
  categoria: string,
  total: number,
  data: ISODate,
  novoId: () => string,
): Lancamento[] {
  const daCat = (l: Lancamento) => l.mes === mes && l.categoria === categoria
  const ajuste = lancamentos.find((l) => daCat(l) && l.ajuste)
  const outros = sum(lancamentos.filter((l) => daCat(l) && !l.ajuste).map((l) => l.valor))
  const diff = round2(total - outros)
  const sem = lancamentos.filter((l) => l !== ajuste)
  if (diff === 0) return sem
  return [
    ...sem,
    {
      id: ajuste?.id ?? novoId(),
      mes,
      data,
      desc: 'Total atualizado',
      categoria,
      valor: diff,
      ajuste: true,
    },
  ]
}

/** Data usada para o ajuste: hoje no mês atual; senão, o último dia (passado) ou o 1º (futuro). */
export function dataDoAjuste(mes: YM, today: ISODate): ISODate {
  const cur = today.slice(0, 7)
  if (mes === cur) return today
  return mes < cur ? dueISO(mes, 31) : `${mes}-01`
}

/* ---------- Pagamentos ---------- */

export interface ItemPagamento {
  key: string
  origem: 'fixo' | 'avulso'
  ref: string
  tipo: string
  desc: string
  valor: number
  venc: ISODate
  pago: boolean
}

export function itensPagamento(d: Dados, ym: YM): ItemPagamento[] {
  const pf = d.pagosFixos[ym] ?? {}
  const fx: ItemPagamento[] = d.fixos
    .filter((f) => isActive(f, ym))
    .map((f) => ({
      key: `f:${f.id}`, origem: 'fixo', ref: f.id, tipo: f.forma, desc: f.nome,
      valor: valorFixo(d, f, ym), venc: dueISO(ym, f.dia), pago: !!pf[f.id],
    }))
  const av: ItemPagamento[] = d.pagamentos
    .filter((p) => p.mes === ym)
    .map((p) => ({
      key: `p:${p.id}`, origem: 'avulso', ref: p.id, tipo: p.tipo, desc: p.desc,
      valor: p.valor, venc: p.venc, pago: p.pago,
    }))
  return [...fx, ...av].sort((a, b) => a.venc.localeCompare(b.venc) || a.desc.localeCompare(b.desc))
}

export type TomStatus = 'ok' | 'warn' | 'bad' | 'neutral'
export interface StatusPagamento {
  tom: TomStatus
  label: string
  atrasado: boolean
}

/** Pago · Atrasado Nd · Vence hoje · Vence em Nd (≤ 3 dias) · Em N dias. */
export function statusPagamento(p: { pago: boolean; venc: ISODate }, today: ISODate): StatusPagamento {
  if (p.pago) return { tom: 'ok', label: 'Pago', atrasado: false }
  const d = dayDiff(today, p.venc)
  if (d < 0) return { tom: 'bad', label: `Atrasado ${-d}d`, atrasado: true }
  if (d === 0) return { tom: 'bad', label: 'Vence hoje', atrasado: false }
  if (d <= 3) return { tom: 'warn', label: `Vence em ${d}d`, atrasado: false }
  return { tom: 'neutral', label: `Em ${d} dias`, atrasado: false }
}

/**
 * Copia as faturas do mês anterior para `ym` como pendentes, mesmo dia de
 * vencimento, sem duplicar (mesma descrição já existente no mês).
 */
export function repetirFaturas(pagamentos: Pagamento[], ym: YM, novoId: () => string): Pagamento[] {
  const prev = addM(ym, -1)
  const existentes = new Set(pagamentos.filter((p) => p.mes === ym).map((p) => p.desc.trim().toLowerCase()))
  const novos: Pagamento[] = []
  for (const p of pagamentos) {
    if (p.mes !== prev || p.tipo !== 'Fatura') continue
    const k = p.desc.trim().toLowerCase()
    if (existentes.has(k)) continue
    existentes.add(k)
    novos.push({
      id: novoId(), mes: ym, tipo: 'Fatura', desc: p.desc, valor: p.valor,
      venc: dueISO(ym, Number(p.venc.slice(8, 10))), pago: false, pagoEm: null,
    })
  }
  return novos
}

/* ---------- Assinaturas ---------- */

export interface ChipAssinatura {
  label: string
  tom: TomStatus | 'acc'
  cobrancas: number | null
  restante: number | null
}

export function chipAssinatura(a: Assinatura, ym: YM): ChipAssinatura {
  const on = isActive(a, ym)
  if (!on && a.fim && ym > a.fim) return { label: 'Encerrada', tom: 'neutral', cobrancas: null, restante: null }
  if (!on) return { label: `Começa ${ymShort(a.inicio)}`, tom: 'neutral', cobrancas: null, restante: null }
  if (!a.fim) return { label: 'Recorrente', tom: 'acc', cobrancas: null, restante: null }
  const n = diffM(ym, a.fim) + 1
  return {
    label: `Até ${ymShort(a.fim)} · ${n} cobrança${n > 1 ? 's' : ''}`,
    tom: n <= 2 ? 'warn' : 'neutral',
    cobrancas: n,
    restante: a.valor * n,
  }
}

/** Assinaturas ativas no mês cujo fim está em até 2 meses. */
export function terminandoEmBreve(assinaturas: Assinatura[], ym: YM): Assinatura[] {
  return assinaturas.filter((a) => isActive(a, ym) && a.fim && mIdx(a.fim) - mIdx(ym) <= 2)
}

/* ---------- Projeção ---------- */

export function proximosMeses(d: Dados, inicio: YM, today: ISODate, n = 6): ResumoMes[] {
  return Array.from({ length: n }, (_, i) => resumoMes(d, addM(inicio, i), today))
}
