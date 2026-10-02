import { useEffect, useState } from 'react'
import { useData, useLive } from '../data/DataContext'
import type { CollectionName } from '../data/types'
import { addDays, fmtDay, fmtDuration, fmtPace } from '../lib/dates'
import { brl } from '../lib/format'
import { Button, Card, Empty, Row, Segmented, TextArea } from '../components/ui'
import { ContentForm, ExpenseForm, MEETING_KINDS, MeetingForm, ReviewForm, StudyLogForm, WorkoutForm } from '../components/forms'

type Quick = 'gasto' | 'treino' | 'estudo' | 'reuniao' | 'revisao' | 'conteudo'

export function TodayView({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const { today, settings, increment, save, remove } = useData()
  const removeStudyLog = (id: string, itemId: string, minutes: number, progress: number) => async () => {
    await remove('studyLogs', id)
    await increment('studyItems', itemId, 'done', -(progress || 0), {})
    await increment('studyItems', itemId, 'minutesTotal', -(minutes || 0), {})
  }
  const [quick, setQuick] = useState<Quick>('gasto')
  const days = useLive('days')
  const counters = useLive('counters')
  const expenses = useLive('expenses')
  const workouts = useLive('workouts')
  const studyLogs = useLive('studyLogs')
  const studyItems = useLive('studyItems')
  const meetings = useLive('meetings')
  const reviews = useLive('reviews')
  const clients = useLive('clients')
  const contents = useLive('contents')
  const boxes = useLive('boxes')

  const dayLog = days.find((d) => d.id === date)
  const proactive = counters.find((c) => c.id === date)?.proactive ?? 0
  const [note, setNote] = useState(dayLog?.note ?? '')
  useEffect(() => setNote(dayLog?.note ?? ''), [dayLog?.note, date])

  // Últimos 7 dias sem fechamento (sem contar hoje).
  const closed = new Set(days.filter((d) => d.closed).map((d) => d.id))
  const startedAt = settings.startedAt ?? today
  const missing = Array.from({ length: 7 }, (_, i) => addDays(today, -(i + 1))).filter((d) => d >= startedAt && !closed.has(d))

  const cat = (id: string) => settings.categories.find((c) => c.id === id)?.name ?? id
  const on = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date === date)
  const del = (col: CollectionName, id: string) => () => remove(col, id)

  const entries = [
    ...on(expenses).map((e) => ({
      key: e.id,
      text: `💸 ${brl(e.amount, true)} · ${cat(e.categoryId)}${e.description ? ` — ${e.description}` : ''}${e.origin !== 'mes' ? ` (caixinha ${boxes.find((b) => b.id === e.origin)?.name ?? ''})` : ''}`,
      onDelete: e.appointmentId ? undefined : del('expenses', e.id),
    })),
    ...on(workouts).map((w) => ({
      key: w.id,
      text:
        w.kind === 'corrida'
          ? `🏃 Corrida ${w.distanceKm ?? 0} km · ${fmtDuration(w.durationSec)} · ${fmtPace(w.durationSec, w.distanceKm)}${w.rpe ? ` · esforço ${w.rpe}` : ''}`
          : `🏋️ Musculação ${w.plan ?? ''} · ${fmtDuration(w.durationSec)}${w.rpe ? ` · esforço ${w.rpe}` : ''}`,
      onDelete: del('workouts', w.id),
    })),
    ...on(studyLogs).map((l) => {
      const item = studyItems.find((i) => i.id === l.itemId)
      return {
        key: l.id,
        text: `📚 ${item?.name ?? 'Estudo'} · ${l.minutes} min${l.progress ? ` · +${l.progress} ${item?.unit ?? ''}` : ''}`,
        onDelete: removeStudyLog(l.id, l.itemId, l.minutes, l.progress),
      }
    }),
    ...on(meetings).map((m) => ({
      key: m.id,
      text: `🤝 Reunião · ${MEETING_KINDS.find((k) => k.value === m.kind)?.label}${m.note ? ` — ${m.note}` : ''}`,
      onDelete: del('meetings', m.id),
    })),
    ...on(reviews).map((r) => ({
      key: r.id,
      text: `🔁 Revisão · ${clients.find((c) => c.id === r.clientId)?.alias ?? 'cliente'}`,
      onDelete: del('reviews', r.id),
    })),
    ...on(contents).map((c) => ({
      key: c.id,
      text: `📣 Conteúdo · ${c.platform}${c.title ? ` — ${c.title}` : ''}`,
      onDelete: del('contents', c.id),
    })),
  ]

  const bump = (delta: number) => {
    if (delta < 0 && proactive <= 0) return
    increment('counters', date, 'proactive', delta, { date })
  }

  const toggleClosed = () => save('days', { id: date, date, closed: !dayLog?.closed, note: note.trim() })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => onDate(addDays(date, -1))} aria-label="Dia anterior">
          ←
        </Button>
        <div className="text-center">
          <p className="text-base font-semibold capitalize">{fmtDay(date)}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {date === today ? 'Hoje' : date === addDays(today, -1) ? 'Ontem' : 'Registro retroativo'}
            {dayLog?.closed ? ' · dia fechado ✓' : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={() => onDate(addDays(date, 1))} disabled={date >= today} aria-label="Próximo dia">
          →
        </Button>
      </div>

      {missing.length > 0 && date === today && (
        <Card>
          <p className="text-sm">
            <strong>{missing.length}</strong> {missing.length === 1 ? 'dia' : 'dias'} da última semana sem fechamento. Sem
            problema — dá para registrar depois:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {missing.map((d) => (
              <Button key={d} variant="secondary" className="text-xs py-1" onClick={() => onDate(d)}>
                {fmtDay(d)}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Mensagens proativas" subtitle="Contatos que você iniciou hoje. Toque no + na hora em que mandar.">
        <div className="flex items-center justify-center gap-6">
          <Button variant="secondary" className="w-12 h-12 text-xl" onClick={() => bump(-1)} disabled={proactive <= 0} aria-label="Menos uma">
            −
          </Button>
          <span className="text-4xl font-semibold tabular-nums w-16 text-center">{proactive}</span>
          <Button className="w-12 h-12 text-xl" onClick={() => bump(1)} aria-label="Mais uma">
            +
          </Button>
        </div>
      </Card>

      <Card title="Registrar">
        <div className="mb-4 overflow-x-auto">
          <Segmented
            value={quick}
            onChange={setQuick}
            options={[
              { value: 'gasto', label: 'Gasto' },
              { value: 'treino', label: 'Treino' },
              { value: 'estudo', label: 'Estudo' },
              { value: 'reuniao', label: 'Reunião' },
              { value: 'revisao', label: 'Revisão' },
              { value: 'conteudo', label: 'Conteúdo' },
            ]}
          />
        </div>
        {quick === 'gasto' && <ExpenseForm key={date} date={date} />}
        {quick === 'treino' && <WorkoutForm key={date} date={date} />}
        {quick === 'estudo' && <StudyLogForm key={date} date={date} />}
        {quick === 'reuniao' && <MeetingForm key={date} date={date} />}
        {quick === 'revisao' && <ReviewForm key={date} date={date} />}
        {quick === 'conteudo' && <ContentForm key={date} date={date} />}
      </Card>

      <Card title="Registros do dia">
        {entries.length === 0 && proactive === 0 ? (
          <Empty>Nada registrado ainda.</Empty>
        ) : (
          <div>
            {proactive > 0 && <Row>✉️ {proactive} mensagens proativas</Row>}
            {entries.map((e) => (
              <Row key={e.key} onDelete={e.onDelete}>
                {e.text}
              </Row>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Fechar o dia"
        subtitle="Fechar diz ao painel que o que não está registrado não aconteceu. Dia não fechado fica fora das médias — não conta como zero."
      >
        <TextArea value={note} onChange={setNote} rows={2} placeholder="Como foi o dia? (opcional)" />
        <div className="flex items-center gap-3 mt-3">
          <Button variant={dayLog?.closed ? 'secondary' : 'primary'} onClick={toggleClosed}>
            {dayLog?.closed ? 'Reabrir o dia' : 'Fechar o dia'}
          </Button>
          {dayLog?.closed && note.trim() !== (dayLog.note ?? '') && (
            <Button variant="ghost" onClick={() => save('days', { id: date, date, closed: true, note: note.trim() })}>
              Salvar nota
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
