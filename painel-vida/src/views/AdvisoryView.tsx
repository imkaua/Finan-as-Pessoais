import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, useLive } from '../data/DataContext'
import type { AdvisoryMonth } from '../data/types'
import { addMonthKey, fmtMonth, fmtShortDate, monthKey } from '../lib/dates'
import { reviewCoverage, sum } from '../lib/calc'
import { axisMoney, brl, brlCompact } from '../lib/format'
import { Badge, Button, Card, Empty, Field, Grid, Muted, NumberField, Row, Stat, TextInput } from '../components/ui'
import { MEETING_KINDS } from '../components/forms'

const tooltipStyle = { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

export function AdvisoryView() {
  const { today, settings, save } = useData()
  const [month, setMonth] = useState(() => monthKey(today))
  const advisory = useLive('advisoryMonths')
  const meetings = useLive('meetings')
  const reviews = useLive('reviews')
  const clients = useLive('clients')
  const counters = useLive('counters')
  const contents = useLive('contents')
  const plans = useLive('months')

  const am = advisory.find((a) => a.id === month)
  const inMonth = <T extends { date: string }>(xs: T[]) => xs.filter((x) => monthKey(x.date) === month)
  const cov = reviewCoverage(month, clients, reviews)
  const net = (am?.captacao ?? 0) - (am?.resgates ?? 0)
  const monthMeetings = inMonth(meetings)
  const proactive = sum(inMonth(counters).map((c) => c.proactive))
  const monthContents = inMonth(contents)

  // Comissão gerada (competência) x recebido nas Finanças no mês seguinte (caixa).
  const nextPlan = plans.find((p) => p.id === addMonthKey(month, 1))
  const receivedNext = nextPlan ? sum(Object.values(nextPlan.incomeReceived ?? {})) : null

  const setField = (field: keyof Pick<AdvisoryMonth, 'captacao' | 'resgates' | 'aum' | 'comissao'>, v: number | null) =>
    save('advisoryMonths', { id: month, date: `${month}-01`, [field]: v })

  const last12 = Array.from({ length: 12 }, (_, i) => addMonthKey(monthKey(today), i - 11))
  const aumSeries = last12.map((k) => ({ month: fmtMonth(k, false), aum: advisory.find((a) => a.id === k)?.aum ?? null }))
  const netSeries = last12.map((k) => {
    const a = advisory.find((x) => x.id === k)
    return { month: fmtMonth(k, false), liquida: a ? (a.captacao ?? 0) - (a.resgates ?? 0) : 0 }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setMonth(addMonthKey(month, -1))} aria-label="Mês anterior">
          ←
        </Button>
        <p className="text-base font-semibold">{fmtMonth(month)}</p>
        <Button variant="secondary" onClick={() => setMonth(addMonthKey(month, 1))} aria-label="Próximo mês">
          →
        </Button>
      </div>

      <Grid cols={4}>
        <Stat label="Captação líquida" value={brlCompact(net)} tone={net < 0 ? 'critical' : 'neutral'} hint={`Captado ${brlCompact(am?.captacao ?? 0)} · resgates ${brlCompact(am?.resgates ?? 0)}`} />
        <Stat label="Patrimônio sob assessoria" value={am?.aum ? brlCompact(am.aum) : '—'} hint="Informado no fim do mês" />
        <Stat label="Reuniões" value={monthMeetings.length} hint={MEETING_KINDS.map((k) => `${k.label} ${monthMeetings.filter((m) => m.kind === k.value).length}`).filter((t) => !t.endsWith(' 0')).join(' · ') || 'nenhuma'} />
        <Stat label="Revisões" value={`${cov.reviewed}/${cov.base}`} hint={`${Math.round(cov.pct * 100)}% dos clientes ativos`} />
      </Grid>

      <Grid cols={2}>
        <Stat label="Mensagens proativas" value={proactive} hint="Contatos que você iniciou no mês" />
        <Stat label="Conteúdos publicados" value={monthContents.length} hint={settings.contentPlatforms.map((p) => `${p.split(' ')[0]} ${monthContents.filter((c) => c.platform === p).length}`).join(' · ')} />
      </Grid>

      <Card title="Números do mês" subtitle="Preencha no fechamento. Valores de competência (o que foi gerado no mês).">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Captação bruta">
            <NumberField commitOnBlur prefix="R$" value={am?.captacao} onChange={(v) => setField('captacao', v)} />
          </Field>
          <Field label="Resgates / saídas">
            <NumberField commitOnBlur prefix="R$" value={am?.resgates} onChange={(v) => setField('resgates', v)} />
          </Field>
          <Field label="Patrimônio total (AUM)">
            <NumberField commitOnBlur prefix="R$" value={am?.aum} onChange={(v) => setField('aum', v)} />
          </Field>
          <Field label="Comissão gerada">
            <NumberField commitOnBlur prefix="R$" value={am?.comissao} onChange={(v) => setField('comissao', v)} />
          </Field>
        </div>
        {am?.comissao ? (
          <Muted className="mt-3">
            Comissão gerada é competência; o que cai na conta vai em Finanças → Receitas (normalmente no mês seguinte, e não é
            somado de novo aqui).
            {receivedNext !== null && ` Recebido em ${fmtMonth(addMonthKey(month, 1))}: ${brl(receivedNext)}.`}
          </Muted>
        ) : null}
      </Card>

      {!last12.some((k) => advisory.some((a) => a.id === k)) ? (
        <Card title="Evolução">
          <Empty>Preencha os números do mês para ver a evolução do patrimônio e da captação.</Empty>
        </Card>
      ) : (
      <>
      <Card title="Patrimônio sob assessoria — 12 meses">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aumSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} minTickGap={12} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => axisMoney(v)} />
              <Tooltip formatter={(v) => [brl(Number(v)), 'AUM']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="aum" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Captação líquida — 12 meses">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={netSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--baseline)' }} minTickGap={12} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => axisMoney(v)} />
              <Tooltip formatter={(v) => [brl(Number(v)), 'Líquida']} contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="liquida" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      </>
      )}

      <ClientsCard month={month} reviewedIds={cov.reviewedIds} />
    </div>
  )
}

