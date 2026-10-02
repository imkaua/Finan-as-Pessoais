import { useState } from 'react'
import { useData } from '../data/DataContext'
import { GOAL_LABELS } from '../data/defaults'
import { ALL_COLLECTIONS, type CollectionName, type GoalMetric } from '../data/types'
import { changeGoal, goalFor } from '../lib/calc'
import { fmtShortDate } from '../lib/dates'
import { exportAll, importAll, markExported } from '../lib/backup'
import { Badge, Button, Card, Field, Muted, NumberField, Row, Select, TextInput } from '../components/ui'

export function SettingsView({ userLabel, onSignOut }: { userLabel: string; onSignOut?: () => void }) {
  const { settingsSynced } = useData()
  return (
    <div className="space-y-4">
      <BackupCard />
      {!settingsSynced && (
        <Card>
          <Badge tone="warning">Aguardando a primeira sincronização com a nuvem. Os ajustes ficam travados até lá para não sobrescrever sua configuração.</Badge>
        </Card>
      )}
      <fieldset disabled={!settingsSynced} className="space-y-4 disabled:opacity-60">
      <GoalsCard />
      <CardCycleCard />
      <CategoriesCard />
      <IncomeCard />
      <SpecialtiesCard />
      <PlatformsCard />
      </fieldset>
      <TrashCard />
      <Card title="Conta">
        <p className="text-sm">{userLabel}</p>
        {onSignOut && (
          <Button variant="secondary" className="mt-3" onClick={onSignOut}>
            Sair
          </Button>
        )}
      </Card>
    </div>
  )
}

