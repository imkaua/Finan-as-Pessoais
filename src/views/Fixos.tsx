import { useStore, getDados } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Card, Chip, Empty, Kpi, Note, RowButtons } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { FixoForm } from '../components/forms'
import { BRL, descreverPercentual, pct, plural } from '../lib/format'
import { ymShort } from '../lib/dates'
import { isActive, resumoMes, valorFixo } from '../lib/finance'

export function Fixos() {
  const { ym, today, go } = useApp()
  const { open, confirm } = useModal()
  const store = useStore()
  const dados = getDados(store)
  const r = resumoMes(dados, ym, today)
  const todos = [...store.fixos].sort((a, b) => Number(isActive(b, ym)) - Number(isActive(a, ym)) || a.dia - b.dia)
  const porCat: Record<string, number> = {}
  for (const f of r.fixos) porCat[f.categoria] = (porCat[f.categoria] ?? 0) + valorFixo(dados, f, ym)
  const maior = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0]
  const mostrarAviso = (store.avisos ?? []).includes('migracao-categorias-fixas')

  return (
    <>
      {mostrarAviso && (
        <Note icon="alert" tom="warn" className="mb-4">
          Seus limites antigos de <b>Moradia</b>, <b>Assinaturas</b> e <b>Educação</b> vieram para Gastos variáveis. Cadastre esses itens
          aqui e em Assinaturas e depois zere esses limites, para não contar duas vezes.
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn ghost sm" onClick={() => go('variaveis')}>
              Abrir limites
            </button>
            <button className="btn ghost sm" onClick={() => store.dispensarAviso('migracao-categorias-fixas')}>
              Entendi, ocultar
            </button>
          </div>
        </Note>
      )}
      <div className="grid-k3">
        <Kpi label={`Fixos em ${ymShort(ym)}`} value={BRL(r.tFix)} sub={plural(r.fixos.length, 'conta ativa', 'contas ativas')} />
        <Kpi label="% da renda" value={pct(r.tFix / (r.renda || 1))} sub={`Renda prevista ${BRL(r.renda)}`} />
        <Kpi label="Maior categoria" value={maior?.[0] ?? '—'} sub={maior ? BRL(maior[1]) : 'Nenhum gasto ativo'} />
      </div>
      <Card
        title="Contas fixas"
        action={
          <button className="btn sm" onClick={() => open(<FixoForm />)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Novo gasto fixo
          </button>
        }
      >
        <div className="rows">
          {todos.map((f) => {
            const on = isActive(f, ym)
            return (
              <div className={`row r-fix ${on ? '' : 'muted'}`} key={f.id}>
                <div>
                  <div className="t">
                    {f.nome} {!on && <Chip>Fora deste mês</Chip>}
                  </div>
                  <div className="m">
                    {f.categoria} · dia {f.dia} · {f.forma}
                    {f.percentual != null && ` · ${descreverPercentual(f.percentual, f.baseFontes, store.fontesRenda)}`}
                  </div>
                </div>
                <Chip className="hide-s">{f.fim ? `até ${ymShort(f.fim)}` : 'sem data de fim'}</Chip>
                <div className="val num">{BRL(valorFixo(dados, f, ym))}</div>
                <RowButtons
                  label={f.nome}
                  onEdit={() => open(<FixoForm fixo={f} />)}
                  onDelete={() =>
                    confirm({
                      title: `Excluir “${f.nome}”?`,
                      text: 'Ele deixa de aparecer em todos os meses, inclusive no histórico. Para encerrar só a partir de agora, edite e preencha "Termina em".',
                      confirmLabel: 'Excluir',
                      danger: true,
                      onConfirm: () => store.removerFixo(f.id),
                    })
                  }
                />
              </div>
            )
          })}
          {!todos.length && <Empty>Cadastre aluguel, condomínio, contas de consumo…</Empty>}
        </div>
      </Card>
    </>
  )
}
