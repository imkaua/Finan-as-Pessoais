import { useState } from 'react'
import { useStore, uid } from '../../store'
import { useApp } from '../../context'
import { useModal, FormSheet } from '../ui/Modal'
import { CheckField, MoneyField, SelectField, TextField, TextWithSuggestions } from '../ui/Field'
import { GOAL_ICONS } from '../../lib/goalIcons'
import { BRL, parseValor, valorParaCampo } from '../../lib/format'
import { daysIn, ymLabel } from '../../lib/dates'
import { calcObjetivo, limitesDoMes, rendaDoMes, valorFixo } from '../../lib/finance'
import {
  FORMAS_PAGAMENTO,
  TIPOS_PAGAMENTO,
  type Assinatura,
  type FormaPagamento,
  type GastoFixo,
  type Lancamento,
  type Objetivo,
  type Pagamento,
  type TipoPagamento,
  type YM,
} from '../../types'

type Errs = Record<string, string | null>
const positivo = (txt: string, obrig = true): [number, string | null] => {
  const v = parseValor(txt)
  if (!txt.trim()) return [0, obrig ? 'Informe um valor' : null]
  if (!Number.isFinite(v) || v < 0) return [0, 'Valor inválido']
  return [v, null]
}
const temErro = (e: Errs) => Object.values(e).some(Boolean)

/* ---------- Renda ---------- */

export function RendaForm({ ym }: { ym: YM }) {
  const s = useStore()
  const { open } = useModal()
  const atual = rendaDoMes(s, ym)
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(s.fontesRenda.map((f) => [f.id, valorParaCampo(atual[f.id] ?? 0)])),
  )
  const [padrao, setPadrao] = useState(false)
  const [errs, setErrs] = useState<Errs>({})
  const total = s.fontesRenda.reduce((acc, f) => acc + (parseValor(vals[f.id] || '0') || 0), 0)

  return (
    <FormSheet
      title={`Renda prevista · ${ymLabel(ym)}`}
      onSubmit={() => {
        const e: Errs = {}
        const out: Record<string, number> = {}
        for (const f of s.fontesRenda) {
          const [v, err] = positivo(vals[f.id] ?? '', false)
          e[f.id] = err
          if (v > 0) out[f.id] = v
        }
        setErrs(e)
        if (temErro(e)) return false
        s.salvarRenda(ym, out, padrao)
      }}
    >
      {s.fontesRenda.map((f) => (
        <MoneyField
          key={f.id}
          label={`${f.nome} (R$)`}
          value={vals[f.id] ?? ''}
          error={errs[f.id]}
          onChange={(v) => setVals((o) => ({ ...o, [f.id]: v }))}
        />
      ))}
      <p className="num" style={{ margin: '4px 0 12px', fontWeight: 700 }}>
        Total: {BRL(total)}
      </p>
      <CheckField label="Usar como padrão a partir deste mês" checked={padrao} onChange={setPadrao} />
      <button type="button" className="btn ghost sm" onClick={() => open(<FontesForm ym={ym} />)}>
        Gerenciar fontes de renda
      </button>
    </FormSheet>
  )
}

export function FontesForm({ ym }: { ym: YM }) {
  const s = useStore()
  const { open } = useModal()
  const [fontes, setFontes] = useState(s.fontesRenda.map((f) => ({ ...f })))
  const [nova, setNova] = useState('')
  const [err, setErr] = useState<string | null>(null)
  return (
    <FormSheet
      title="Fontes de renda"
      onSubmit={() => {
        const lista = fontes.filter((f) => f.nome.trim())
        if (nova.trim()) lista.push({ id: uid(), nome: nova.trim() })
        if (!lista.length) {
          setErr('Mantenha pelo menos uma fonte')
          return false
        }
        s.salvarFontes(lista.map((f) => ({ ...f, nome: f.nome.trim() })))
        setTimeout(() => open(<RendaForm ym={ym} />))
      }}
    >
      <p className="hint" style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: -8, marginBottom: 12 }}>
        Renomeie ou apague o nome para remover. Os valores já lançados ficam guardados no histórico.
      </p>
      {fontes.map((f, i) => (
        <TextField
          key={f.id}
          label={`Fonte ${i + 1}`}
          value={f.nome}
          onChange={(v) => setFontes((o) => o.map((x) => (x.id === f.id ? { ...x, nome: v } : x)))}
        />
      ))}
      <TextField label="Nova fonte (opcional)" placeholder="Ex.: Aluguel recebido" value={nova} onChange={setNova} error={err} />
    </FormSheet>
  )
}

