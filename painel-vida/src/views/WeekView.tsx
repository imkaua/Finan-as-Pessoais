import { useEffect, useState } from 'react'
import { useData, useLive } from '../data/DataContext'
import type { GoalMetric } from '../data/types'
import { GOAL_LABELS } from '../data/defaults'
import { addDays, fmtWeek, weekStart } from '../lib/dates'
import { goalFor } from '../lib/calc'
import { weekMetrics, type MetricValues } from '../lib/metrics'
import { num } from '../lib/format'
import { Badge, Button, Card, Field, Muted, Progress, TextArea, type Tone } from '../components/ui'

/** Meta que vale para a semana: a vigente no último dia dela (ou hoje, se ainda está em andamento). */
function weekGoalDate(start: string, today: string): string {
  const end = addDays(start, 6)
  return end < today ? end : today
}

const WEEK_METRICS: GoalMetric[] = ['corridas', 'km', 'musculacao', 'estudoHoras', 'reunioes', 'mensagens', 'conteudos']

function statusFor(value: number, target: number, isCurrent: boolean, complete: boolean): { tone: Tone; label: string } {
  if (value >= target) return { tone: 'good', label: 'Meta batida' }
  if (isCurrent) return { tone: 'neutral', label: 'Em andamento' }
  if (!complete) return { tone: 'warning', label: 'Registro incompleto' }
  return { tone: 'critical', label: 'Abaixo da meta' }
}

export function WeekView() {
  const { today, settings, save } = useData()
  const sources = {
    workouts: useLive('workouts'),
    studyLogs: useLive('studyLogs'),
    meetings: useLive('meetings'),
    counters: useLive('counters'),
    contents: useLive('contents'),
    clients: useLive('clients'),
    reviews: useLive('reviews'),
    days: useLive('days'),
  }
  const reviewsDocs = useLive('weeklyReviews')
  const [start, setStart] = useState(() => weekStart(today))
  const isCurrent = start === weekStart(today)
  const m = weekMetrics(start, today, sources, settings.startedAt)
  const complete = m.diasRegistrados >= m.diasPassados

  const history: { start: string; values: MetricValues }[] = []
  const startedAt = settings.startedAt ?? today
  for (let i = 7; i >= 0; i--) {
    const s = addDays(weekStart(today), -7 * i)
    if (addDays(s, 6) < startedAt) continue // semanas antes de começar a usar o painel
    history.push({ start: s, values: weekMetrics(s, today, sources, settings.startedAt) })
  }

  const review = reviewsDocs.find((r) => r.id === start)
  const [form, setForm] = useState({ wins: '', problems: '', focus: '' })
  useEffect(() => setForm({ wins: review?.wins ?? '', problems: review?.problems ?? '', focus: review?.focus ?? '' }), [review, start])
  const prevFocus = reviewsDocs.find((r) => r.id === addDays(start, -7))?.focus

  const goalDate = weekGoalDate(start, today)
  const goals = WEEK_METRICS.map((metric) => ({ metric, goal: goalFor(settings.goals, metric, goalDate) })).filter((g) => g.goal)
  const coverageGoal = goalFor(settings.goals, 'revisoesCobertura', goalDate)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setStart(addDays(start, -7))} aria-label="Semana anterior">
          ←
        </Button>
        <div className="text-center">
          <p className="text-base font-semibold">Semana {fmtWeek(start)}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {m.diasRegistrados} de {m.diasPassados} dias fechados
          </p>
        </div>
        <Button variant="secondary" onClick={() => setStart(addDays(start, 7))} disabled={isCurrent} aria-label="Próxima semana">
          →
        </Button>
      </div>

      {prevFocus && (
        <Card title="Foco que você definiu para esta semana">
          <p className="text-sm whitespace-pre-wrap">{prevFocus}</p>
        </Card>
      )}

      <Card title="Metas da semana" subtitle="Cada semana é comparada com a meta que valia nela.">
        {goals.length === 0 && <Muted>Nenhuma meta definida. Configure em Ajustes.</Muted>}
        <div className="space-y-4">
          {goals.map(({ metric, goal }) => {
            const value = m[metric]
            const st = statusFor(value, goal!.target, isCurrent, complete)
            const info = GOAL_LABELS[metric]
            return (
              <div key={metric}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium">{info.label}</span>
                  <span className="text-sm tabular-nums">
                    {num(value)} / {num(goal!.target)} {info.unit}
                  </span>
                </div>
                <Progress value={value} max={goal!.target} color={st.tone === 'good' ? 'var(--status-good)' : 'var(--series-1)'} />
                <div className="mt-1">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              </div>
            )
          })}
          {coverageGoal && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium">Revisões do mês (clientes)</span>
                <span className="text-sm tabular-nums">
                  {m.revisoesCobertura}% / {coverageGoal.target}%
                </span>
              </div>
              <Progress value={m.revisoesCobertura} max={coverageGoal.target} />
            </div>
          )}
        </div>
      </Card>

      <Card title="Últimas 8 semanas" subtitle="✓ meta batida · — registro incompleto · ✕ abaixo">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="text-left font-medium py-1 pr-2">Meta</th>
                {history.map((h) => (
                  <th key={h.start} className="font-medium px-1 whitespace-nowrap">
                    {h.start.slice(8)}/{h.start.slice(5, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_METRICS.map((metric) => (
                <tr key={metric} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{GOAL_LABELS[metric].label}</td>
                  {history.map((h) => {
                    const g = goalFor(settings.goals, metric, weekGoalDate(h.start, today))
                    const v = h.values[metric]
                    const current = h.start === weekStart(today)
                    const full = h.values.diasRegistrados >= h.values.diasPassados
                    let mark = num(v)
                    let color = 'var(--text-secondary)'
                    if (g) {
                      if (v >= g.target) {
                        mark = '✓'
                        color = 'var(--success-text)'
                      } else if (current) mark = num(v)
                      else if (!full) mark = '—'
                      else {
                        mark = '✕'
                        color = 'var(--status-critical)'
                      }
                    }
                    return (
                      <td key={h.start} className="text-center px-1" style={{ color }} title={`${num(v)}${g ? ` / meta ${g.target}` : ''}`}>
                        {mark}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Revisão semanal" subtitle="5 minutos no domingo: é aqui que os números viram decisões.">
        <div className="space-y-3">
          <Field label="O que funcionou">
            <TextArea value={form.wins} onChange={(wins) => setForm({ ...form, wins })} rows={2} />
          </Field>
          <Field label="O que atrapalhou">
            <TextArea value={form.problems} onChange={(problems) => setForm({ ...form, problems })} rows={2} />
          </Field>
          <Field label="Foco da próxima semana">
            <TextArea value={form.focus} onChange={(focus) => setForm({ ...form, focus })} rows={2} />
          </Field>
          <Button onClick={() => save('weeklyReviews', { id: start, date: start, ...form })}>Salvar revisão</Button>
        </div>
      </Card>
    </div>
  )
}
