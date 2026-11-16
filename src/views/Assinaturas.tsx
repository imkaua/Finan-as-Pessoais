import { useStore } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Card, Chip, Empty, Kpi, RowButtons } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { AssinaturaForm } from '../components/forms'
import { BRL, plural } from '../lib/format'
import { ymShort } from '../lib/dates'
import { chipAssinatura, isActive, terminandoEmBreve } from '../lib/finance'

export function Assinaturas() {
  const { ym } = useApp()
  const { open, confirm } = useModal()
  const store = useStore()
  const ativas = store.assinaturas.filter((a) => isActive(a, ym))
  const total = ativas.reduce((s, a) => s + a.valor, 0)
  const breve = terminandoEmBreve(store.assinaturas, ym)
  const todas = [...store.assinaturas].sort((a, b) => Number(isActive(b, ym)) - Number(isActive(a, ym)) || a.dia - b.dia)

  return (
    <>
      <div className="grid-k3">
        <Kpi label={`Assinaturas em ${ymShort(ym)}`} value={BRL(total)} sub={plural(ativas.length, 'ativa', 'ativas')} />
        <Kpi label="Custo anual equivalente" value={BRL(total * 12)} sub="Se nada mudar" />
        <Kpi
          label="Terminando em breve"
          value={String(breve.length)}
          sub={breve.length ? breve.map((a) => `${a.nome} (${ymShort(a.fim!)})`).join(', ') : 'Nenhuma nos próximos 2 meses'}
        />
      </div>
      <Card
        title="Minhas assinaturas"
        action={
          <button className="btn sm" onClick={() => open(<AssinaturaForm />)}>
            <Icon name="plus" size={15} stroke={2.2} />
            Nova assinatura
          </button>
        }
      >
        <div className="rows">
          {todas.map((a) => {
            const on = isActive(a, ym)
            const chip = chipAssinatura(a, ym)
            return (
              <div className={`row r-ass ${on ? '' : 'muted'}`} key={a.id}>
                <div className="av" aria-hidden="true">
                  {a.nome[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="t">{a.nome}</div>
                  <div className="m">
                    {a.categoria} · cobra dia {a.dia}
                    {chip.restante != null && ` · restam ${BRL(chip.restante)}`}
                    <span className="show-s"> · {chip.label}</span>
                  </div>
                </div>
                <Chip tom={chip.tom} className="hide-s">
                  {chip.label}
                </Chip>
                <div className="val num">{BRL(a.valor)}</div>
                <RowButtons
                  label={a.nome}
                  onEdit={() => open(<AssinaturaForm ass={a} />)}
                  onDelete={() =>
                    confirm({
                      title: `Excluir “${a.nome}”?`,
                      text: 'Ela some de todos os meses, inclusive do histórico. Para registrar que acabou, prefira editar e preencher "Até quando".',
                      confirmLabel: 'Excluir',
                      danger: true,
                      onConfirm: () => store.removerAssinatura(a.id),
                    })
                  }
                />
              </div>
            )
          })}
          {!todas.length && <Empty>Nenhuma assinatura cadastrada.</Empty>}
        </div>
      </Card>
    </>
  )
}