/* ---------- Limites ---------- */

export function LimitesForm({ ym }: { ym: YM }) {
  const s = useStore()
  const lim = limitesDoMes(s, ym)
  const cats = Object.keys(lim)
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(cats.map((c) => [c, valorParaCampo(lim[c])])))
  const [novaCat, setNovaCat] = useState('')
  const [novaVal, setNovaVal] = useState('')
  const [padrao, setPadrao] = useState(true)
  const [errs, setErrs] = useState<Errs>({})
  return (
    <FormSheet
      title={`Limites de ${ymLabel(ym)}`}
      onSubmit={() => {
        const e: Errs = {}
        const out: Record<string, number> = {}
        for (const c of cats) {
          const [v, err] = positivo(vals[c] ?? '', false)
          e[c] = err
          if (v > 0) out[c] = v
        }
        if (novaCat.trim()) {
          const [v, err] = positivo(novaVal, false)
          e.__nova = err
          if (cats.some((c) => c.toLowerCase() === novaCat.trim().toLowerCase())) e.__cat = 'Essa categoria já existe'
          out[novaCat.trim()] = v
        }
        setErrs(e)
        if (temErro(e)) return false
        s.salvarLimites(ym, out, padrao)
      }}
    >
      {cats.length === 0 && (
        <p style={{ color: 'var(--muted)', marginTop: -6 }}>Nenhuma categoria ainda. Crie a primeira abaixo.</p>
      )}
      {cats.map((c) => (
        <MoneyField
          key={c}
          label={`${c} (R$)`}
          value={vals[c] ?? ''}
          error={errs[c]}
          onChange={(v) => setVals((o) => ({ ...o, [c]: v }))}
        />
      ))}
      {cats.length > 0 && <p className="hint" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: -4 }}>Deixe vazio ou 0 para remover a categoria.</p>}
      <hr className="sep" />
      <TextField label="Nova categoria (opcional)" placeholder="Ex.: Pets" value={novaCat} onChange={setNovaCat} error={errs.__cat} />
      <MoneyField label="Limite da nova categoria (R$)" value={novaVal} onChange={setNovaVal} error={errs.__nova} />
      <CheckField label="Aplicar como padrão a partir deste mês" checked={padrao} onChange={setPadrao} />
    </FormSheet>
  )
}

/* ---------- Gasto fixo ---------- */

function useCategoriasFixas() {
  const s = useStore()
  return [...new Set([...s.fixos.map((f) => f.categoria), 'Moradia', 'Saúde', 'Educação', 'Transporte', 'Doações'].filter(Boolean))]
}

