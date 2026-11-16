import { useStore, getDados } from '../store'
import { useApp } from '../context'
import { useModal } from '../components/ui/Modal'
import { Bar, Card, Chip, Empty, Kpi, RowButtons } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { FixoForm, PagamentoForm } from '../components/forms'
import { BRL, plural } from '../lib/format'
import { addM, fmtDate, ymShort } from '../lib/dates'
import { itensPagamento, statusPagamento } from '../lib/finance'

const ORDEM_TIPOS = ['Fatura', 'Boleto', 'Pix', 'Débito automático', 'Cartão']

export function Pagamentos() {
  const { ym, today } = useApp()
  const { open, confirm, toast } = useModal()
  const store = useStore()
  const itens = itensPagamento(getDados(store), ym)
  const total = itens.reduce((s, p) => s + p.valor, 0)
  const pago = itens.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0)
  const atrasados = itens.filter((p) => statusPagamento(p, today).atrasado)
  const porTipo = ORDEM_TIPOS.map((t) => [t, itens.filter((p) => p.tipo === t).reduce((s, p) => s + p.valor, 0)] as const).filter(([, v]) => v > 0)
  const prev = addM(ym, -1)
  const faturasAnt = store.pagamentos.filter((p) => p.mes === prev && p.tipo === 'Fatura').length

  return (
    <>
      <div className="grid-k3">
        <Kpi label="Total do mês" value={BRL(total)} sub={plural(itens.length, 'item', 'itens')} />
        <Kpi label="Pago" value={<span className="pos">{BRL(pago)}</span>} sub={<Bar value={total ? pago / total : 0} />} />
        <Kpi
          label="Pendente"
          value={BRL(total - pago)}
          sub={atrasados.length ? <b className="neg">{plural(atrasados.length, 'atrasado', 'atrasados')}</b> : 'Nada atrasado'}
        />
      </div>
      <Card>
        <div className="card-h">
          <div className="flex gap-2 flex-wrap">
            {porTipo.map(([t, v]) => (
              <Chip key={t}>
                {t} · <span className="num">{BRL(v)}</span>
              </Chip>
            ))}
          </div>
          <div className="actions">
            {faturasAnt > 0 && (
              <button
                className="btn ghost sm"
                onClick={() => {
                  const n = store.repetirFaturas(ym)
                  toast(n ? `${plural(n, 'fatura copiada', 'faturas copiadas')} de ${ymShort(prev)}` : 'As faturas do mês anterior já estão aqui')
                }}
              >
                <Icon name="copy" size={15} />
                Repetir faturas de {ymShort(prev)}
              </button>
            )}
            <button className="btn sm" onClick={() => open(<PagamentoForm />)}>
              <Icon name="plus" size={15} stroke={2.2} />
              Fatura, boleto ou Pix
            </button>
          </div>
        </div>
        <div className="rows">
          {itens.map((p) => {
            const st = statusPagamento(p, today)
            const pag = p.origem === 'avulso' ? store.pagamentos.find((x) => x.id === p.ref) : undefined
            const fixo = p.origem === 'fixo' ? store.fixos.find((x) => x.id === p.ref) : undefined
            return (
              <div className={`row r-pay ${p.pago ? 'muted' : ''}`} key={p.key}>
                <button
                  type="button"
                  className={`check ${p.pago ? 'on' : ''}`}
                  role="checkbox"
                  aria-checked={p.pago}
                  aria-label={`Marcar ${p.desc} como ${p.pago ? 'pendente' : 'pago'}`}
                  onClick={() => (p.origem === 'fixo' ? store.alternarPagoFixo(ym, p.ref) : store.alternarPagoAvulso(p.ref))}
                >
                  {p.pago && <Icon name="ok" size={14} stroke={3} />}
                </button>
                <div>
                  <div className="t">{p.desc}</div>
                  <div className="m">
                    <span className="type">{p.tipo}</span>
                    {p.origem === 'fixo' && ' · gasto fixo'} · vence {fmtDate(p.venc)}
                    {pag?.pago && pag.pagoEm && ` · pago em ${fmtDate(pag.pagoEm)}`}
                    <span className={`show-s ${st.tom === 'bad' ? 'neg' : ''}`}> · {st.label}</span>
                  </div>
                </div>
                <Chip tom={st.tom} className="hide-s">
                  {st.label}
                </Chip>
                <div className="val num">{BRL(p.valor)}</div>
                {pag ? (
                  <RowButtons
                    label={p.desc}
                    onEdit={() => open(<PagamentoForm pag={pag} />)}
                    onDelete={() =>
                      confirm({
                        title: `Excluir “${p.desc}”?`,
                        text: 'Esta ação remove o pagamento deste mês.',
                        confirmLabel: 'Excluir',
                        danger: true,
                        onConfirm: () => store.removerPagamento(pag.id),
                      })
                    }
                  />
                ) : (
                  <RowButtons label={p.desc} onEdit={fixo ? () => open(<FixoForm fixo={fixo} />) : undefined} />
                )}
              </div>
            )
          })}
          {!itens.length && <Empty>Nenhum pagamento neste mês. Cadastre gastos fixos ou adicione faturas, boletos e Pix.</Empty>}
        </div>
      </Card>
    </>
  )
}
