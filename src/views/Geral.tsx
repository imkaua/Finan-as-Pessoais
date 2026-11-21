import { useEffect, useMemo, useState } from 'react'
import { Bar as RBar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Bar, Card, Chip, Empty, Kpi, Legend, Note } from '../components/ui'
import { RendaForm, TotaisForm } from '../components/forms'
import { BRL, BRLk, pct, plural } from '../lib/format'
import { MESES, fmtDate, ymLabel, ymShort } from '../lib/dates'
import {
  calcObjetivo,
  categoriasDoMes,
  itensPagamento,
  proximosMeses,
  rendaDoMes,
  resumoMes,
  statusPagamento,
  type TomStatus,
} from '../lib/finance'
import { getDados } from '../store'

const SERIES = [
  { key: 'tFix', label: 'Fixos', color: 'var(--c-fixo)' },
  { key: 'tAss', label: 'Assinaturas', color: 'var(--c-ass)' },
  { key: 'varPrevisto', label: 'Variáveis', color: 'var(--c-var)' },
] as const
const COR_INVEST = 'var(--c-obj)'

const TOM_CAT: Record<string, TomStatus> = { ok: 'ok', atencao: 'warn', estourou: 'bad', 'sem-limite': 'bad' }

export function Geral() {
  const { ym, today, go } = useApp()
  const { open } = useModal()
  const store = useStore()
  const dados = getDados(store)
  const r = resumoMes(dados, ym, today)
  const itens = itensPagamento(dados, ym)
  const pend = itens.filter((p) => !p.pago)
  const totPend = pend.reduce((s, p) => s + p.valor, 0)
  const atrasados = pend.filter((p) => statusPagamento(p, today).atrasado).length
  const base = Math.max(r.renda, r.comprometido) || 1
  const segs = [
    ...SERIES.map((s) => ({ label: s.label, color: s.color, valor: r[s.key] })),
    { label: 'Investimentos', color: COR_INVEST, valor: Math.max(0, r.investimentos) },
  ]
  const cats = categoriasDoMes(r)
    .filter((c) => c.limite > 0 || c.gasto > 0)
    .sort((a, b) => (b.limite ? b.gasto / b.limite : Infinity) - (a.limite ? a.gasto / a.limite : Infinity))
    .slice(0, 5)
  const objetivos = store.objetivos.map((g) => ({ g, c: calcObjetivo(g, today) })).filter((x) => x.c.status !== 'concluido')
  const rendaMes = rendaDoMes(store, ym)
  const fontes = store.fontesRenda.filter((f) => (rendaMes[f.id] ?? 0) > 0)
  const mesNome = MESES[Number(ym.slice(5)) - 1].toLowerCase()

  return (
    <>
      <div className="grid-k4">
        <Kpi
          label="Renda prevista"
          icon="coin"
          value={BRL(r.renda)}
          sub={fontes.length > 1 ? `${plural(fontes.length, 'fonte', 'fontes')} · toque para editar` : 'Toque para editar'}
          onClick={() => open(<RendaForm ym={ym} />)}
        />
        <Kpi label="Comprometido" icon="wallet" value={BRL(r.comprometido)} sub={`${pct(r.comprometido / (r.renda || 1))} da renda`} />
        <Kpi
          label="Investimentos"
          icon="coin"
          value={<span className={r.investimentos < 0 ? 'neg' : 'pos'}>{BRL(r.investimentos)}</span>}
          sub={r.investimentos < 0 ? 'Compromissos acima da renda' : `${pct(r.investimentos / (r.renda || 1))} da renda`}
        />
        <Kpi
          label="A pagar no mês"
          icon="receipt"
          value={BRL(totPend)}
          sub={
            <>
              {plural(pend.length, 'pendente', 'pendentes')}
              {atrasados > 0 && <b className="neg"> · {plural(atrasados, 'atrasado', 'atrasados')}</b>}
            </>
          }
          onClick={() => go('pagamentos')}
        />
      </div>

      <div className="grid-c2">
        <Card title={`Para onde vai a renda de ${mesNome}`} sub={BRL(r.renda)}>
          <div className="stack" role="img" aria-label="Distribuição da renda">
            {segs
              .filter((s) => s.valor > 0)
              .map((s) => (
                <i key={s.label} style={{ width: `${(s.valor / base) * 100}%`, background: s.color }} title={`${s.label}: ${BRL(s.valor)}`} />
              ))}
          </div>
          <Legend items={segs.map((s) => ({ label: s.label, color: s.color, value: BRL(s.valor) }))} />
          {fontes.length > 1 && (
            <div className="legend" style={{ marginTop: 10 }}>
              {fontes.map((f) => (
                <span key={f.id}>
                  {f.nome} <b className="num">{BRL(rendaMes[f.id])}</b>
                </span>
              ))}
            </div>
          )}
          {r.investimentos < 0 && (
            <Note tom="bad" icon="alert" className="mt-3.5">
              Os compromissos passam a renda em {BRL(-r.investimentos)}. Reveja os limites dos gastos variáveis deste mês.
            </Note>
          )}
        </Card>

        <Card title="Próximos pagamentos" action={<button className="btn ghost sm" onClick={() => go('pagamentos')}>Ver todos</button>}>
          <div className="rows">
            {pend.slice(0, 5).map((p) => {
              const st = statusPagamento(p, today)
              return (
                <div className="row r-mini" key={p.key}>
                  <div>
                    <div className="t">{p.desc}</div>
                    <div className="m">
                      {p.tipo} · {fmtDate(p.venc)}
                    </div>
                  </div>
                  <Chip tom={st.tom}>{st.label}</Chip>
                  <div className="val num">{BRL(p.valor)}</div>
                </div>
              )
            })}
            {!pend.length && <Empty>{itens.length ? 'Tudo pago neste mês.' : 'Nenhum pagamento neste mês.'}</Empty>}
          </div>
        </Card>
      </div>

      <div className="grid-c2e">
        <Card
          title="Gastos variáveis"
          sub={`${BRL(r.gastoVar)} de ${BRL(r.limiteTotal)}`}
          action={
            <button className="btn ghost sm" onClick={() => open(<TotaisForm />)}>
              Atualizar totais
            </button>
          }
        >
          <div className="rows">
            {cats.map((c) => (
              <div key={c.nome} style={{ padding: '8px 0' }}>
                <div className="flex justify-between mb-1.5 text-[13px] gap-2">
                  <b>{c.nome}</b>
                  <span className={`num ${c.status === 'estourou' ? 'neg' : ''}`}>
                    {BRL(c.gasto)} <span className="text-muted">/ {c.limite ? BRL(c.limite) : 'sem limite'}</span>
                  </span>
                </div>
                <Bar value={c.limite ? c.gasto / c.limite : 1} tom={TOM_CAT[c.status]} />
              </div>
            ))}
            {!cats.length && <Empty>Defina limites em Gastos variáveis.</Empty>}
          </div>
        </Card>

        <Card title="Objetivos em andamento" action={<button className="btn ghost sm" onClick={() => go('objetivos')}>Abrir</button>}>
          <div className="rows">
            {objetivos.map(({ g, c }) => (
              <div className="row r-mini" key={g.id}>
                <div>
                  <div className="t">{g.nome}</div>
                  <div className="m">
                    {pct(c.pct)} · até {fmtDate(g.fim)}
                  </div>
                </div>
                {c.status === 'encerrado' ? <Chip tom="bad">Prazo encerrado</Chip> : <Chip tom="acc">{c.prazo}</Chip>}
                <div className="val num">
                  {c.status === 'encerrado' ? BRL(c.falta) : BRL(c.mensal)}
                  <div className="m" style={{ fontWeight: 500 }}>
                    {c.status === 'encerrado' ? 'faltando' : 'por mês'}
                  </div>
                </div>
              </div>
            ))}
            {!objetivos.length && <Empty>Nenhum objetivo em andamento.</Empty>}
          </div>
        </Card>
      </div>

      <Card title="Próximos 6 meses" sub="Compromissos e investimentos contra a renda prevista">
        <Projecao />
      </Card>
    </>
  )
}