export function FixoForm({ fixo }: { fixo?: GastoFixo }) {
  const { ym } = useApp()
  const s = useStore()
  const sugest = useCategoriasFixas()
  const todasFontes = s.fontesRenda.map((x) => x.id)
  const [f, setF] = useState({
    nome: fixo?.nome ?? '',
    categoria: fixo?.categoria ?? '',
    valor: valorParaCampo(fixo?.valor),
    dia: String(fixo?.dia ?? ''),
    forma: fixo?.forma ?? ('Boleto' as FormaPagamento),
    inicio: fixo?.inicio ?? ym,
    fim: fixo?.fim ?? '',
    modo: fixo?.percentual != null ? 'pct' : 'fixo',
    pct: fixo?.percentual != null ? valorParaCampo(fixo.percentual * 100) : '',
  })
  const [base, setBase] = useState<string[]>(() => (fixo?.baseFontes?.length ? fixo.baseFontes : todasFontes))
  const [errs, setErrs] = useState<Errs>({})
  const up = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))

  const pctNum = parseValor(f.pct)
  const baseFontes = base.length === todasFontes.length ? null : base
  const previa =
    f.modo === 'pct' && Number.isFinite(pctNum) && pctNum > 0
      ? valorFixo(s, { valor: 0, percentual: pctNum / 100, baseFontes }, ym)
      : null

  return (
    <FormSheet
      title={fixo ? 'Editar gasto fixo' : 'Novo gasto fixo'}
      deleteText='Ele deixa de aparecer em todos os meses, inclusive no histórico. Para encerrar só daqui pra frente, preencha "Termina em".'
      onDelete={fixo ? () => s.removerFixo(fixo.id) : undefined}
      onSubmit={() => {
        const dia = Number(f.dia)
        const porPct = f.modo === 'pct'
        const [valor, ev] = porPct ? [0, null] : positivo(f.valor)
        const e: Errs = {
          nome: f.nome.trim() ? null : 'Informe o nome',
          valor: ev,
          pct: porPct && !(Number.isFinite(pctNum) && pctNum > 0 && pctNum <= 100) ? 'Informe um percentual entre 0 e 100' : null,
          base: porPct && base.length === 0 ? 'Escolha pelo menos uma fonte de renda' : null,
          dia: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? null : 'Dia entre 1 e 31',
          inicio: f.inicio ? null : 'Informe o mês de início',
          fim: f.fim && f.fim < f.inicio ? 'Deve ser depois do início' : null,
        }
        setErrs(e)
        if (temErro(e)) return false
        s.salvarFixo({
          id: fixo?.id ?? uid(), nome: f.nome.trim(), categoria: f.categoria.trim() || 'Outros',
          valor, dia, forma: f.forma, inicio: f.inicio, fim: f.fim || null,
          percentual: porPct ? pctNum / 100 : null,
          baseFontes: porPct ? baseFontes : null,
        })
      }}
    >
      <TextField label="Nome" placeholder="Ex.: Aluguel, Oferta" value={f.nome} onChange={up('nome')} error={errs.nome} />
      <TextWithSuggestions label="Categoria" placeholder="Moradia, Saúde, Doações…" value={f.categoria} onChange={up('categoria')} suggestions={sugest} />
      <SelectField
        label="Como calcular o valor"
        value={f.modo}
        onChange={up('modo')}
        options={[
          ['fixo', 'Valor fixo em reais'],
          ['pct', 'Porcentagem da renda do mês'],
        ]}
      />
      {f.modo === 'fixo' ? (
        <MoneyField label="Valor mensal (R$)" value={f.valor} onChange={up('valor')} error={errs.valor} />
      ) : (
        <>
          <TextField
            label="Percentual (%)"
            inputMode="decimal"
            placeholder="Ex.: 10"
            value={f.pct}
            onChange={up('pct')}
            error={errs.pct}
            hint={previa != null ? `Em ${ymLabel(ym).toLowerCase()}: ${BRL(previa)}. O valor muda junto com a renda de cada mês.` : 'O valor muda junto com a renda de cada mês.'}
          />
          {s.fontesRenda.length > 1 && (
            <div className="field" style={{ marginBottom: 4 }}>
              <label>Calcular sobre</label>
              {errs.base && <span className="err">{errs.base}</span>}
            </div>
          )}
          {s.fontesRenda.length > 1 &&
            s.fontesRenda.map((fonte) => (
              <CheckField
                key={fonte.id}
                label={fonte.nome}
                checked={base.includes(fonte.id)}
                onChange={(v) => setBase((o) => (v ? [...o, fonte.id] : o.filter((x) => x !== fonte.id)))}
              />
            ))}
        </>
      )}
      <TextField label="Dia do vencimento" type="number" inputMode="numeric" min={1} max={31} value={f.dia} onChange={up('dia')} error={errs.dia} hint="Em meses mais curtos, vence no último dia." />
      <SelectField label="Forma de pagamento" value={f.forma} onChange={up('forma')} options={[...FORMAS_PAGAMENTO]} />
      <TextField label="Começa em" type="month" value={f.inicio} onChange={up('inicio')} error={errs.inicio} />
      <TextField label="Termina em (opcional)" type="month" value={f.fim} onChange={up('fim')} error={errs.fim} hint="Deixe vazio se não tem data para acabar." />
    </FormSheet>
  )
}

