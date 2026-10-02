import { useState } from 'react'
import { useData, useLive } from '../data/DataContext'
import type { StudyItem, StudyKind } from '../data/types'
import { addDays, daysBetween, fmtShortDate, weekStart } from '../lib/dates'
import { sum, weeklyPaceNeeded } from '../lib/calc'
import { num } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Grid, Muted, NumberField, Progress, Row, Segmented, Select, Stat, TextInput } from '../components/ui'

const KIND_LABEL: Record<StudyKind, string> = { certificacao: 'Certificação', curso: 'Curso', livro: 'Livro' }
const DEFAULT_UNIT: Record<StudyKind, string> = { certificacao: 'módulos', curso: 'aulas', livro: 'páginas' }

export function StudiesView() {
  const { today } = useData()
  const items = useLive('studyItems')
  const logs = useLive('studyLogs')
  const [showDone, setShowDone] = useState(false)
  const ws = weekStart(today)
  const weekMinutes = sum(logs.filter((l) => l.date >= ws).map((l) => l.minutes))
  const monthMinutes = sum(logs.filter((l) => l.date >= addDays(today, -29)).map((l) => l.minutes))
  const active = items.filter((i) => i.status !== 'concluido').sort((a, b) => (a.examDate ?? '9999') < (b.examDate ?? '9999') ? -1 : 1)
  const done = items.filter((i) => i.status === 'concluido')

  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <Stat label="Horas nesta semana" value={`${num(weekMinutes / 60)} h`} />
        <Stat label="Horas em 30 dias" value={`${num(monthMinutes / 60)} h`} />
        <Stat label="Em andamento" value={active.filter((i) => i.status === 'ativo').length} hint={`${done.length} concluídos`} />
      </Grid>
      {active.length === 0 && (
        <Card>
          <Empty>Cadastre sua primeira certificação, curso ou livro abaixo.</Empty>
        </Card>
      )}
      {active.map((i) => (
        <StudyCard key={i.id} item={i} />
      ))}
      <NewItemCard />
      {done.length > 0 && (
        <Card title={`Concluídos (${done.length})`} action={<Button variant="ghost" className="text-xs" onClick={() => setShowDone(!showDone)}>{showDone ? 'Ocultar' : 'Ver'}</Button>}>
          {showDone &&
            done.map((i) => (
              <Row key={i.id}>
                {KIND_LABEL[i.kind]} · {i.name} · {num((i.minutesTotal ?? 0) / 60)} h
              </Row>
            ))}
        </Card>
      )}
    </div>
  )
}

function StudyCard({ item }: { item: StudyItem }) {
  const { today, save } = useData()
  const logs = useLive('studyLogs').filter((l) => l.itemId === item.id)
  const [edit, setEdit] = useState(false)
  const doneUnits = item.done ?? 0
  const remaining = Math.max(0, item.total - doneUnits)
  const pace = weeklyPaceNeeded(remaining, today, item.examDate)
  const last4 = sum(logs.filter((l) => l.date >= addDays(today, -27)).map((l) => l.progress)) / 4
  // Nas 2 primeiras semanas ainda não há ritmo para comparar.
  const tooNew = daysBetween(item.date, today) < 14
  const behind = pace !== null && last4 < pace && !tooNew
  const daysToExam = item.examDate ? daysBetween(today, item.examDate) : null
  const lastLog = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))[0]

  return (
    <Card
      title={item.name}
      subtitle={`${KIND_LABEL[item.kind]}${item.status === 'pausado' ? ' · pausado' : ''}${item.examDate ? ` · prova ${fmtShortDate(item.examDate)}${daysToExam !== null && daysToExam >= 0 ? ` (${daysToExam} dias)` : ''}` : ''}`}
      action={<Button variant="ghost" className="text-xs" onClick={() => setEdit(!edit)}>{edit ? 'Fechar' : 'Editar'}</Button>}
    >
      {item.total > 0 && (
        <>
          <Progress value={doneUnits} max={item.total} />
          <Muted className="mt-1">
            {num(doneUnits, 0)} de {num(item.total, 0)} {item.unit} · {num((item.minutesTotal ?? 0) / 60)} h estudadas
            {lastLog ? ` · última sessão ${fmtShortDate(lastLog.date)}` : ''}
          </Muted>
        </>
      )}
      {pace !== null && (
        <div className="mt-2">
          <Badge tone={behind ? 'warning' : tooNew ? 'neutral' : 'good'}>
            Precisa de {num(pace)} {item.unit}/semana até a prova{tooNew ? '' : ` · ritmo das últimas 4 semanas: ${num(last4)}`}
          </Badge>
        </div>
      )}
      {daysToExam !== null && daysToExam < 0 && item.status === 'ativo' && (
        <div className="mt-2">
          <Badge tone="neutral">A data da prova passou — atualize a data ou marque como concluído.</Badge>
        </div>
      )}
      {edit && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome">
              <TextInput defaultValue={item.name} onBlur={(e) => e.target.value.trim() && save('studyItems', { id: item.id, name: e.target.value.trim() })} />
            </Field>
            <Field label="Data da prova">
              <TextInput type="date" value={item.examDate ?? ''} onChange={(e) => save('studyItems', { id: item.id, examDate: e.target.value || null })} />
            </Field>
            <Field label={`Total (${item.unit})`}>
              <NumberField commitOnBlur value={item.total} onChange={(v) => save('studyItems', { id: item.id, total: v ?? 0 })} />
            </Field>
            <Field label={`Já feito (${item.unit})`}>
              <NumberField commitOnBlur value={item.done ?? 0} onChange={(v) => save('studyItems', { id: item.id, done: v ?? 0 })} />
            </Field>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => save('studyItems', { id: item.id, status: item.status === 'pausado' ? 'ativo' : 'pausado' })}>
              {item.status === 'pausado' ? 'Retomar' : 'Pausar'}
            </Button>
            <Button variant="secondary" onClick={() => save('studyItems', { id: item.id, status: 'concluido' })}>
              Marcar como concluído
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function NewItemCard() {
  const { today, save } = useData()
  const [kind, setKind] = useState<StudyKind>('certificacao')
  const [name, setName] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [unit, setUnit] = useState(DEFAULT_UNIT.certificacao)
  const [examDate, setExamDate] = useState('')
  return (
    <Card title="Novo estudo">
      <div className="space-y-3">
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k)
            setUnit(DEFAULT_UNIT[k])
          }}
          options={[
            { value: 'certificacao', label: 'Certificação' },
            { value: 'curso', label: 'Curso' },
            { value: 'livro', label: 'Livro' },
          ]}
        />
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'certificacao' ? 'Ex: CFP' : kind === 'livro' ? 'Ex: O Investidor Inteligente' : 'Ex: Curso de Excel'} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tamanho total">
            <NumberField value={total} onChange={setTotal} />
          </Field>
          <Field label="Unidade">
            <Select
              value={unit}
              onChange={setUnit}
              options={['páginas', 'aulas', 'módulos', 'capítulos', 'questões', 'horas'].map((u) => ({ value: u, label: u }))}
            />
          </Field>
          {kind !== 'livro' && (
            <Field label="Data da prova / fim (opcional)">
              <TextInput type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </Field>
          )}
        </div>
        <Button
          disabled={!name.trim()}
          onClick={() => {
            save('studyItems', { kind, name: name.trim(), unit, total: total ?? 0, examDate: examDate || null, status: 'ativo', date: today, done: 0, minutesTotal: 0 })
            setName('')
            setTotal(null)
            setExamDate('')
          }}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  )
}