interface Ponto {
  ym: string
  label: string
  tFix: number
  tAss: number
  varPrevisto: number
  investPos: number
  renda: number
  topo: number
  investimentos: number
}

function useEstreito(px = 520) {
  const q = `(max-width: ${px}px)`
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

function Projecao() {
  const { ym, today } = useApp()
  const estreito = useEstreito()
  const store = useStore()
  const data: Ponto[] = useMemo(
    () =>
      proximosMeses(getDados(store), ym, today).map((r) => ({
        ym: r.ym,
        label: ymShort(r.ym),
        tFix: r.tFix,
        tAss: r.tAss,
        varPrevisto: r.varPrevisto,
        investPos: Math.max(0, r.investimentos),
        renda: r.renda,
        topo: Math.max(r.renda, r.comprometido),
        investimentos: r.investimentos,
      })),
    [store, ym, today],
  )
  return (
    <>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="38%">
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
            <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tickFormatter={BRLk} tickLine={false} axisLine={false} width={estreito ? 52 : 64} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip content={<ProjTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
            {SERIES.map((s) => (
              <RBar key={s.key} dataKey={s.key} name={s.label} stackId="c" fill={s.color} isAnimationActive={false} />
            ))}
            <RBar dataKey="investPos" name="Investimentos" stackId="c" fill={COR_INVEST} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line dataKey="renda" name="Renda prevista" stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: 'var(--ink)' }} isAnimationActive={false} />
            {/* Série invisível no topo de cada mês (renda ou comprometido), só para o rótulo de investimentos/déficit */}
            <Line dataKey="topo" stroke="none" dot={false} activeDot={false} legendType="none" isAnimationActive={false}>
              <LabelList dataKey="investimentos" content={<InvestLabel compacto={estreito} />} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i className="dot" style={{ background: s.color }} />
            {s.key === 'varPrevisto' ? 'Variáveis (limite)' : s.label}
          </span>
        ))}
        <span>
          <i className="dot" style={{ background: COR_INVEST }} />
          Investimentos
        </span>
        <span>
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" x2="18" y1="3" y2="3" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Renda prevista
        </span>
      </div>
    </>
  )
}

