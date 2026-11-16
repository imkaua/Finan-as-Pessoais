import type { ISODate, YM } from '../types'

export const pad = (n: number) => String(n).padStart(2, '0')

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function ymOf(d: Date): YM {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function isoOf(d: Date): ISODate {
  return `${ymOf(d)}-${pad(d.getDate())}`
}

/** Índice absoluto do mês (ano*12 + mês-1), útil para diferenças. */
export function mIdx(ym: YM): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + m - 1
}

export function addM(ym: YM, n: number): YM {
  const t = mIdx(ym) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}

/** Meses entre a e b (b - a). */
export function diffM(a: YM, b: YM): number {
  return mIdx(b) - mIdx(a)
}

export function daysIn(ym: YM): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Vencimento no mês, com o dia limitado ao último dia do mês. */
export function dueISO(ym: YM, dia: number): ISODate {
  const d = Math.max(1, Math.min(Math.round(dia), daysIn(ym)))
  return `${ym}-${pad(d)}`
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Dias de `from` até `to` (positivo se `to` está no futuro). */
export function dayDiff(from: ISODate, to: ISODate): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5)
}

export function ymLabel(ym: YM): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}

export function ymShort(ym: YM): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES[m - 1].slice(0, 3)}/${String(y).slice(2)}`
}

export function fmtDate(iso: ISODate): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function todayISO(): ISODate {
  return isoOf(new Date())
}

export const isYM = (s: unknown): s is YM => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)
export const isISO = (s: unknown): s is ISODate =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
