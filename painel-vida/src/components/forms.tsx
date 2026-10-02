import { useState } from 'react'
import { useData, useLive } from '../data/DataContext'
import type { MeetingKind, PaymentMethod, WorkoutKind } from '../data/types'
import { cashMonth, fmtMonth, monthKey, parseDuration } from '../lib/dates'
import { Button, Field, NumberField, Segmented, Select, TextInput } from './ui'

export const MEETING_KINDS: { value: MeetingKind; label: string }[] = [
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'cliente', label: 'Cliente atual' },
]

function Saved({ show }: { show: boolean }) {
  return show ? (
    <span className="text-xs" style={{ color: 'var(--success-text)' }}>
      ✓ Salvo
    </span>
  ) : null
}

function useFlash(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  return [
    on,
    () => {
      setOn(true)
      setTimeout(() => setOn(false), 1800)
    },
  ]
}

export function ExpenseForm({ date }: { date: string }) {
  const { settings, save } = useData()
  const boxes = useLive('boxes').filter((b) => !b.archived)
  const variableCats = settings.categories.filter((c) => c.kind === 'variavel' && !c.archived)
  const [amount, setAmount] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState(variableCats[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('cartao')
  const [origin, setOrigin] = useState('mes')
  const [saved, flash] = useFlash()
  const bill = cashMonth(date, payment, settings.card)

  const submit = async () => {
    if (!amount || amount <= 0 || !categoryId) return
    await save('expenses', { date, amount, categoryId, description: description.trim(), payment, origin })
    setAmount(null)
    setDescription('')
    flash()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <NumberField value={amount} onChange={setAmount} prefix="R$" />
        </Field>
        <Field label="Categoria">
          <Select value={categoryId} onChange={setCategoryId} options={variableCats.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
      </div>
      <Field label="Descrição (opcional)">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: feira da semana" />
      </Field>
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Pagamento">
          <Segmented
            value={payment}
            onChange={setPayment}
            options={[
              { value: 'cartao', label: 'Cartão' },
              { value: 'pix', label: 'Pix / débito' },
            ]}
          />
        </Field>
        <Field label="Dinheiro de onde?" className="flex-1 min-w-40">
          <Select
            value={origin}
            onChange={setOrigin}
            options={[{ value: 'mes', label: 'Do mês (orçamento)' }, ...boxes.map((b) => ({ value: b.id, label: `Caixinha: ${b.name}` }))]}
          />
        </Field>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {origin === 'mes' ? `Entra no orçamento de ${fmtMonth(monthKey(date))}` : 'Sai da caixinha — não pesa no orçamento do mês'}
        {payment === 'cartao' && monthKey(date) !== bill ? ` · cai na fatura de ${fmtMonth(bill)}` : ''}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!amount || amount <= 0}>
          Registrar gasto
        </Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}

export function WorkoutForm({ date }: { date: string }) {
  const { save } = useData()
  const [kind, setKind] = useState<WorkoutKind>('corrida')
  const [km, setKm] = useState<number | null>(null)
  const [duration, setDuration] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [plan, setPlan] = useState('A')
  const [notes, setNotes] = useState('')
  const [saved, flash] = useFlash()
  const durationSec = parseDuration(duration)
  const invalid = (duration.trim() !== '' && durationSec === null) || (kind === 'corrida' && !(km && km > 0))

  const submit = async () => {
    if (invalid) return
    await save('workouts', {
      date,
      kind,
      distanceKm: kind === 'corrida' ? km : null,
      durationSec,
      rpe: rpe ? Math.max(1, Math.min(10, Math.round(rpe))) : null,
      plan: kind === 'musculacao' ? plan.trim() || null : null,
      notes: notes.trim(),
    })
    setKm(null)
    setDuration('')
    setRpe(null)
    setNotes('')
    flash()
  }

  return (
    <div className="space-y-3">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'corrida', label: 'Corrida' },
          { value: 'musculacao', label: 'Musculação' },
        ]}
      />
      <div className="grid grid-cols-3 gap-3">
        {kind === 'corrida' ? (
          <Field label="Distância">
            <NumberField value={km} onChange={setKm} suffix="km" />
          </Field>
        ) : (
          <Field label="Treino">
            <TextInput value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="A, B, C…" />
          </Field>
        )}
        <Field label="Tempo">
          <TextInput value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={kind === 'corrida' ? '32:15' : '60'} inputMode="numeric" />
        </Field>
        <Field label="Esforço 1–10">
          <NumberField value={rpe} onChange={setRpe} placeholder="6" />
        </Field>
      </div>
      <Field label="Observações (opcional)">
        <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dor, clima, sensação…" />
      </Field>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Tempo em mm:ss ou h:mm:ss; um número sozinho conta como minutos.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={invalid}>
          Registrar treino
        </Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}

export function StudyLogForm({ date }: { date: string }) {
  const { save, increment } = useData()
  const items = useLive('studyItems').filter((i) => i.status === 'ativo')
  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, flash] = useFlash()
  const current = items.find((i) => i.id === itemId) ?? items[0]

  if (!items.length) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cadastre um curso, livro ou certificação na aba Estudos para registrar sessões.</p>
  }

  const submit = async () => {
    if (!current || !(minutes && minutes > 0)) return
    await save('studyLogs', { date, itemId: current.id, minutes, progress: progress ?? 0, note: note.trim() })
    await increment('studyItems', current.id, 'done', progress ?? 0, {})
    await increment('studyItems', current.id, 'minutesTotal', minutes, {})
    setMinutes(null)
    setProgress(null)
    setNote('')
    flash()
  }

  return (
    <div className="space-y-3">
      <Field label="O que estudou">
        <Select value={current?.id ?? ''} onChange={setItemId} options={items.map((i) => ({ value: i.id, label: i.name }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tempo">
          <NumberField value={minutes} onChange={setMinutes} suffix="min" />
        </Field>
        <Field label={`Avanço (${current?.unit ?? 'unidades'})`}>
          <NumberField value={progress} onChange={setProgress} placeholder="0" />
        </Field>
      </div>
      <Field label="Nota / aprendizado (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!(minutes && minutes > 0)}>
          Registrar estudo
        </Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}

export function MeetingForm({ date }: { date: string }) {
  const { save } = useData()
  const [kind, setKind] = useState<MeetingKind>('prospeccao')
  const [note, setNote] = useState('')
  const [saved, flash] = useFlash()
  const submit = async () => {
    await save('meetings', { date, kind, note: note.trim() })
    setNote('')
    flash()
  }
  return (
    <div className="space-y-3">
      <Field label="Tipo de reunião">
        <Select value={kind} onChange={setKind} options={MEETING_KINDS} />
      </Field>
      <Field label="Nota (opcional — sem dados pessoais do cliente)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: indicação do cliente X" />
      </Field>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Revisão mensal com cliente não é registrada aqui — use "Revisão" para não contar duas vezes.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={submit}>Registrar reunião</Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}

export function ReviewForm({ date }: { date: string }) {
  const { save } = useData()
  const clients = useLive('clients').filter((c) => !c.inactiveSince || c.inactiveSince > date)
  const reviews = useLive('reviews')
  const reviewedThisMonth = new Set(reviews.filter((r) => monthKey(r.date) === monthKey(date)).map((r) => r.clientId))
  const pending = clients.filter((c) => !reviewedThisMonth.has(c.id)).sort((a, b) => a.alias.localeCompare(b.alias))
  const [clientId, setClientId] = useState('')
  const [saved, flash] = useFlash()
  const chosen = pending.find((c) => c.id === clientId) ?? pending[0]

  if (!clients.length) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cadastre seus clientes (só apelido) na aba Assessoria.</p>
  }
  if (!pending.length) {
    return <p className="text-sm" style={{ color: 'var(--success-text)' }}>✓ Todos os clientes ativos já foram revisados em {fmtMonth(monthKey(date))}.</p>
  }
  const submit = async () => {
    if (!chosen) return
    await save('reviews', { date, clientId: chosen.id })
    setClientId('')
    flash()
  }
  return (
    <div className="space-y-3">
      <Field label={`Cliente revisado (${pending.length} pendentes no mês)`}>
        <Select value={chosen?.id ?? ''} onChange={setClientId} options={pending.map((c) => ({ value: c.id, label: c.alias }))} />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={submit}>Registrar revisão</Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}

export function ContentForm({ date }: { date: string }) {
  const { settings, save } = useData()
  const [platform, setPlatform] = useState(settings.contentPlatforms[0] ?? 'Instagram')
  const [title, setTitle] = useState('')
  const [saved, flash] = useFlash()
  const submit = async () => {
    await save('contents', { date, platform, title: title.trim() })
    setTitle('')
    flash()
  }
  return (
    <div className="space-y-3">
      <Field label="Onde publicou">
        <Select value={platform} onChange={setPlatform} options={settings.contentPlatforms.map((p) => ({ value: p, label: p }))} />
      </Field>
      <Field label="Tema (opcional)">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: reserva de emergência" />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={submit}>Registrar conteúdo</Button>
        <Saved show={saved} />
      </div>
    </div>
  )
}
