import type { Client, Content, DayCounter, DayLog, Meeting, Review, StudyLog, Workout, GoalMetric } from '../data/types'
import { addDays, monthKey } from './dates'
import { reviewCoverage, sum } from './calc'

export interface MetricSources {
  workouts: Workout[]
  studyLogs: StudyLog[]
  meetings: Meeting[]
  counters: DayCounter[]
  contents: Content[]
  clients: Client[]
  reviews: Review[]
  days: DayLog[]
}

export type MetricValues = Record<GoalMetric, number> & { diasRegistrados: number; diasPassados: number }

/** Valores da semana que começa em `start` (segunda). Recebe documentos já sem os excluídos. */
export function weekMetrics(start: string, today: string, s: MetricSources, startedAt?: string): MetricValues {
  const end = addDays(start, 6)
  const inWeek = (d: { date: string }) => d.date >= start && d.date <= end
  const runs = s.workouts.filter((w) => inWeek(w) && w.kind === 'corrida')
  const lastDay = end < today ? end : today
  // Cobertura de revisões é mensal: usa o mês do último dia da semana já vivido.
  const cov = reviewCoverage(monthKey(lastDay), s.clients, s.reviews)
  // Dias da semana que já passaram E em que o painel já estava em uso.
  const firstDay = startedAt && startedAt > start ? startedAt : start
  const daysPassed = firstDay > lastDay ? 0 : Math.round((Date.parse(lastDay) - Date.parse(firstDay)) / 86_400_000) + 1
  return {
    corridas: runs.length,
    km: sum(runs.map((w) => w.distanceKm)),
    musculacao: s.workouts.filter((w) => inWeek(w) && w.kind === 'musculacao').length,
    estudoHoras: sum(s.studyLogs.filter(inWeek).map((l) => l.minutes)) / 60,
    reunioes: s.meetings.filter(inWeek).length,
    mensagens: sum(s.counters.filter(inWeek).map((c) => c.proactive)),
    conteudos: s.contents.filter(inWeek).length,
    revisoesCobertura: Math.round(cov.pct * 100),
    diasRegistrados: s.days.filter((d) => inWeek(d) && d.closed && d.date <= today && d.date >= firstDay).length,
    diasPassados: daysPassed,
  }
}
