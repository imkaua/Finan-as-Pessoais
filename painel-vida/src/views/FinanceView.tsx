import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, useLive } from '../data/DataContext'
import type { BoxEventKind, MonthPlan } from '../data/types'
import { addMonthKey, fmtMonth, fmtShortDate, monthKey } from '../lib/dates'
import { boxBalance, budgetExpenses, cardBill, monthBudget, normalizeMonthPlan, monthsToGoal, projectBoxes, sum } from '../lib/calc'
import { axisMoney, brl } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Grid, Muted, NumberField, Progress, Row, Segmented, Select, Stat, TextInput } from '../components/ui'

type Sub = 'mes' | 'caixinhas' | 'projecao'

export function FinanceView() {
  const [sub, setSub] = useState<Sub>('mes')
  return (
    <div className="space-y-4">
      <Segmented
        value={sub}
        onChange={setSub}
        options={[
          { value: 'mes', label: 'Mês' },
          { value: 'caixinhas', label: 'Caixinhas' },
          { value: 'projecao', label: 'Projeção' },
        ]}
      />
      {sub === 'mes' && <MonthSection />}
      {sub === 'caixinhas' && <BoxesSection />}
      {sub === 'projecao' && <ProjectionSection />}
    </div>
  )
}

function MonthNav({ month, onMonth }: { month: string; onMonth: (m: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" onClick={() => onMonth(addMonthKey(month, -1))} aria-label="Mês anterior">
        ←
      </Button>
      <p className="text-base font-semibold">{fmtMonth(month)}</p>
      <Button variant="secondary" onClick={() => onMonth(addMonthKey(month, 1))} aria-label="Próximo mês">
        →
      </Button>
    </div>
  )
}

function MonthSection() {
  const { today, settings, save, remove } = useData()
  const [month, setMonth] = useState(() => monthKey(today))
  const months = useLive('months')
  const expenses = useLive('expenses')
  const boxEvents = useLive('boxEvents')
  const plan = normalizeMonthPlan(month, months.find((m) => m.id === month))
  const prevRaw = months.find((m) => m.id === addMonthKey(month, -1))
  const prevPlan = prevRaw ? normalizeMonthPlan(prevRaw.id, prevRaw) : undefined
  const b = monthBudget(month, settings, plan, expenses)
  const bill = cardBill(expenses, month, settings.card)
  const aportes = sum(boxEvents.filter((e) => e.kind === 'aporte' && monthKey(e.date) === month).map((e) => e.amount))
  const isPast = month < monthKey(today)
  const spent = isPast ? b.actualTotal : Math.max(b.actualTotal, b.plannedTotal)
  const surplus = b.incomeExpected - spent
  const surplusConservative = b.incomeConservative - spent
  const plannedAportes = sum(useLive('boxes').filter((x) => !x.archived).map((x) => x.monthlyPlan))

  const patch = (field: keyof Pick<MonthPlan, 'planned' | 'fixedActual' | 'incomeForecast' | 'incomeReceived'>, id: string, value: number | null) =>
    save('months', { id: month, date: `${month}-01`, [field]: { [id]: value } } as Partial<MonthPlan> & { id: string })

  const copyPrevious = () => {
    if (!prevPlan) return
    save('months', {
      id: month,
      date: `${month}-01`,
      planned: { ...prevPlan.planned },
      incomeForecast: { ...prevPlan.incomeForecast },
    })
  }

  const launched = budgetExpenses(expenses, month).sort((a, b2) => (a.date < b2.date ? 1 : -1))
  const cat = (id: string) => settings.categories.find((c) => c.id === id)?.name ?? id
  const planEmpty = Object.keys(plan.planned).length === 0 && Object.keys(plan.incomeForecast).length === 0

  return (
    <div className="space-y-4">
      <MonthNav month={month} onMonth={setMonth} />
      {planEmpty && prevPlan && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm">Mês sem previsão. Quer partir da previsão de {fmtMonth(prevPlan.id)}?</p>
            <Button onClick={copyPrevious}>Copiar previsão</Button>
          </div>
        </Card>
      )}

      <Grid cols={4}>
        <Stat label="Receita esperada" value={brl(b.incomeExpected)} hint={`Conservadora: ${brl(b.incomeConservative)}`} />
        <Stat label={isPast ? 'Gasto realizado' : 'Gastos do mês'} value={brl(spent)} hint={`Previsto ${brl(b.plannedTotal)} · realizado ${brl(b.actualTotal)}`} />
        <Stat label="Sobra" value={brl(surplus)} tone={surplus < 0 ? 'critical' : 'good'} hint={`Cenário conservador: ${brl(surplusConservative)}`} />
        <Stat label="Fatura que vence no mês" value={brl(bill)} hint={`Fecha dia ${settings.card.closingDay}, vence dia ${settings.card.dueDay}`} />
      </Grid>

      <Card title="Fechamento do mês" subtitle="Receita − gastos = sobra → caixinhas → sobra livre">
        <div className="text-sm space-y-1 tabular-nums">
          <div className="flex justify-between"><span>Receita esperada</span><span>{brl(b.incomeExpected)}</span></div>
          <div className="flex justify-between"><span>− Gastos</span><span>{brl(spent)}</span></div>
          <div className="flex justify-between font-medium"><span>= Sobra</span><span>{brl(surplus)}</span></div>
          <div className="flex justify-between"><span>− Aportes registrados nas caixinhas</span><span>{brl(aportes)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1" style={{ borderColor: 'var(--border)' }}>
            <span>= Sobra livre</span><span>{brl(surplus - aportes)}</span>
          </div>
        </div>
        {!isPast && surplusConservative < 0 && (
          <div className="mt-3">
            <Badge tone="critical">No cenário conservador (sem as comissões ainda não recebidas) o mês fecha negativo.</Badge>
          </div>
        )}
        {!isPast && plannedAportes > 0 && surplusConservative >= 0 && plannedAportes > surplusConservative && (
          <div className="mt-3">
            <Badge tone="warning">
              Aportes planejados ({brl(plannedAportes)}) maiores que a sobra no cenário conservador — a projeção das caixinhas pode estar otimista.
            </Badge>
          </div>
        )}
      </Card>

      <Card title="Receitas" subtitle="Previsto x recebido. Fonte variável só entra no cenário conservador quando recebida.">
        <div className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-2 items-center text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Fonte</span><span>Previsto</span><span>Recebido</span>
        </div>
        {settings.incomeSources
          .filter((s) => !s.archived || plan.incomeForecast?.[s.id] || plan.incomeReceived?.[s.id])
          .map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-2 items-center py-1">
              <span className="text-sm leading-tight min-w-0 break-words">
                {s.name}
                {s.variable && <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>variável</span>}
              </span>
              <NumberField commitOnBlur value={plan.incomeForecast?.[s.id]} onChange={(v) => patch('incomeForecast', s.id, v)} />
              <NumberField commitOnBlur placeholder="—" value={plan.incomeReceived?.[s.id]} onChange={(v) => patch('incomeReceived', s.id, v)} />
            </div>
          ))}
      </Card>

      <Card title="Orçamento por categoria" subtitle="Fixas: o previsto conta como pago (corrija se o valor real mudou). Variáveis: soma dos gastos registrados.">
        <div className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-2 items-center text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Categoria</span><span>Previsto</span><span>Realizado</span>
        </div>
        {b.rows.map((r) => (
          <div key={r.categoryId} className="py-1.5">
            <div className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-2 items-center">
              <span className="text-sm leading-tight min-w-0 break-words">
                {r.name}
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{r.kind === 'fixo' ? 'fixa' : 'variável'}</span>
              </span>
              <NumberField commitOnBlur value={plan.planned?.[r.categoryId]} onChange={(v) => patch('planned', r.categoryId, v)} />
              {r.kind === 'fixo' && !launched.some((e) => e.categoryId === r.categoryId) ? (
                <NumberField
                  commitOnBlur
                  placeholder={String(r.planned)}
                  value={plan.fixedActual?.[r.categoryId]}
                  onChange={(v) => patch('fixedActual', r.categoryId, v)}
                />
              ) : (
                <span className="text-sm tabular-nums px-3">{brl(r.actual)}</span>
              )}
            </div>
            {r.planned > 0 && (
              <div className="mt-1">
                <Progress value={r.actual} max={r.planned} color={r.actual > r.planned ? 'var(--status-critical)' : 'var(--series-1)'} />
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card title="Gastos registrados no mês">
        {launched.length === 0 ? (
          <Empty>Nenhum gasto registrado. Use a aba Hoje.</Empty>
        ) : (
          launched.map((e) => (
            <Row key={e.id} onDelete={e.appointmentId ? undefined : () => remove('expenses', e.id)}>
              <span className="tabular-nums">{fmtShortDate(e.date)}</span> · {brl(e.amount, true)} · {cat(e.categoryId)}
              {e.description ? ` — ${e.description}` : ''}
              <span style={{ color: 'var(--text-muted)' }}> · {e.payment === 'cartao' ? 'cartão' : 'pix'}</span>
            </Row>
          ))
        )}
      </Card>
    </div>
  )
}

function BoxesSection() {
  const { today, settings, save } = useData()
  const boxes = useLive('boxes')
  const events = useLive('boxEvents')
  const expenses = useLive('expenses')
  const [name, setName] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const visible = boxes.filter((b) => showArchived || !b.archived).sort((a, b) => a.name.localeCompare(b.name))
  const total = sum(boxes.filter((b) => !b.archived).map((b) => boxBalance(b.id, events, expenses, today).balance))

  return (
    <div className="space-y-4">
      <Grid cols={2}>
        <Stat label="Total guardado" value={brl(total)} hint="Soma das caixinhas ativas" />
        <Stat label="Aporte mensal planejado" value={brl(sum(boxes.filter((b) => !b.archived).map((b) => b.monthlyPlan)))} hint={`Rendimento estimado: ${settings.boxYieldPct}% a.m.`} />
      </Grid>
      {visible.map((b) => (
        <BoxCard key={b.id} boxId={b.id} />
      ))}
      <Card title="Nova caixinha">
        <div className="flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Reserva de emergência" />
          <Button
            disabled={!name.trim()}
            onClick={async () => {
              const id = await save('boxes', { name: name.trim(), goal: 0, monthlyPlan: 0 })
              await save('boxEvents', { boxId: id, date: today, kind: 'saldo', amount: 0 })
              setName('')
            }}
          >
            Criar
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostrar arquivadas
        </label>
      </Card>
    </div>
  )
}

function BoxCard({ boxId }: { boxId: string }) {
  const { today, settings, save, remove } = useData()
  const box = useLive('boxes').find((b) => b.id === boxId)!
  const events = useLive('boxEvents')
  const expenses = useLive('expenses')
  const [kind, setKind] = useState<BoxEventKind>('aporte')
  const [amount, setAmount] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const bal = boxBalance(box.id, events, expenses, today)
  const mtg = monthsToGoal(bal.balance, box.goal, box.monthlyPlan, settings.boxYieldPct)
  const history = [
    ...events.filter((e) => e.boxId === box.id).map((e) => ({ id: e.id, date: e.date, label: e.kind === 'saldo' ? 'Saldo conferido' : e.kind === 'aporte' ? 'Aporte' : 'Retirada', amount: e.amount, col: 'boxEvents' as const })),
    ...expenses.filter((e) => e.origin === box.id).map((e) => ({ id: e.id, date: e.date, label: `Gasto: ${e.description || 'sem descrição'}`, amount: e.amount, col: 'expenses' as const })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))
  const stale = bal.daysSinceCheck === null || bal.daysSinceCheck > 45

  return (
    <Card
      title={`${box.name}${box.archived ? ' (arquivada)' : ''}`}
      subtitle={bal.anchorDate ? `Saldo conferido em ${fmtShortDate(bal.anchorDate)}` : 'Saldo nunca conferido'}
      action={<span className="text-lg font-semibold tabular-nums">{brl(bal.balance)}</span>}
    >
      {box.goal > 0 && (
        <div className="mb-3">
          <Progress value={bal.balance} max={box.goal} />
          <Muted className="mt-1">
            {Math.round((bal.balance / box.goal) * 100)}% de {brl(box.goal)}
            {mtg === 0 ? ' · meta atingida ✓' : mtg ? ` · faltam ~${mtg} ${mtg === 1 ? 'mês' : 'meses'} no ritmo planejado` : ' · sem aporte planejado, a meta não chega'}
          </Muted>
        </div>
      )}
      {stale && !box.archived && (
        <div className="mb-3">
          <Badge tone="warning">Confira o saldo real no banco (mais de 45 dias). Rendimentos e esquecimentos fazem o valor calculado se desviar.</Badge>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <Select
          value={kind}
          onChange={setKind}
          options={[
            { value: 'aporte', label: 'Aporte' },
            { value: 'retirada', label: 'Retirada' },
            { value: 'saldo', label: 'Conferir saldo real' },
          ]}
        />
        <div className="w-36">
          <NumberField value={amount} onChange={setAmount} prefix="R$" />
        </div>
        <Button
          disabled={amount === null || amount < 0 || (kind !== 'saldo' && amount === 0)}
          onClick={async () => {
            await save('boxEvents', { boxId: box.id, date: today, kind, amount: amount ?? 0 })
            setAmount(null)
          }}
        >
          Registrar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(!open)}>
          {open ? 'Fechar' : 'Detalhes'}
        </Button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta">
              <NumberField commitOnBlur value={box.goal} onChange={(v) => save('boxes', { id: box.id, goal: v ?? 0 })} prefix="R$" />
            </Field>
            <Field label="Aporte mensal planejado">
              <NumberField commitOnBlur value={box.monthlyPlan} onChange={(v) => save('boxes', { id: box.id, monthlyPlan: v ?? 0 })} prefix="R$" />
            </Field>
          </div>
          <div>
            {history.slice(0, 30).map((h) => (
              <Row key={h.id} onDelete={h.col === 'boxEvents' ? () => remove('boxEvents', h.id) : undefined}>
                <span className="tabular-nums">{fmtShortDate(h.date)}</span> · {h.label} · {brl(h.amount, true)}
              </Row>
            ))}
          </div>
          <Button variant="ghost" onClick={() => save('boxes', { id: box.id, archived: !box.archived })}>
            {box.archived ? 'Reativar caixinha' : 'Arquivar caixinha'}
          </Button>
        </div>
      )}
    </Card>
  )
}

function ProjectionSection() {
  const { today, settings, saveSettings, settingsSynced } = useData()
  const boxes = useLive('boxes')
  const events = useLive('boxEvents')
  const expenses = useLive('expenses')
  const [horizon, setHorizon] = useState<'12' | '24' | '60'>('12')
  const balances: Record<string, number> = {}
  for (const b of boxes) balances[b.id] = boxBalance(b.id, events, expenses, today).balance
  const points = projectBoxes(boxes, balances, settings.boxYieldPct, monthKey(today), Number(horizon))
  const chart = points.map((p) => ({ month: fmtMonth(p.month, false), total: Math.round(p.total) }))
  const last = points[points.length - 1]
  const active = boxes.filter((b) => !b.archived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Segmented
          value={horizon}
          onChange={setHorizon}
          options={[
            { value: '12', label: '12 meses' },
            { value: '24', label: '2 anos' },
            { value: '60', label: '5 anos' },
          ]}
        />
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Rendimento
          <div className="w-24">
            {settingsSynced ? (
              <NumberField commitOnBlur value={settings.boxYieldPct} onChange={(v) => saveSettings({ boxYieldPct: v ?? 0 })} suffix="%" />
            ) : (
              <span className="tabular-nums">{settings.boxYieldPct}%</span>
            )}
          </div>
          a.m.
        </div>
      </div>
      <Grid cols={2}>
        <Stat label="Guardado hoje" value={brl(points[0].total)} />
        <Stat label={`Em ${fmtMonth(last.month)}`} value={brl(last.total)} hint="Se os aportes planejados acontecerem todo mês" />
      </Grid>
      <Card title="Total guardado projetado">
        {active.length === 0 ? (
          <Empty>Crie caixinhas e defina o aporte mensal para ver a projeção.</Empty>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => axisMoney(v)} />
                <Tooltip
                  formatter={(v) => [brl(Number(v)), 'Total']}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area type="monotone" dataKey="total" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card title="Por caixinha">
        {active.map((b) => {
          const mtg = monthsToGoal(balances[b.id], b.goal, b.monthlyPlan, settings.boxYieldPct)
          return (
            <Row key={b.id}>
              <div className="flex justify-between gap-2">
                <span>{b.name}</span>
                <span className="tabular-nums">
                  {brl(balances[b.id])} → {brl(last.perBox[b.id] ?? 0)}
                </span>
              </div>
              {b.goal > 0 && (
                <Muted>
                  Meta {brl(b.goal)}: {mtg === 0 ? 'atingida ✓' : mtg ? `${fmtMonth(addMonthKey(monthKey(today), mtg))}` : 'não chega sem aporte'}
                </Muted>
              )}
            </Row>
          )
        })}
      </Card>
      <Muted>
        Projeção = saldo atual × (1 + rendimento) + aporte planejado, mês a mês. Não considera inflação nem imposto. O ponto de
        partida é o último saldo conferido — confira as caixinhas uma vez por mês.
      </Muted>
    </div>
  )
}