function InvestLabel(props: { x?: number | string; y?: number | string; value?: number | string; compacto?: boolean }) {
  const x = Number(props.x)
  const y = Number(props.y)
  const v = Number(props.value)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(v)) return null
  return (
    <text x={x} y={y - 10} textAnchor="middle" fontSize={props.compacto ? 9.5 : 11} fontWeight={700} fill={v < 0 ? 'var(--bad)' : 'var(--ok)'} className="num">
      {v < 0 ? '−' : '+'}
      {props.compacto ? BRLk(Math.abs(v)).replace('R$ ', '') : BRLk(Math.abs(v))}
    </text>
  )
}

function ProjTooltip({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="card" style={{ padding: '10px 12px', fontSize: 12.5, minWidth: 190 }}>
      <b>{ymLabel(p.ym)}</b>
      {SERIES.map((s) => (
        <div key={s.key} className="flex justify-between gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-muted">
            <i className="dot" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="num">{BRL(p[s.key])}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-line">
        <span className="text-muted">Renda</span>
        <span className="num">{BRL(p.renda)}</span>
      </div>
      <div className="flex justify-between gap-4 mt-1">
        <b className="flex items-center gap-1.5">
          {p.investimentos >= 0 && <i className="dot" style={{ background: COR_INVEST }} />}
          {p.investimentos < 0 ? 'Déficit' : 'Investimentos'}
        </b>
        <b className={`num ${p.investimentos < 0 ? 'neg' : 'pos'}`}>{BRL(p.investimentos)}</b>
      </div>
    </div>
  )
}
