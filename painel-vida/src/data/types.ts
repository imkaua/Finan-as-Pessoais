// Modelo de dados do Painel de Vida.
//
// Regras que mantêm o histórico confiável por anos:
// - Datas são sempre o dia LOCAL no formato 'YYYY-MM-DD' (nunca timestamp UTC),
//   para que algo registrado às 22h no Brasil não caia no dia seguinte.
// - Cada registro é um documento próprio (nada de um documento gigante).
// - Nada é apagado de verdade: `deletedAt` manda o item para a lixeira.
// - Categorias, fontes, especialidades e metas são arquivadas, nunca removidas,
//   para que meses antigos continuem fazendo sentido.
// - Metas têm vigência (from/to): cada semana é comparada com a meta que valia
//   naquela época, não com a meta de hoje.

export const SCHEMA_VERSION = 1

export interface BaseDoc {
  id: string
  v?: number
  createdAt?: number
  updatedAt?: number
  deletedAt?: number | null
}

// ---------- Configurações ----------

export type CategoryKind = 'fixo' | 'variavel'

export interface Category {
  id: string
  name: string
  /** fixo: previsto conta como realizado. variavel: soma dos gastos lançados. */
  kind: CategoryKind
  archived?: boolean
}

export interface IncomeSource {
  id: string
  name: string
  /** Renda variável (comissão) fica de fora do cenário conservador até ser confirmada. */
  variable: boolean
  archived?: boolean
}

export interface Specialty {
  id: string
  name: string
  /** De quantos em quantos meses a consulta deve se repetir (0 = sem recorrência). */
  everyMonths: number
  archived?: boolean
}

export type GoalMetric =
  | 'corridas'
  | 'km'
  | 'musculacao'
  | 'estudoHoras'
  | 'reunioes'
  | 'mensagens'
  | 'conteudos'
  | 'revisoesCobertura'

export interface Goal {
  id: string
  metric: GoalMetric
  target: number
  /** Primeiro dia em que a meta vale. */
  from: string
  /** Último dia em que a meta vale (vazio = ainda vigente). */
  to?: string | null
}

export interface Settings extends BaseDoc {
  /** Primeiro dia de uso: antes disso não há "dia sem registro". */
  startedAt?: string
  /** Até esta hora da madrugada, o "hoje" ainda é o dia anterior. */
  dayCutoffHour: number
  card: { closingDay: number; dueDay: number }
  /** Rendimento mensal estimado das caixinhas, em % (ex.: 0.8). */
  boxYieldPct: number
  categories: Category[]
  incomeSources: IncomeSource[]
  specialties: Specialty[]
  goals: Goal[]
  contentPlatforms: string[]
}

// ---------- Registros ----------

export type PaymentMethod = 'cartao' | 'pix'

export interface Expense extends BaseDoc {
  date: string
  amount: number
  categoryId: string
  description: string
  payment: PaymentMethod
  /** 'mes' = dinheiro do mês (entra no orçamento). Outro valor = id da caixinha que pagou. */
  origin: string
  /** Gasto criado automaticamente por uma consulta. */
  appointmentId?: string | null
}

/** Um documento por mês, id = 'YYYY-MM'. */
export interface MonthPlan extends BaseDoc {
  date: string // 'YYYY-MM-01'
  planned: Record<string, number>
  /** Para categorias fixas: valor real quando diferente do previsto. */
  fixedActual: Record<string, number>
  incomeForecast: Record<string, number>
  /** Valor efetivamente recebido. Ausente = ainda não recebeu/confirmou. */
  incomeReceived: Record<string, number>
}

export interface Box extends BaseDoc {
  name: string
  goal: number
  /** Aporte mensal planejado (usado na projeção). */
  monthlyPlan: number
  archived?: boolean
}

export type BoxEventKind = 'saldo' | 'aporte' | 'retirada'

export interface BoxEvent extends BaseDoc {
  boxId: string
  date: string
  /** saldo = conferência com o valor real do banco (âncora). */
  kind: BoxEventKind
  amount: number
  note?: string
}

export type WorkoutKind = 'corrida' | 'musculacao'