/* ---------- Assinatura ---------- */

export function AssinaturaForm({ ass }: { ass?: Assinatura }) {
  const { ym } = useApp()
  const s = useStore()
  const sugest = [...new Set([...s.assinaturas.map((a) => a.categoria), 'Streaming', 'Música', 'Software', 'Armazenamento'].filter(Boolean))]
  const [f, setF] = useState({
    nome: ass?.nome ?? '',
    categoria: ass?.categoria ?? '',
    valor: valorParaCampo(ass?.valor),
    dia: String(ass?.dia ?? ''),
    inicio: ass?.inicio ?? ym,
    fim: ass?.fim ?? '',
  })
  const [errs, setErrs] = useState<Errs>({})
  const up = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  return (
    <FormSheet
      title={ass ? 'Editar assinatura' : 'Nova assinatura'}
      deleteText='Ela some de todos os meses. Para registrar que acabou, prefira preencher "Até quando".'
      onDelete={ass ? () => s.removerAssinatura(ass.id) : undefined}
      onSubmit={() => {
        const [valor, ev] = positivo(f.valor)
        const dia = Number(f.dia)
        const e: Errs = {
          nome: f.nome.trim() ? null : 'Informe o serviço',
          valor: ev,
          dia: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? null : 'Dia entre 1 e 31',
          inicio: f.inicio ? null : 'Informe o mês',
          fim: f.fim && f.fim < f.inicio ? 'Deve ser depois do início' : null,
        }
        setErrs(e)
        if (temErro(e)) return false
        s.salvarAssinatura({
          id: ass?.id ?? uid(), nome: f.nome.trim(), categoria: f.categoria.trim() || 'Outros',
          valor, dia, inicio: f.inicio, fim: f.fim || null,
        })
      }}
    >
      <TextField label="Serviço" placeholder="Ex.: Netflix" value={f.nome} onChange={up('nome')} error={errs.nome} />
      <TextWithSuggestions label="Categoria" placeholder="Streaming, Software…" value={f.categoria} onChange={up('categoria')} suggestions={sugest} />
      <MoneyField label="Valor mensal (R$)" value={f.valor} onChange={up('valor')} error={errs.valor} />
      <TextField label="Dia da cobrança" type="number" inputMode="numeric" min={1} max={31} value={f.dia} onChange={up('dia')} error={errs.dia} />
      <TextField label="Desde" type="month" value={f.inicio} onChange={up('inicio')} error={errs.inicio} />
      <TextField label="Até quando (opcional)" type="month" value={f.fim} onChange={up('fim')} error={errs.fim} hint="Último mês que será cobrado." />
    </FormSheet>
  )
}

/* ---------- Lançamento variável ---------- */

