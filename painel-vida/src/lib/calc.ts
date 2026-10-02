// Regras de negócio puras (sem React/Firebase), testadas em calc.test.ts.
import type {
  Appointment,
  BaseDoc,
  Box,
  BoxEvent,
  Client,
  Expense,
  Goal,
  GoalMetric,
  MonthPlan,
  Review,
  Settings,
  Specialty,
} from '../data/types.ts'
import { addDays, addMonthKey, addMonths, cashMonth, daysBetween, monthKey } from './dates.ts'

export function live<T extends BaseDoc>(docs: T[]): T[] {
  return docs.filter((d) => !d.deletedAt)
}

export function sum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (Number.isFinite(v as number) ? (v as number) : 0), 0)
}

// ---------- Metas com vigência ----------

export function goalFor(goals: Goal[], metric: GoalMetric, date: string): Goal | undefined {
  return goals.find((g) => g.metric === metric && g.from <= date && (!g.to || date <= g.to))
}

/**
 * Troca a meta a partir de `today`: encerra a vigente ontem e cria a nova.
 * Se a vigente começou hoje mesmo, só substitui o valor (evita vigência vazia).
 */
export function changeGoal(goals: Goal[], metric: GoalMetric, target: number | null, today: string, newId: string): Goal[] {
  const current = goalFor(goals, metric, today)
  let next = goals
  if (current) {
    if (current.from >= today) next = goals.filter((g) => g.id !== current.id)
    else next = goals.map((g) => (g.id === current.id ? { ...g, to: addDays(today, -1) } : g))
  }
  if (target === null || !(target > 0)) return next
  return [...next, { id: newId, metric, target, from: today, to: null }]
}

// ---------- Orçamento do mês (competência) ----------

export interface BudgetRow {
  categoryId: string
  name: string
  kind: 'fixo' | 'variavel'
  planned: number
  actual: number
}

export interface MonthBudget {
  rows: BudgetRow[]
  plannedTotal: number
  actualTotal: number
  incomeExpected: number
  incomeConservative: number
  incomeReceived: number
  incomeForecast: number
}

export function emptyMonthPlan(key: string): MonthPlan {
  return { id: key, date: `${key}-01`, planned: {}, fixedActual: {}, incomeForecast: {}, incomeReceived: {} }
}

/** Gastos que entram no orçamento do mês: data da compra no mês e pagos com dinheiro do mês. */
export function budgetExpenses(expenses: Expense[], key: string): Expense[] {
  return expenses.filter((e) => !e.deletedAt && e.origin === 'mes' && monthKey(e.date) === key)
}

/** Documentos podem vir com só parte dos campos (gravações parciais, versões antigas). */
export function normalizeMonthPlan(key: string, plan: Partial<MonthPlan> | undefined): MonthPlan {
  const e = emptyMonthPlan(key)
  return {
    ...e,
    ...plan,
    planned: { ...plan?.planned },
    fixedActual: { ...plan?.fixedActual },
    incomeForecast: { ...plan?.incomeForecast },
    incomeReceived: { ...plan?.incomeReceived },
  } as MonthPlan
}

export function monthBudget(key: string, settings: Settings, plan: Partial<MonthPlan> | undefined, expenses: Expense[]): MonthBudget {
  const p = normalizeMonthPlan(key, plan)
  const monthExpenses = budgetExpenses(expenses, key)
  const used = new Set(monthExpenses.map((e) => e.categoryId))
  const rows: BudgetRow[] = settings.categories
    .filter((c) => !c.archived || (p.planned[c.id] ?? 0) > 0 || used.has(c.id))
    .map((c) => {
      const planned = p.planned[c.id] ?? 0
      const launched = monthExpenses.filter((e) => e.categoryId === c.id)
      // Fixo: previsto conta como realizado, a menos que haja valor real informado
      // ou gastos lançados (ex.: categoria que mudou de variável para fixa).
      // Nunca soma os dois, para não contar o mesmo gasto duas vezes.
      const actual =
        c.kind === 'fixo' && launched.length === 0
          ? (p.fixedActual[c.id] ?? planned)
          : sum(launched.map((e) => e.amount))
      return { categoryId: c.id, name: c.name, kind: c.kind, planned, actual }
    })

  let incomeExpected = 0
  let incomeConservative = 0
  for (const s of settings.incomeSources) {
    const received = p.incomeReceived[s.id]
    const forecast = p.incomeForecast[s.id] ?? 0
    const has = typeof received === 'number'
    incomeExpected += has ? received : forecast
    incomeConservative += has ? received : s.variable ? 0 : forecast
  }

  return {
    rows,
    plannedTotal: sum(rows.map((r) => r.planned)),
    actualTotal: sum(rows.map((r) => r.actual)),
    incomeExpected,
    incomeConservative,
    incomeReceived: sum(Object.values(p.incomeReceived)),
    incomeForecast: sum(Object.values(p.incomeForecast)),
  }
}

/** Soma da fatura do cartão que vence no mês `key` (independe da origem do dinheiro). */
export function cardBill(expenses: Expense[], key: string, card: Settings['card']): number {
  return sum(
    expenses
      .filter((e) => !e.deletedAt && e.payment === 'cartao' && cashMonth(e.date, 'cartao', card) === key)
      .map((e) => e.amount),
  )
}

// ---------- Caixinhas ----------

