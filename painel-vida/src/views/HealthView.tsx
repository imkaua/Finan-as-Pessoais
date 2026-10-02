import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, useLive } from '../data/DataContext'
import type { Appointment, AppointmentStatus, PaymentMethod } from '../data/types'
import { addDays, fmtDuration, fmtPace, fmtShortDate, weekStart } from '../lib/dates'
import { checkups, sum, type CheckupStatus } from '../lib/calc'
import { brl, num } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Grid, Muted, NumberField, Row, Segmented, Select, Stat, TextInput, type Tone } from '../components/ui'

type Sub = 'treinos' | 'consultas'

export function HealthView() {
  const [sub, setSub] = useState<Sub>('treinos')
  return (
    <div className="space-y-4">
      <Segmented
        value={sub}
        onChange={setSub}
        options={[
          { value: 'treinos', label: 'Treinos' },
          { value: 'consultas', label: 'Consultas' },
        ]}
      />
      {sub === 'treinos' ? <WorkoutsSection /> : <AppointmentsSection />}
    </div>
  )
}

function WorkoutsSection() {
  const { today, remove } = useData()
  const workouts = useLive('workouts')
  const thisWeek = weekStart(today)
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(thisWeek, -7 * (11 - i)))
  const series = weeks.map((w) => {
    const ws = workouts.filter((x) => x.date >= w && x.date <= addDays(w, 6))
    return {
      week: `${w.slice(8)}/${w.slice(5, 7)}`,
      km: Math.round(sum(ws.filter((x) => x.kind === 'corrida').map((x) => x.distanceKm)) * 10) / 10,
      gym: ws.filter((x) => x.kind === 'musculacao').length,
    }
  })
  const current = series[series.length - 1].km
  const prev3 = series.slice(-4, -1).map((s) => s.km)
  const avgPrev = prev3.length ? sum(prev3) / prev3.length : 0
  const jump = avgPrev > 0 && current > avgPrev * 1.1
  const recent = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40)
  const runs = workouts.filter((w) => w.kind === 'corrida' && w.date >= addDays(today, -27))

  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <Stat label="Km nesta semana" value={`${num(current)} km`} hint={`Média das 3 anteriores: ${num(avgPrev)} km`} />
        <Stat label="Corridas em 4 semanas" value={runs.length} hint={`${num(sum(runs.map((r) => r.distanceKm)))} km no total`} />
        <Stat label="Musculação nesta semana" value={series[series.length - 1].gym} />
      </Grid>
      {jump && (
        <Card>
          <Badge tone="warning">
            Volume desta semana {Math.round((current / avgPrev - 1) * 100)}% acima da média recente. Aumentos acima de ~10% por semana elevam o risco de lesão.
          </Badge>
        </Card>
      )}
      <Card title="Quilômetros por semana">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} minTickGap={8} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [`${num(Number(v))} km`, 'Corrida']}
                labelFormatter={(l) => `Semana de ${l}`}
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'var(--surface-2)' }}
              />
              <Bar dataKey="km" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Treinos recentes" subtitle="Registre na aba Hoje.">
        {recent.length === 0 && <Empty>Nenhum treino registrado.</Empty>}
        {recent.map((w) => (
          <Row key={w.id} onDelete={() => remove('workouts', w.id)}>
            <span className="tabular-nums">{fmtShortDate(w.date)}</span> ·{' '}
            {w.kind === 'corrida'
              ? `Corrida ${num(w.distanceKm ?? 0)} km · ${fmtDuration(w.durationSec)} · ${fmtPace(w.durationSec, w.distanceKm)}`
              : `Musculação ${w.plan ?? ''} · ${fmtDuration(w.durationSec)}`}
            {w.rpe ? ` · esforço ${w.rpe}` : ''}
            {w.notes ? <span style={{ color: 'var(--text-muted)' }}> — {w.notes}</span> : null}
          </Row>
        ))}
      </Card>
    </div>
  )
}

const CHECKUP_TONE: Record<CheckupStatus, { tone: Tone; label: string }> = {
  vencida: { tone: 'critical', label: 'Vencida' },
  'em-breve': { tone: 'warning', label: 'Vence em breve' },
  'em-dia': { tone: 'good', label: 'Em dia' },
  agendada: { tone: 'good', label: 'Agendada' },
  'sem-historico': { tone: 'neutral', label: 'Sem registro' },
}