export function LancamentoForm({ lanc }: { lanc?: Lancamento }) {
  const { ym, today, cur } = useApp()
  const s = useStore()
  const mes = lanc?.mes ?? ym
  const cats = [...new Set([...Object.keys(limitesDoMes(s, mes)), ...(lanc ? [lanc.categoria] : [])])]
  const [f, setF] = useState({
    data: lanc?.data ?? (mes === cur ? today : `${mes}-01`),
    desc: lanc?.desc ?? '',
    categoria: lanc?.categoria ?? cats[0] ?? '',
    valor: valorParaCampo(lanc?.valor),
  })
  const [errs, setErrs] = useState<Errs>({})
  const up = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  const min = `${mes}-01`
  const max = `${mes}-${daysIn(mes)}`
  return (
    <FormSheet
      title={lanc ? 'Editar gasto' : 'Novo gasto variável'}
      onDelete={lanc ? () => s.removerLancamento(lanc.id) : undefined}
      onSubmit={() => {
        const [valor, ev] = positivo(f.valor)
        const e: Errs = {
          data: f.data >= min && f.data <= max ? null : `A data precisa ser em ${ymLabel(mes).toLowerCase()}`,
          desc: f.desc.trim() ? null : 'Informe a descrição',
          categoria: f.categoria.trim() ? null : 'Escolha a categoria',
          valor: valor > 0 ? ev : ev ?? 'Informe um valor',
        }
        setErrs(e)
        if (temErro(e)) return false
        s.salvarLancamento({ id: lanc?.id ?? uid(), mes, data: f.data, desc: f.desc.trim(), categoria: f.categoria.trim(), valor })
      }}
    >
      <TextField label="Data" type="date" min={min} max={max} value={f.data} onChange={up('data')} error={errs.data} />
      <TextField label="Descrição" placeholder="Ex.: Supermercado" value={f.desc} onChange={up('desc')} error={errs.desc} />
      {cats.length ? (
        <SelectField label="Categoria" value={f.categoria} onChange={up('categoria')} options={cats} hint="Para criar uma categoria, use “Editar limites”." />
      ) : (
        <TextField label="Categoria" value={f.categoria} onChange={up('categoria')} error={errs.categoria} hint="Ainda não há limites; a categoria será criada sem limite." />
      )}
      <MoneyField label="Valor (R$)" value={f.valor} onChange={up('valor')} error={errs.valor} />
    </FormSheet>
  )
}

/* ---------- Pagamento avulso ---------- */

export function PagamentoForm({ pag }: { pag?: Pagamento }) {
  const { ym, today, cur } = useApp()
  const s = useStore()
  const [f, setF] = useState({
    tipo: pag?.tipo ?? ('Fatura' as TipoPagamento),
    desc: pag?.desc ?? '',
    valor: valorParaCampo(pag?.valor),
    venc: pag?.venc ?? (ym === cur ? today : `${ym}-10`),
    pago: pag?.pago ?? false,
  })
  const [errs, setErrs] = useState<Errs>({})
  const up = (k: 'tipo' | 'desc' | 'valor' | 'venc') => (v: string) => setF((o) => ({ ...o, [k]: v }))
  return (
    <FormSheet
      title={pag ? 'Editar pagamento' : 'Novo pagamento'}
      onDelete={pag ? () => s.removerPagamento(pag.id) : undefined}
      onSubmit={() => {
        const [valor, ev] = positivo(f.valor)
        const e: Errs = {
          desc: f.desc.trim() ? null : 'Informe a descrição',
          valor: ev,
          venc: /^\d{4}-\d{2}-\d{2}$/.test(f.venc) ? null : 'Informe o vencimento',
        }
        setErrs(e)
        if (temErro(e)) return false
        const pagoEm = f.pago ? (pag?.pago ? pag.pagoEm ?? today : today) : null
        s.salvarPagamento({ id: pag?.id ?? uid(), mes: f.venc.slice(0, 7), tipo: f.tipo, desc: f.desc.trim(), valor, venc: f.venc, pago: f.pago, pagoEm })
      }}
    >
      <SelectField label="Tipo" value={f.tipo} onChange={up('tipo')} options={[...TIPOS_PAGAMENTO]} />
      <TextField label="Descrição" placeholder="Ex.: Fatura Nubank" value={f.desc} onChange={up('desc')} error={errs.desc} />
      <MoneyField label="Valor (R$)" value={f.valor} onChange={up('valor')} error={errs.valor} />
      <TextField label="Vencimento" type="date" value={f.venc} onChange={up('venc')} error={errs.venc} hint="O pagamento aparece no mês do vencimento." />
      <CheckField label="Já está pago" checked={f.pago} onChange={(v) => setF((o) => ({ ...o, pago: v }))} />
    </FormSheet>
  )
}

/* ---------- Objetivos ---------- */

