import { useStore, getDados } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Bar, Card, Chip, Empty, Kpi, Note, RowButtons } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { LancamentoForm, LimitesForm, TotaisForm } from '../components/forms'
import { BRL, pct } from '../lib/format'
import { ymLabel, ymShort } from '../lib/dates'
import { categoriasDoMes, resumoMes, ritmoDoMes, type StatusCategoria, type TomStatus } from '../lib/finance'

const CHIP: Record<StatusCategoria, [TomStatus, string]> = {
  ok: ['ok', 'Ok'],
  atencao: ['warn', 'Atenção'],
  estourou: ['bad', 'Estourou'],
  'sem-limite': ['bad', 'Sem limite'],
}

export function Variaveis() {
  const { ym, today, cur } = useApp()
  const { open, confirm } = useModal()
  const store = useStore()
  const r = resumoMes(getDados(store), ym, today)
  const isCur = ym === cur
  const disp = r.limiteTotal - r.gastoVar
  const ritmo = isCur ? ritmoDoMes(r, today) : null
  const pctG = r.limiteTotal ? r.gastoVar / r.limiteTotal : 0
  const cats = categoriasDoMes(r)
  const lancs = [...r.lancamentos].sort((a, b) => b.data.localeCompare(a.data))
  const abrirLimites = () => open(<LimitesForm ym={ym} />)

  return (
    <>
      <div className="grid-k4">
        <Kpi
          label="Limite do mês"
          value={BRL(r.limiteTotal)}
          sub={store.limites[ym] ? 'Ajustado só para este mês · editar' : 'Usando o limite padrão · editar'}
          onClick={abrirLimites}
        />
        <Kpi label="Gasto até agora" value={BRL(r.gastoVar)} sub={`${pct(pctG)} do limite`} />
        <Kpi label="Disponível" value={<span className={disp < 0 ? 'neg' : 'pos'}>{BRL(disp)}</span>} sub={disp < 0 ? 'Limite estourado' : 'Ainda pode gastar'} />
        <Kpi
          label="Por dia até o fim do mês"
          value={ritmo ? BRL(ritmo.porDia) : '—'}
          sub={ritmo ? `${ritmo.diasRestantes} dias restantes (com hoje)` : 'Disponível no mês atual'}
        />
      </div>

      {ritmo && r.limiteTotal > 0 && (
        <Note tom={ritmo.acima ? 'warn' : undefined} icon={ritmo.acima ? 'alert' : 'ok'} className="mb-4">
          {pct(ritmo.mes)} do mês já passou e você usou {pct(ritmo.gasto)} do limite.{' '}
          {ritmo.acima ? 'Ritmo acima do planejado.' : 'Ritmo dentro do planejado.'}
        </Note>
      )}

      {cats.length > 0 ? (
        <div className="grid-cats">
          {cats.map((c) => {
            const [tom, label] = CHIP[c.status]
            const resto = c.limite - c.gasto
            return (
              <div className="card" key={c.nome}>
                <div className="flex justify-between items-center mb-2.5 gap-2">
                  <b className="truncate">{c.nome}</b>
                  <Chip tom={tom}>{label}</Chip>
                </div>
                <div className="num" style={{ fontSize: 19, fontWeight: 800 }}>
                  {BRL(c.gasto)}
                </div>
                <div className="num text-muted mb-2.5" style={{ fontSize: 12.5 }}>
                  {c.limite ? `de ${BRL(c.limite)} · ${resto >= 0 ? `restam ${BRL(resto)}` : `passou ${BRL(-resto)}`}` : 'sem limite definido'}
                </div>
                <Bar value={c.limite ? c.gasto / c.limite : 1} tom={tom} />
                <button className="btn link" style={{ padding: '8px 0 0', fontSize: 12.5 }} onClick={() => open(<TotaisForm foco={c.nome} />)}>
                  Atualizar total
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="mb-4">
          <Empty>
            Nenhum limite definido para {ymLabel(ym).toLowerCase()}.{' '}
            <button className="btn sm" style={{ marginLeft: 8 }} onClick={abrirLimites}>
              Definir limites
            </button>
          </Empty>
        </Card>
      )}

      <Card
        title={`Lançamentos de ${ymLabel(ym).toLowerCase()}`}
        action={
          <div className="actions">
            <button className="btn ghost sm" onClick={abrirLimites}>
              Editar limites
            </button>
            <button className="btn ghost sm" onClick={() => open(<TotaisForm />)}>
              <Icon name="edit" size={15} />
              Atualizar totais
            </button>
            <button className="btn sm" onClick={() => open(<LancamentoForm />)}>
              <Icon name="plus" size={15} stroke={2.2} />
              Novo gasto
            </button>
          </div>
        }
      >
        <div className="rows">
          {lancs.map((l) => (
            <div className="row r-lan" key={l.id}>
              <div className="date">
                <b>{l.data.slice(8)}</b>
                {ymShort(l.mes).slice(0, 3)}
              </div>
              <div>
                <div className="t">{l.desc}</div>
                <div className="m">{l.ajuste ? `${l.categoria} · ajuste pelo total informado` : l.categoria}</div>
              </div>
              <div className="val num">{BRL(l.valor)}</div>
              <RowButtons
                label={l.desc}
                onEdit={() => open(<LancamentoForm lanc={l} />)}
                onDelete={() =>
                  confirm({
                    title: `Excluir “${l.desc}”?`,
                    text: `${BRL(l.valor)} em ${l.categoria}. Esta ação não pode ser desfeita.`,
                    confirmLabel: 'Excluir',
                    danger: true,
                    onConfirm: () => store.removerLancamento(l.id),
                  })
                }
              />
            </div>
          ))}
          {!lancs.length && <Empty>Nenhum gasto variável lançado neste mês.</Empty>}
        </div>
      </Card>
    </>
  )
}