function ClientsCard({ month, reviewedIds }: { month: string; reviewedIds: Set<string> }) {
  const { today, save } = useData()
  const clients = useLive('clients')
  const [alias, setAlias] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const active = clients.filter((c) => !c.inactiveSince).sort((a, b) => a.alias.localeCompare(b.alias))
  const inactive = clients.filter((c) => c.inactiveSince)

  return (
    <Card title="Clientes ativos" subtitle={`Use só apelido ou código — sem nome completo, CPF ou patrimônio (LGPD e compliance). Revisados em ${fmtMonth(month)} marcados com ✓.`}>
      {active.length === 0 && <Empty>Nenhum cliente cadastrado.</Empty>}
      {active.map((c) => (
        <Row key={c.id}>
          <div className="flex items-center justify-between gap-2">
            <span>
              {c.alias} <span style={{ color: 'var(--text-muted)' }}>· desde {fmtShortDate(c.since)}</span>
            </span>
            <div className="flex items-center gap-2">
              {reviewedIds.has(c.id) ? <Badge tone="good">revisado</Badge> : <Badge tone="neutral">pendente</Badge>}
              <Button
                variant="ghost"
                className="text-xs py-1"
                onClick={() => {
                  if (confirm(`Marcar ${c.alias} como ex-cliente a partir de hoje? O histórico continua.`)) save('clients', { id: c.id, inactiveSince: today })
                }}
              >
                Encerrar
              </Button>
            </div>
          </div>
        </Row>
      ))}
      <div className="flex gap-2 mt-3">
        <TextInput value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Apelido do cliente" />
        <Button
          disabled={!alias.trim()}
          onClick={() => {
            save('clients', { alias: alias.trim(), since: today, date: today })
            setAlias('')
          }}
        >
          Adicionar
        </Button>
      </div>
      {inactive.length > 0 && (
        <div className="mt-3">
          <Button variant="ghost" className="text-xs" onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? 'Ocultar' : 'Ver'} ex-clientes ({inactive.length})
          </Button>
          {showInactive &&
            inactive.map((c) => (
              <Row key={c.id}>
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {c.alias} <span style={{ color: 'var(--text-muted)' }}>· saiu em {fmtShortDate(c.inactiveSince!)}</span>
                  </span>
                  <Button variant="ghost" className="text-xs py-1" onClick={() => save('clients', { id: c.id, inactiveSince: null })}>
                    Reativar
                  </Button>
                </div>
              </Row>
            ))}
        </div>
      )}
    </Card>
  )
}
