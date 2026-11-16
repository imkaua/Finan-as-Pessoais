import { useStore } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Card, Empty, Kpi, Ring } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { AporteForm, ObjetivoForm } from '../components/forms'
import { BRL, plural } from '../lib/format'
import { fmtDate } from '../lib/dates'
import { calcObjetivo } from '../lib/finance'
import type { Objetivo } from '../types'

export function Objetivos() {
  const { today } = useApp()
  const { open } = useModal()
  const objetivos = useStore((s) => s.objetivos)
  const gs = objetivos.map((g) => ({ g, c: calcObjetivo(g, today) }))
  const andamento = gs.filter((x) => x.c.status === 'andamento')

  return (
    <>
      <div className="grid-k4">
        <Kpi label="Total guardado" value={BRL(gs.reduce((s, x) => s + x.g.acumulado, 0))} sub={plural(gs.length, 'objetivo', 'objetivos')} />
        <Kpi label="Soma das metas" value={BRL(gs.reduce((s, x) => s + x.g.valor, 0))} sub={`Faltam ${BRL(gs.reduce((s, x) => s + x.c.falta, 0))}`} />
        <Kpi label="Aporte mensal necessário" value={BRL(andamento.reduce((s, x) => s + x.c.mensal, 0))} sub="Soma dos mínimos deste mês" />
        <Kpi label="Concluídos" value={String(gs.filter((x) => x.c.status === 'concluido').length)} sub="Metas já atingidas" />
      </div>
      <div className="flex justify-end mb-4">
        <button className="btn" onClick={() => open(<ObjetivoForm />)}>
          <Icon name="plus" size={16} stroke={2.2} />
          Novo objetivo
        </button>
      </div>
      {gs.length ? (
        <div className="grid-goals">
          {gs.map(({ g }) => (
            <GoalCard key={g.id} g={g} />
          ))}
        </div>
      ) : (
        <Card>
          <Empty>Crie seu primeiro objetivo: reserva de emergência, viagem, entrada de um imóvel…</Empty>
        </Card>
      )}
    </>
  )
}

function GoalCard({ g }: { g: Objetivo }) {
  const { today } = useApp()
  const { open } = useModal()
  const c = calcObjetivo(g, today)
  const st = {
    concluido: { cls: 'ok', icon: 'ok', txt: 'Objetivo concluído' },
    encerrado: { cls: 'bad', icon: 'alert', txt: `Prazo encerrado · faltam ${BRL(c.falta)}` },
    andamento: { cls: 'acc', icon: 'coin', txt: `Faltam ${BRL(c.falta)}` },
  }[c.status]
  const ultimo = g.aportes[g.aportes.length - 1]

  return (
    <article className="card goal">
      <div className="goal-h">
        <span className="gi">
          <Icon name={g.icone} size={19} />
        </span>
        <h3>{g.nome}</h3>
        <span className="prazo">{c.status === 'concluido' ? 'Concluído' : c.prazo}</span>
      </div>
      <div className="goal-mid">
        <Ring value={c.pct} size={108} stroke={12} />
        <div className="goal-min">
          <div className="l">Mínimo mensal</div>
          <div className="v num">{c.status === 'andamento' ? (
              <>
                {BRL(c.mensal)}
                <small>/mês</small>
              </>
            ) : (
              '—'
            )}</div>
          <div className="d">
            Data final <b className="num">{fmtDate(g.fim)}</b>
          </div>
          {c.status === 'andamento' && <div className="d">{plural(c.parcelas, 'aporte', 'aportes')} até lá</div>}
        </div>
      </div>
      <div className="goal-lines">
        <div>
          <span>
            <i className="dot" style={{ background: 'var(--accent)' }} />
            Acumulado
          </span>
          <b className="a num">{BRL(g.acumulado)}</b>
        </div>
        <div>
          <span>
            <i className="dot" style={{ background: 'var(--muted)' }} />
            Objetivo
          </span>
          <b className="o num">{BRL(g.valor)}</b>
        </div>
      </div>
      <div className={`gstatus ${st.cls}`}>
        <span className="ic">
          <Icon name={st.icon} size={12} stroke={2.4} />
        </span>
        <span>
          {st.txt}
          {ultimo && (
            <>
              {' · '}último {ultimo.valor < 0 ? 'resgate' : 'aporte'} {fmtDate(ultimo.data)}
            </>
          )}
        </span>
      </div>
      {g.notas && <p className="text-muted" style={{ margin: 0, fontSize: 12.5 }}>{g.notas}</p>}
      <div className="goal-foot">
        <button className="btn sm" onClick={() => open(<AporteForm obj={g} />)}>
          <Icon name="plus" size={14} stroke={2.2} />
          Registrar aporte
        </button>
        <button className="btn ghost sm" onClick={() => open(<ObjetivoForm obj={g} />)}>
          <Icon name="edit" size={14} />
          Editar
        </button>
      </div>
    </article>
  )
}
