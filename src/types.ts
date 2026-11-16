/** Mês no formato 'YYYY-MM'. */
export type YM = string
/** Data no formato 'YYYY-MM-DD'. */
export type ISODate = string

export const FORMAS_PAGAMENTO = ['Boleto', 'Pix', 'Débito automático', 'Cartão'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const TIPOS_PAGAMENTO = ['Fatura', 'Boleto', 'Pix'] as const
export type TipoPagamento = (typeof TIPOS_PAGAMENTO)[number]

export interface GastoFixo {
  id: string
  nome: string
  categoria: string
  valor: number
  /** Dia de vencimento (1–31). */
  dia: number
  forma: FormaPagamento
  inicio: YM
  fim: YM | null
}

export interface Assinatura {
  id: string
  nome: string
  categoria: string
  valor: number
  dia: number
  inicio: YM
  /** Último mês cobrado. */
  fim: YM | null
}

export interface Lancamento {
  id: string
  mes: YM
  data: ISODate
  desc: string
  categoria: string
  valor: number
}

export interface Pagamento {
  id: string
  mes: YM
  tipo: TipoPagamento
  desc: string
  valor: number
  venc: ISODate
  pago: boolean
  pagoEm?: ISODate | null
}

/** Valor negativo = resgate. */
export interface Aporte {
  data: ISODate
  valor: number
}

export interface Objetivo {
  id: string
  nome: string
  icone: string
  valor: number
  acumulado: number
  /** Data de criação, preenchida automaticamente. */
  inicio: ISODate
  fim: ISODate
  aportes: Aporte[]
  notas?: string
}

export interface FonteRenda {
  id: string
  nome: string
}

/** Valores de renda de um mês, por id de fonte. */
export type RendaMes = Record<string, number>

export interface Dados {
  /** Fontes de renda (ex.: salário, assessoria). */
  fontesRenda: FonteRenda[]
  /** Renda padrão por fonte, usada nos meses sem ajuste próprio. */
  rendaPadrao: RendaMes
  /** Ajuste de renda por mês (override completo do padrão). */
  renda: Record<YM, RendaMes>
  limitesPadrao: Record<string, number>
  limites: Record<YM, Record<string, number>>
  fixos: GastoFixo[]
  assinaturas: Assinatura[]
  lancamentos: Lancamento[]
  pagamentos: Pagamento[]
  /** Status de pagamento dos gastos fixos por mês. */
  pagosFixos: Record<YM, Record<string, boolean>>
  objetivos: Objetivo[]
  /** Avisos mostrados uma vez após a migração (ids). */
  avisos?: string[]
}