export interface Workout extends BaseDoc {
  date: string
  kind: WorkoutKind
  distanceKm?: number | null
  durationSec?: number | null
  /** Esforço percebido 1–10. */
  rpe?: number | null
  /** Treino de musculação (A, B, C…). */
  plan?: string | null
  notes?: string
}

export type AppointmentStatus = 'agendada' | 'realizada' | 'cancelada'

export interface Appointment extends BaseDoc {
  date: string
  specialtyId: string
  professional?: string
  amount?: number | null
  status: AppointmentStatus
  notes?: string
  /** Gasto vinculado (criado automaticamente quando há valor). */
  expenseId?: string | null
}

export type StudyKind = 'certificacao' | 'curso' | 'livro'

export interface StudyItem extends BaseDoc {
  kind: StudyKind
  name: string
  /** Unidade de progresso: páginas, aulas, módulos, questões… */
  unit: string
  total: number
  examDate?: string | null
  status: 'ativo' | 'concluido' | 'pausado'
  date: string // início
  /**
   * Totais acumulados (incremento atômico a cada sessão). Ficam no item porque as
   * sessões antigas saem da janela "ao vivo" — assim um curso de 2 anos não perde o progresso.
   */
  done?: number
  minutesTotal?: number
}

export interface StudyLog extends BaseDoc {
  date: string
  itemId: string
  minutes: number
  progress: number
  note?: string
}

/** Cliente da assessoria. Só apelido — nada de CPF, nome completo ou patrimônio (LGPD/compliance). */
export interface Client extends BaseDoc {
  alias: string
  /** Primeiro dia como cliente. */
  since: string
  /** Dia em que deixou de ser cliente (vazio = ativo). Mantém a cobertura de meses antigos correta. */
  inactiveSince?: string | null
  date: string
}

export type MeetingKind = 'prospeccao' | 'diagnostico' | 'proposta' | 'fechamento' | 'cliente'

export interface Meeting extends BaseDoc {
  date: string
  kind: MeetingKind
  note?: string
}

export interface Review extends BaseDoc {
  date: string
  clientId: string
  note?: string
}

export interface Content extends BaseDoc {
  date: string
  platform: string
  title?: string
}

/** Contadores do dia, id = data. Usa incremento atômico (sem conflito entre aparelhos). */
export interface DayCounter extends BaseDoc {
  date: string
  proactive?: number
}

/** Mês da assessoria, id = 'YYYY-MM'. Valores de COMPETÊNCIA (gerado), não de caixa. */
export interface AdvisoryMonth extends BaseDoc {
  date: string
  captacao?: number | null
  resgates?: number | null
  aum?: number | null
  comissao?: number | null
}

/** Marca de dia registrado: distingue "não fiz" de "esqueci de registrar". */
export interface DayLog extends BaseDoc {
  date: string
  closed: boolean
  note?: string
}

export interface WeeklyReview extends BaseDoc {
  date: string // segunda-feira da semana
  wins: string
  problems: string
  focus: string
}

export interface Collections {
  expenses: Expense
  months: MonthPlan
  boxes: Box
  boxEvents: BoxEvent
  workouts: Workout
  appointments: Appointment
  studyItems: StudyItem
  studyLogs: StudyLog
  clients: Client
  meetings: Meeting
  reviews: Review
  contents: Content
  counters: DayCounter
  advisoryMonths: AdvisoryMonth
  days: DayLog
  weeklyReviews: WeeklyReview
}

export type CollectionName = keyof Collections

/**
 * Coleções que crescem todo dia: só os últimos meses ficam "ao vivo" (economiza
 * leituras do plano gratuito do Firebase). O restante é carregado sob demanda
 * (exportação / histórico).
 */
export const WINDOWED: CollectionName[] = [
  'expenses',
  'workouts',
  'studyLogs',
  'meetings',
  'reviews',
  'contents',
  'counters',
  'days',
]

export const ALL_COLLECTIONS: CollectionName[] = [
  'expenses',
  'months',
  'boxes',
  'boxEvents',
  'workouts',
  'appointments',
  'studyItems',
  'studyLogs',
  'clients',
  'meetings',
  'reviews',
  'contents',
  'counters',
  'advisoryMonths',
  'days',
  'weeklyReviews',
]
