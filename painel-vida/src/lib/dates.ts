// Datas como dia local 'YYYY-MM-DD'. Nunca usamos toISOString() para gerar dias,
// porque ele converte para UTC (às 21h+ no Brasil vira o dia seguinte).

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Dia lógico: até `cutoffHour` da madrugada ainda conta como o dia anterior. */
export function logicalToday(cutoffHour: number, now: Date = new Date()): string {
  const d = new Date(now)
  if (d.getHours() < cutoffHour) d.setDate(d.getDate() - 1)
  return toISO(d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Soma meses mantendo o dia (limitado ao último dia do mês de destino). */
export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return toISO(target)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonthKey(key: string, n: number): string {
  return monthKey(addMonths(`${key}-01`, n))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

/** Segunda-feira da semana do dia. */
export function weekStart(iso: string): string {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7 // seg = 0
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to
}

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_PT_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function fmtDay(iso: string): string {
  const d = parseISO(iso)
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_PT[d.getMonth()]}`
}

export function fmtShortDate(iso: string): string {
  const d = parseISO(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`
}

export function fmtMonth(key: string, long = true): string {
  const [y, m] = key.split('-').map(Number)
  return long ? `${MONTHS_PT_LONG[m - 1]} ${y}` : `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
}

export function fmtWeek(start: string): string {
  const end = addDays(start, 6)
  const a = parseISO(start)
  const b = parseISO(end)
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_PT[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_PT[a.getMonth()]} – ${b.getDate()} ${MONTHS_PT[b.getMonth()]}`
}

/**
 * Mês em que uma compra sai do caixa.
 * Pix/débito: o próprio mês. Cartão: mês de vencimento da fatura em que a compra
 * entra — compra depois do fechamento vai para a fatura seguinte.
 */
export function cashMonth(
  date: string,
  payment: 'cartao' | 'pix',
  card: { closingDay: number; dueDay: number },
): string {
  if (payment === 'pix') return monthKey(date)
  const d = parseISO(date)
  // Dias 29–31 em meses curtos: o fechamento acontece no último dia do mês.
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const closing = Math.min(card.closingDay, lastDay)
  let closingMonth = monthKey(date)
  if (d.getDate() > closing) closingMonth = addMonthKey(closingMonth, 1)
  return card.dueDay > card.closingDay ? closingMonth : addMonthKey(closingMonth, 1)
}

/** "32:15" → 1935s, "1:05:20" → 3920s, "45" → 2700s (minutos). */
export function parseDuration(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const parts = t.split(':').map((p) => Number(p.replace(',', '.')))
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null
  if (parts.length === 1) return Math.round(parts[0] * 60)
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1])
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2])
  return null
}

export function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return '—'
  sec = Math.round(sec)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function fmtPace(durationSec?: number | null, km?: number | null): string {
  if (!durationSec || !km) return '—'
  const secPerKm = Math.round(durationSec / km)
  return `${Math.floor(secPerKm / 60)}:${pad(secPerKm % 60)}/km`
}