export interface BoxBalance {
  balance: number
  anchorDate: string | null
  /** Dias desde a última conferência com o saldo real. */
  daysSinceCheck: number | null
}

/**
 * Saldo = último saldo conferido + aportes − retiradas − gastos pagos pela caixinha
 * depois dessa data. Em caso de dois eventos no mesmo dia, o 'saldo' vale como o
 * valor de fim do dia (os demais do mesmo dia já estão contidos nele).
 */
export function boxBalance(boxId: string, events: BoxEvent[], expenses: Expense[], today: string): BoxBalance {
  const evs = events.filter((e) => !e.deletedAt && e.boxId === boxId)
  // Mais recente primeiro; no mesmo dia, vale a conferência gravada por último.
  const anchors = evs
    .filter((e) => e.kind === 'saldo')
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (b.createdAt ?? 0) - (a.createdAt ?? 0)))
  const anchor = anchors[0]
  const after = (d: string) => (anchor ? d > anchor.date : true)
  let balance = anchor ? anchor.amount : 0
  for (const e of evs) {
    if (e.kind === 'saldo' || !after(e.date)) continue
    balance += e.kind === 'aporte' ? e.amount : -e.amount
  }
  for (const x of expenses) {
    if (!x.deletedAt && x.origin === boxId && after(x.date)) balance -= x.amount
  }
  return {
    balance,
    anchorDate: anchor?.date ?? null,
    daysSinceCheck: anchor ? daysBetween(anchor.date, today) : null,
  }
}

export interface ProjectionPoint {
  month: string
  total: number
  perBox: Record<string, number>
}

/** Projeção mês a mês: saldo × (1 + rendimento) + aporte planejado. */
export function projectBoxes(
  boxes: Box[],
  balances: Record<string, number>,
  yieldPct: number,
  fromMonth: string,
  months: number,
): ProjectionPoint[] {
  const active = boxes.filter((b) => !b.deletedAt && !b.archived)
  const current: Record<string, number> = {}
  for (const b of active) current[b.id] = balances[b.id] ?? 0
  const points: ProjectionPoint[] = [{ month: fromMonth, total: sum(Object.values(current)), perBox: { ...current } }]
  const r = yieldPct / 100
  for (let i = 1; i <= months; i++) {
    for (const b of active) current[b.id] = current[b.id] * (1 + r) + (b.monthlyPlan || 0)
    points.push({ month: addMonthKey(fromMonth, i), total: sum(Object.values(current)), perBox: { ...current } })
  }
  return points
}

/** Em quantos meses a caixinha atinge a meta no ritmo planejado (null = nunca/sem meta). */
export function monthsToGoal(balance: number, goal: number, monthlyPlan: number, yieldPct: number): number | null {
  if (!(goal > 0)) return null
  if (balance >= goal) return 0
  const r = yieldPct / 100
  let b = balance
  for (let i = 1; i <= 600; i++) {
    b = b * (1 + r) + monthlyPlan
    if (b >= goal) return i
  }
  return null
}

// ---------- Assessoria ----------

export function clientActiveIn(c: Client, from: string, to: string): boolean {
  return !c.deletedAt && c.since <= to && (!c.inactiveSince || c.inactiveSince > from)
}

export function reviewCoverage(key: string, clients: Client[], reviews: Review[]) {
  const from = `${key}-01`
  const to = addDays(addMonths(from, 1), -1)
  const base = clients.filter((c) => clientActiveIn(c, from, to))
  const baseIds = new Set(base.map((c) => c.id))
  const reviewed = new Set(
    reviews.filter((r) => !r.deletedAt && r.date >= from && r.date <= to && baseIds.has(r.clientId)).map((r) => r.clientId),
  )
  return { base: base.length, reviewed: reviewed.size, pct: base.length ? reviewed.size / base.length : 0, reviewedIds: reviewed }
}

// ---------- Consultas ----------

export type CheckupStatus = 'sem-historico' | 'vencida' | 'em-breve' | 'em-dia' | 'agendada'

export interface CheckupInfo {
  specialty: Specialty
  last: string | null
  next: string | null
  scheduled: Appointment | null
  status: CheckupStatus
}

export function checkups(specialties: Specialty[], appointments: Appointment[], today: string): CheckupInfo[] {
  return specialties
    .filter((s) => !s.archived && s.everyMonths > 0)
    .map((specialty) => {
      const mine = appointments.filter((a) => !a.deletedAt && a.specialtyId === specialty.id)
      const done = mine.filter((a) => a.status === 'realizada').sort((a, b) => (a.date < b.date ? 1 : -1))
      const scheduled =
        mine.filter((a) => a.status === 'agendada' && a.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] ?? null
      const last = done[0]?.date ?? null
      const next = last ? addMonths(last, specialty.everyMonths) : null
      let status: CheckupStatus
      if (scheduled) status = 'agendada'
      else if (!next) status = 'sem-historico'
      else if (next < today) status = 'vencida'
      else if (daysBetween(today, next) <= 30) status = 'em-breve'
      else status = 'em-dia'
      return { specialty, last, next, scheduled, status }
    })
}

// ---------- Estudos ----------

/** Quanto precisa avançar por semana para terminar até a data da prova. */
export function weeklyPaceNeeded(remaining: number, today: string, examDate: string | null | undefined): number | null {
  if (!examDate || remaining <= 0) return null
  const days = daysBetween(today, examDate)
  if (days <= 0) return null
  return remaining / Math.max(1, days / 7)
}