export function ObjetivoForm({ obj }: { obj?: Objetivo }) {
  const { today } = useApp()
  const s = useStore()
  const [f, setF] = useState({
    nome: obj?.nome ?? '',
    icone: obj?.icone ?? 'star',
    valor: valorParaCampo(obj?.valor),
    acumulado: valorParaCampo(obj?.acumulado ?? 0),
    fim: obj?.fim ?? '',
    notas: obj?.notas ?? '',
  })
  const [errs, setErrs] = useState<Errs>({})
  const up = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  return (
    <FormSheet
      title={obj ? 'Editar objetivo' : 'Novo objetivo'}
      deleteText="O objetivo e o histórico de aportes serão apagados."
      onDelete={obj ? () => s.removerObjetivo(obj.id) : undefined}
      onSubmit={() => {
        const [valor, ev] = positivo(f.valor)
        const [acumulado, ea] = positivo(f.acumulado, false)
        const e: Errs = {
          nome: f.nome.trim() ? null : 'Informe o nome',
          valor: valor > 0 ? ev : ev ?? 'Informe um valor',
          acumulado: ea,
          fim: /^\d{4}-\d{2}-\d{2}$/.test(f.fim) ? (obj ? null : f.fim < today ? 'A data final precisa ser no futuro' : null) : 'Informe a data final',
        }
        setErrs(e)
        if (temErro(e)) return false
        const g: Objetivo = {
          id: obj?.id ?? uid(), nome: f.nome.trim(), icone: f.icone, valor, acumulado,
          inicio: obj?.inicio ?? today, fim: f.fim, aportes: obj?.aportes ?? [],
        }
        if (f.notas.trim()) g.notas = f.notas.trim()
        s.salvarObjetivo(g)
      }}
    >
      <TextField label="Nome do objetivo" placeholder="Ex.: Viagem para Santiago" value={f.nome} onChange={up('nome')} error={errs.nome} />
      <SelectField label="Ícone" value={f.icone} onChange={up('icone')} options={GOAL_ICONS} />
      <MoneyField label="Valor do objetivo (R$)" value={f.valor} onChange={up('valor')} error={errs.valor} />
      <MoneyField label="Já guardado (R$)" value={f.acumulado} onChange={up('acumulado')} error={errs.acumulado} hint={obj ? 'Para registrar dinheiro novo, prefira “Registrar aporte”.' : undefined} />
      <TextField label="Data final" type="date" value={f.fim} onChange={up('fim')} error={errs.fim} />
      <TextField label="Notas (opcional)" value={f.notas} onChange={up('notas')} />
    </FormSheet>
  )
}

export function AporteForm({ obj }: { obj: Objetivo }) {
  const { today } = useApp()
  const s = useStore()
  const c = calcObjetivo(obj, today)
  const [valor, setValor] = useState(c.mensal > 0 ? valorParaCampo(c.mensal) : '')
  const [data, setData] = useState(today)
  const [resgate, setResgate] = useState(false)
  const [errs, setErrs] = useState<Errs>({})
  return (
    <FormSheet
      title={`Aporte · ${obj.nome}`}
      saveLabel="Registrar"
      onSubmit={() => {
        const [v, ev] = positivo(valor)
        const e: Errs = {
          valor: v > 0 ? ev : ev ?? 'Informe um valor',
          data: /^\d{4}-\d{2}-\d{2}$/.test(data) ? null : 'Informe a data',
        }
        if (!e.valor && resgate && v > obj.acumulado) e.valor = `O resgate passa do acumulado (${BRL(obj.acumulado)})`
        setErrs(e)
        if (temErro(e)) return false
        s.registrarAporte(obj.id, data, v, resgate)
      }}
    >
      <MoneyField
        label={resgate ? 'Valor resgatado (R$)' : 'Valor guardado (R$)'}
        value={valor}
        onChange={setValor}
        error={errs.valor}
        hint={c.status === 'andamento' ? `Sugestão: mínimo mensal de ${BRL(c.mensal)}` : undefined}
      />
      <TextField label="Data" type="date" value={data} onChange={setData} error={errs.data} />
      <CheckField label="É um resgate (retirada)" checked={resgate} onChange={setResgate} />
    </FormSheet>
  )
}