function slug(name: string) {
  return `${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
}

function GoalsCard() {
  const { settings, saveSettings, today, newId } = useData()
  const metrics = Object.keys(GOAL_LABELS) as GoalMetric[]
  return (
    <Card title="Metas" subtitle="Mudar uma meta vale a partir desta semana — semanas já encerradas continuam comparadas com a meta da época.">
      {metrics.map((metric) => {
        const g = goalFor(settings.goals, metric, today)
        const info = GOAL_LABELS[metric]
        return (
          <div key={metric} className="grid grid-cols-[1fr_8rem] gap-3 items-center py-1.5">
            <span className="text-sm">
              {info.label}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {' '}
                por {info.period}
                {g ? ` · desde ${fmtShortDate(g.from)}` : ''}
              </span>
            </span>
            <NumberField
              commitOnBlur
              value={g?.target ?? null}
              placeholder="sem meta"
              suffix={info.unit === '%' ? '%' : undefined}
              onChange={(v) => saveSettings({ goals: changeGoal(settings.goals, metric, v, today, newId()) })}
            />
          </div>
        )
      })}
    </Card>
  )
}

function CardCycleCard() {
  const { settings, saveSettings } = useData()
  return (
    <Card title="Cartão e dia" subtitle="Compras depois do fechamento entram na fatura seguinte.">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Dia de fechamento">
          <NumberField commitOnBlur value={settings.card.closingDay} onChange={(v) => v && v >= 1 && v <= 31 && saveSettings({ card: { ...settings.card, closingDay: Math.round(v) } })} />
        </Field>
        <Field label="Dia de vencimento">
          <NumberField commitOnBlur value={settings.card.dueDay} onChange={(v) => v && v >= 1 && v <= 31 && saveSettings({ card: { ...settings.card, dueDay: Math.round(v) } })} />
        </Field>
        <Field label="Virada do dia">
          <NumberField commitOnBlur value={settings.dayCutoffHour} suffix="h" onChange={(v) => v !== null && v >= 0 && v <= 8 && saveSettings({ dayCutoffHour: Math.round(v) })} />
        </Field>
      </div>
      <Muted className="mt-2">Virada do dia: até essa hora da madrugada, o que você registrar conta para o dia anterior.</Muted>
    </Card>
  )
}

function CategoriesCard() {
  const { settings, saveSettings } = useData()
  const [name, setName] = useState('')
  const update = (id: string, patch: Partial<(typeof settings.categories)[number]>) =>
    saveSettings({ categories: settings.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  return (
    <Card title="Categorias de gasto" subtitle="Fixa: o previsto conta como pago. Variável: soma o que você registra. Arquivar mantém o histórico.">
      {settings.categories.map((c) => (
        <div key={c.id} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-center py-1" style={{ opacity: c.archived ? 0.5 : 1 }}>
          <TextInput defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim() })} />
          <Select
            value={c.kind}
            onChange={(kind) => update(c.id, { kind })}
            options={[
              { value: 'fixo', label: 'Fixa' },
              { value: 'variavel', label: 'Variável' },
            ]}
          />
          <Button variant="ghost" className="text-xs" onClick={() => update(c.id, { archived: !c.archived })}>
            {c.archived ? 'Reativar' : 'Arquivar'}
          </Button>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            saveSettings({ categories: [...settings.categories, { id: slug(name), name: name.trim(), kind: 'variavel' }] })
            setName('')
          }}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  )
}

function IncomeCard() {
  const { settings, saveSettings } = useData()
  const [name, setName] = useState('')
  const update = (id: string, patch: Partial<(typeof settings.incomeSources)[number]>) =>
    saveSettings({ incomeSources: settings.incomeSources.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  return (
    <Card title="Fontes de receita" subtitle="Variável (comissão) só entra no cenário conservador quando recebida.">
      {settings.incomeSources.map((s) => (
        <div key={s.id} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-center py-1" style={{ opacity: s.archived ? 0.5 : 1 }}>
          <TextInput defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && update(s.id, { name: e.target.value.trim() })} />
          <Select
            value={s.variable ? 'v' : 'f'}
            onChange={(v) => update(s.id, { variable: v === 'v' })}
            options={[
              { value: 'v', label: 'Variável' },
              { value: 'f', label: 'Fixa' },
            ]}
          />
          <Button variant="ghost" className="text-xs" onClick={() => update(s.id, { archived: !s.archived })}>
            {s.archived ? 'Reativar' : 'Arquivar'}
          </Button>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova fonte" />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            saveSettings({ incomeSources: [...settings.incomeSources, { id: slug(name), name: name.trim(), variable: true }] })
            setName('')
          }}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  )
}

function SpecialtiesCard() {
  const { settings, saveSettings } = useData()
  const [name, setName] = useState('')
  const update = (id: string, patch: Partial<(typeof settings.specialties)[number]>) =>
    saveSettings({ specialties: settings.specialties.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  return (
    <Card title="Consultas e check-ups" subtitle="De quantos em quantos meses cada uma deve se repetir (0 = sem alerta).">
      {settings.specialties.map((s) => (
        <div key={s.id} className="grid grid-cols-[1fr_6rem_auto] gap-2 items-center py-1" style={{ opacity: s.archived ? 0.5 : 1 }}>
          <TextInput defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && update(s.id, { name: e.target.value.trim() })} />
          <NumberField commitOnBlur value={s.everyMonths} suffix="m" onChange={(v) => update(s.id, { everyMonths: Math.max(0, Math.round(v ?? 0)) })} />
          <Button variant="ghost" className="text-xs" onClick={() => update(s.id, { archived: !s.archived })}>
            {s.archived ? 'Reativar' : 'Arquivar'}
          </Button>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nutricionista" />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            saveSettings({ specialties: [...settings.specialties, { id: slug(name), name: name.trim(), everyMonths: 12 }] })
            setName('')
          }}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  )
}

function PlatformsCard() {
  const { settings, saveSettings } = useData()
  const [name, setName] = useState('')
  return (
    <Card title="Plataformas de conteúdo">
      {settings.contentPlatforms.map((p) => (
        <Row key={p}>{p}</Row>
      ))}
      <div className="flex gap-2 mt-3">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: TikTok" />
        <Button
          disabled={!name.trim() || settings.contentPlatforms.includes(name.trim())}
          onClick={() => {
            saveSettings({ contentPlatforms: [...settings.contentPlatforms, name.trim()] })
            setName('')
          }}
        >
          Adicionar
        </Button>
      </div>
      <Muted className="mt-2">Plataformas não são removidas para não perder o histórico dos conteúdos já registrados.</Muted>
    </Card>
  )
}

function BackupCard() {
  const { backend } = useData()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <Card title="Backup" subtitle="Baixe um arquivo com TODOS os seus dados (inclusive o histórico antigo). Guarde no Google Drive uma vez por mês.">
      <div className="flex gap-2 flex-wrap">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setMsg(null)
            try {
              const n = await exportAll(backend)
              markExported()
              setMsg(`✓ Backup baixado (${n} registros).`)
            } catch (e) {
              console.error(e)
              setMsg('Não foi possível gerar o backup. Confira a internet.')
            } finally {
              setBusy(false)
            }
          }}
        >
          Baixar backup (.json)
        </Button>
        <label className="rounded-lg border text-sm font-medium px-3 py-2 cursor-pointer" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
          Restaurar backup
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (!confirm('Restaurar mescla o arquivo com os dados atuais (registros com o mesmo id são substituídos pela versão do arquivo). Continuar?')) return
              setBusy(true)
              try {
                const n = await importAll(backend, await file.text())
                setMsg(`✓ ${n} registros restaurados.`)
              } catch (err) {
                console.error(err)
                setMsg('Arquivo inválido.')
              } finally {
                setBusy(false)
              }
            }}
          />
        </label>
      </div>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </Card>
  )
}

const COL_LABEL: Partial<Record<CollectionName, string>> = {
  expenses: 'Gasto',
  workouts: 'Treino',
  studyLogs: 'Sessão de estudo',
  meetings: 'Reunião',
  reviews: 'Revisão',
  contents: 'Conteúdo',
  appointments: 'Consulta',
  boxEvents: 'Movimento de caixinha',
  clients: 'Cliente',
  boxes: 'Caixinha',
  studyItems: 'Estudo',
}

function TrashCard() {
  const { data, restore, increment } = useData()
  const [open, setOpen] = useState(false)
  const deleted = ALL_COLLECTIONS.flatMap((col) =>
    (data[col] as { id: string; date?: string; deletedAt?: number | null }[])
      .filter((d) => d.deletedAt)
      .map((d) => ({ col, doc: d })),
  ).sort((a, b) => (b.doc.deletedAt ?? 0) - (a.doc.deletedAt ?? 0))

  const undo = async (col: CollectionName, doc: Record<string, unknown> & { id: string }) => {
    await restore(col, doc.id)
    if (col === 'studyLogs') {
      await increment('studyItems', String(doc.itemId), 'done', Number(doc.progress ?? 0), {})
      await increment('studyItems', String(doc.itemId), 'minutesTotal', Number(doc.minutes ?? 0), {})
    }
  }

  return (
    <Card
      title={`Lixeira (${deleted.length})`}
      subtitle="Nada é apagado de verdade. Itens excluídos ficam aqui e podem voltar."
      action={<Button variant="ghost" className="text-xs" onClick={() => setOpen(!open)}>{open ? 'Fechar' : 'Ver'}</Button>}
    >
      {open &&
        deleted.slice(0, 50).map(({ col, doc }) => (
          <Row key={`${col}-${doc.id}`}>
            <div className="flex items-center justify-between gap-2">
              <span>
                {COL_LABEL[col] ?? col}
                {doc.date ? ` · ${fmtShortDate(doc.date)}` : ''}
                {'amount' in doc && doc.amount ? ` · R$ ${doc.amount}` : ''}
              </span>
              <Button variant="ghost" className="text-xs py-1" onClick={() => undo(col, doc as Record<string, unknown> & { id: string })}>
                Restaurar
              </Button>
            </div>
          </Row>
        ))}
      {open && deleted.length === 0 && <Badge tone="neutral">Lixeira vazia</Badge>}
    </Card>
  )
}