function AppointmentsSection() {
  const { today, settings, save, remove } = useData()
  const appointments = useLive('appointments')
  const info = checkups(settings.specialties, appointments, today)
  const specialties = settings.specialties.filter((s) => !s.archived)
  const [form, setForm] = useState({
    date: today,
    specialtyId: specialties[0]?.id ?? '',
    professional: '',
    amount: null as number | null,
    status: 'realizada' as AppointmentStatus,
    payment: 'cartao' as PaymentMethod,
  })
  const spName = (id: string) => settings.specialties.find((s) => s.id === id)?.name ?? id
  const expenseCategory = settings.categories.find((c) => c.id === 'consultas' && !c.archived)?.id ?? settings.categories.find((c) => c.kind === 'variavel' && !c.archived)?.id ?? 'extra'

  /** Fonte única: o gasto da consulta é criado/apagado junto com ela. */
  const createExpense = (a: { date: string; amount: number; specialtyId: string; professional?: string }, appointmentId: string, payment: PaymentMethod) =>
    save('expenses', {
      date: a.date,
      amount: a.amount,
      categoryId: expenseCategory,
      description: `${spName(a.specialtyId)}${a.professional ? ` — ${a.professional}` : ''}`,
      payment,
      origin: 'mes',
      appointmentId,
    })

  const submit = async () => {
    if (!form.specialtyId || !form.date) return
    const id = await save('appointments', {
      date: form.date,
      specialtyId: form.specialtyId,
      professional: form.professional.trim(),
      amount: form.amount,
      status: form.status,
    })
    if (form.status === 'realizada' && form.amount && form.amount > 0) {
      const expenseId = await createExpense({ ...form, amount: form.amount }, id, form.payment)
      await save('appointments', { id, expenseId })
    }
    setForm({ ...form, professional: '', amount: null })
  }

  const markDone = async (a: Appointment) => {
    let expenseId = a.expenseId ?? null
    if (!expenseId && a.amount && a.amount > 0) expenseId = await createExpense({ ...a, amount: a.amount }, a.id, 'cartao')
    await save('appointments', { id: a.id, status: 'realizada', date: a.date > today ? today : a.date, expenseId })
  }

  const del = async (a: Appointment) => {
    if (a.expenseId) await remove('expenses', a.expenseId)
    await remove('appointments', a.id)
  }

  const upcoming = appointments.filter((a) => a.status === 'agendada').sort((a, b) => (a.date < b.date ? -1 : 1))
  const past = appointments.filter((a) => a.status !== 'agendada').sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-4">
      <Card title="Check-ups" subtitle="Frequência configurável em Ajustes. Avisa quando está vencendo.">
        {info.map((c) => {
          const t = CHECKUP_TONE[c.status]
          return (
            <Row key={c.specialty.id}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>
                  {c.specialty.name}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {' '}
                    · a cada {c.specialty.everyMonths} meses
                    {c.last ? ` · última ${fmtShortDate(c.last)}` : ''}
                    {c.scheduled ? ` · marcada ${fmtShortDate(c.scheduled.date)}` : c.next ? ` · próxima ${fmtShortDate(c.next)}` : ''}
                  </span>
                </span>
                <Badge tone={t.tone}>{t.label}</Badge>
              </div>
            </Row>
          )
        })}
      </Card>

      <Card title="Registrar consulta">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Especialidade">
              <Select value={form.specialtyId} onChange={(specialtyId) => setForm({ ...form, specialtyId })} options={specialties.map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
            <Field label="Profissional (opcional)">
              <TextInput value={form.professional} onChange={(e) => setForm({ ...form, professional: e.target.value })} />
            </Field>
            <Field label="Valor (se pagou)">
              <NumberField value={form.amount} onChange={(amount) => setForm({ ...form, amount })} prefix="R$" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Segmented
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={[
                { value: 'realizada', label: 'Já fui' },
                { value: 'agendada', label: 'Agendada' },
              ]}
            />
            {form.amount ? (
              <Segmented
                value={form.payment}
                onChange={(payment) => setForm({ ...form, payment })}
                options={[
                  { value: 'cartao', label: 'Cartão' },
                  { value: 'pix', label: 'Pix' },
                ]}
              />
            ) : null}
          </div>
          {form.amount ? <Muted>O valor vira um gasto em Finanças automaticamente (sem lançar de novo).</Muted> : null}
          <Button onClick={submit} disabled={!form.specialtyId}>
            Salvar consulta
          </Button>
        </div>
      </Card>

      <Card title="Agendadas">
        {upcoming.length === 0 && <Empty>Nenhuma consulta agendada.</Empty>}
        {upcoming.map((a) => (
          <Row key={a.id} onDelete={() => del(a)}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                <span className="tabular-nums">{fmtShortDate(a.date)}</span> · {spName(a.specialtyId)}
                {a.professional ? ` — ${a.professional}` : ''}
                {a.date < today && <span style={{ color: 'var(--status-critical)' }}> · data passou</span>}
              </span>
              <div className="flex gap-1">
                <Button variant="secondary" className="text-xs py-1" onClick={() => markDone(a)}>
                  Fui
                </Button>
                <Button variant="ghost" className="text-xs py-1" onClick={() => save('appointments', { id: a.id, status: 'cancelada' })}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Row>
        ))}
      </Card>

      <Card title="Histórico">
        {past.length === 0 && <Empty>Nenhuma consulta registrada.</Empty>}
        {past.map((a) => (
          <Row key={a.id} onDelete={() => del(a)}>
            <span className="tabular-nums">{fmtShortDate(a.date)}</span> · {spName(a.specialtyId)}
            {a.professional ? ` — ${a.professional}` : ''}
            {a.status === 'cancelada' ? ' · cancelada' : a.amount ? ` · ${brl(a.amount, true)}` : ''}
          </Row>
        ))}
      </Card>
    </div>
  )
}
