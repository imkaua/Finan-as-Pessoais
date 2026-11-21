import { describe, expect, it } from 'vitest'
import {
  aplicarLimites,
  aplicarRenda,
  aportesDoMes,
  calcObjetivo,
  chipAssinatura,
  dueISO,
  isActive,
  itensPagamento,
  minimoMensal,
  parcelasObjetivo,
  prazoObjetivo,
  registrarAporte,
  repetirFaturas,
  resumoMes,
  ritmoDoMes,
  statusCategoria,
  statusObjetivo,
  statusPagamento,
  valorFixo,
  definirTotalCategoria,
  dataDoAjuste,
} from './finance'
import { dadosVazios } from './migrate'
import type { Dados, Objetivo, Pagamento } from '../types'

const TODAY = '2026-11-16'

const goal = (p: Partial<Objetivo>): Objetivo => ({
  id: 'g', nome: 'G', icone: 'star', valor: 1000, acumulado: 0,
  inicio: '2026-01-01', fim: '2027-04-30', aportes: [], ...p,
})

describe('isActive (itens recorrentes)', () => {
  const item = { inicio: '2026-03', fim: '2026-08' as string | null }
  it('é ativo no mês de início e no mês final (inclusive)', () => {
    expect(isActive(item, '2026-03')).toBe(true)
    expect(isActive(item, '2026-08')).toBe(true)
  })
  it('não é ativo antes do início nem depois do fim', () => {
    expect(isActive(item, '2026-02')).toBe(false)
    expect(isActive(item, '2026-09')).toBe(false)
  })
  it('sem fim continua ativo indefinidamente', () => {
    expect(isActive({ inicio: '2026-03', fim: null }, '2031-12')).toBe(true)
  })
  it('compara corretamente na virada de ano', () => {
    expect(isActive({ inicio: '2026-12', fim: '2027-01' }, '2027-01')).toBe(true)
    expect(isActive({ inicio: '2026-12', fim: '2027-01' }, '2026-11')).toBe(false)
  })
})

describe('dueISO (vencimento com clamp)', () => {
  it('mantém o dia quando existe no mês', () => {
    expect(dueISO('2026-11', 5)).toBe('2026-11-05')
  })
  it('dia 31 em fevereiro vira 28 (ano comum) ou 29 (bissexto)', () => {
    expect(dueISO('2027-02', 31)).toBe('2027-02-28')
    expect(dueISO('2028-02', 31)).toBe('2028-02-29')
  })
  it('dia 31 em mês de 30 dias vira 30', () => {
    expect(dueISO('2026-11', 31)).toBe('2026-11-30')
  })
})

describe('mínimo mensal de objetivos', () => {
  it('parcelas contam do mês atual até o mês final, inclusive', () => {
    expect(parcelasObjetivo('2026-11-30', TODAY)).toBe(1)
    expect(parcelasObjetivo('2026-12-15', TODAY)).toBe(2)
    expect(parcelasObjetivo('2027-04-30', TODAY)).toBe(6)
  })
  it('parcelas têm mínimo 1 quando o prazo já passou', () => {
    expect(parcelasObjetivo('2026-01-10', TODAY)).toBe(1)
  })
  it('mínimo = falta / parcelas', () => {
    expect(minimoMensal({ valor: 5000, acumulado: 1200, fim: '2026-12-15' }, TODAY)).toBe(1900)
    expect(minimoMensal({ valor: 1000, acumulado: 400, fim: '2027-04-30' }, TODAY)).toBe(100)
  })
  it('mínimo é zero quando a meta já foi atingida ou superada', () => {
    expect(minimoMensal({ valor: 1000, acumulado: 1500, fim: '2027-04-30' }, TODAY)).toBe(0)
  })
})

describe('status e prazo de objetivo', () => {
  it('Concluído quando não falta nada (mesmo com prazo vencido)', () => {
    expect(statusObjetivo({ valor: 7000, acumulado: 7000, fim: '2026-10-30' }, TODAY)).toBe('concluido')
  })
  it('Prazo encerrado quando hoje > fim e ainda falta', () => {
    expect(statusObjetivo({ valor: 7000, acumulado: 100, fim: '2026-11-15' }, TODAY)).toBe('encerrado')
  })
  it('Em andamento no próprio dia final', () => {
    expect(statusObjetivo({ valor: 7000, acumulado: 100, fim: TODAY }, TODAY)).toBe('andamento')
  })
  it('prazo: ≤12 meses Curto, ≤36 Médio, >36 Longo', () => {
    expect(prazoObjetivo('2027-11-01', TODAY)).toBe('Curto')
    expect(prazoObjetivo('2027-12-01', TODAY)).toBe('Médio')
    expect(prazoObjetivo('2029-11-01', TODAY)).toBe('Médio')
    expect(prazoObjetivo('2029-12-01', TODAY)).toBe('Longo')
  })
  it('calcObjetivo junta tudo e limita o progresso a 100%', () => {
    const c = calcObjetivo(goal({ valor: 1000, acumulado: 1200 }), TODAY)
    expect(c.pct).toBe(1)
    expect(c.falta).toBe(0)
    expect(c.status).toBe('concluido')
  })
  it('registrarAporte soma, resgate subtrai e nunca fica negativo', () => {
    let g = registrarAporte(goal({ acumulado: 100 }), TODAY, 50, false)
    expect(g.acumulado).toBe(150)
    g = registrarAporte(g, TODAY, 500, true)
    expect(g.acumulado).toBe(0)
    expect(g.aportes).toEqual([{ data: TODAY, valor: 50 }, { data: TODAY, valor: -500 }])
  })
})

describe('statusPagamento', () => {
  it('Pago tem prioridade sobre a data', () => {
    expect(statusPagamento({ pago: true, venc: '2026-11-01' }, TODAY)).toMatchObject({ tom: 'ok', label: 'Pago' })
  })
  it('Atrasado Nd quando vencido', () => {
    expect(statusPagamento({ pago: false, venc: '2026-11-10' }, TODAY)).toMatchObject({ tom: 'bad', label: 'Atrasado 6d', atrasado: true })
  })
  it('Vence hoje', () => {
    expect(statusPagamento({ pago: false, venc: TODAY }, TODAY)).toMatchObject({ tom: 'bad', label: 'Vence hoje', atrasado: false })
  })
  it('Vence em Nd (alerta) até 3 dias', () => {
    expect(statusPagamento({ pago: false, venc: '2026-11-17' }, TODAY)).toMatchObject({ tom: 'warn', label: 'Vence em 1d' })
    expect(statusPagamento({ pago: false, venc: '2026-11-19' }, TODAY)).toMatchObject({ tom: 'warn', label: 'Vence em 3d' })
  })
  it('Em N dias acima de 3 dias', () => {
    expect(statusPagamento({ pago: false, venc: '2026-11-20' }, TODAY)).toMatchObject({ tom: 'neutral', label: 'Em 4 dias' })
  })
  it('conta dias corretamente através da virada de mês', () => {
    expect(statusPagamento({ pago: false, venc: '2026-12-01' }, '2026-11-30').label).toBe('Vence em 1d')
  })
})

describe('statusCategoria', () => {
  it('limiares 80% e 100%', () => {
    expect(statusCategoria(79, 100)).toBe('ok')
    expect(statusCategoria(80, 100)).toBe('atencao')
    expect(statusCategoria(100, 100)).toBe('atencao')
    expect(statusCategoria(101, 100)).toBe('estourou')
    expect(statusCategoria(50, 0)).toBe('sem-limite')
  })
})

describe('resumo do mês e aportes', () => {
  const base = (): Dados => ({
    ...dadosVazios(),
    fontesRenda: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }],
    rendaPadrao: { a: 8000, b: 2000 },
    renda: { '2026-12': { a: 8000, b: 5000 } },
    limitesPadrao: { Mercado: 1000, Lazer: 500 },
    fixos: [{ id: 'f', nome: 'Aluguel', categoria: 'Moradia', valor: 3000, dia: 5, forma: 'Pix', inicio: '2026-01', fim: null }],
    assinaturas: [{ id: 's', nome: 'Netflix', categoria: 'Streaming', valor: 50, dia: 10, inicio: '2026-01', fim: '2026-11' }],
    lancamentos: [{ id: 'l', mes: '2026-11', data: '2026-11-02', desc: 'x', categoria: 'Mercado', valor: 1800 }],
    objetivos: [
      goal({ id: 'g1', valor: 1200, acumulado: 0, fim: '2027-04-30', aportes: [{ data: '2026-10-05', valor: 300 }] }),
      goal({ id: 'g2', valor: 500, acumulado: 0, fim: '2026-12-31' }),
    ],
  })

  it('renda soma as fontes e usa o ajuste do mês quando existe', () => {
    const d = base()
    expect(resumoMes(d, '2026-11', TODAY).renda).toBe(10000)
    expect(resumoMes(d, '2026-12', TODAY).renda).toBe(13000)
  })

  it('variável previsto = max(limites, gasto); comprometido não inclui aportes de objetivos', () => {
    const r = resumoMes(base(), '2026-11', TODAY)
    expect(r.varPrevisto).toBe(1800)
    expect(r.comprometido).toBe(3000 + 50 + 1800)
    expect(r.investimentos).toBe(10000 - 4850)
  })

  it('aportes mínimos dos objetivos seguem calculados à parte (só referência)', () => {
    // g1 1200/6 = 200; g2 500/2 = 250
    expect(aportesDoMes(base().objetivos, '2026-11', TODAY)).toBe(450)
  })

  it('mês futuro ignora objetivos que terminam antes dele', () => {
    expect(aportesDoMes(base().objetivos, '2027-01', TODAY)).toBe(200)
  })

  it('mês passado usa os aportes registrados', () => {
    expect(aportesDoMes(base().objetivos, '2026-10', TODAY)).toBe(300)
    expect(aportesDoMes(base().objetivos, '2026-09', TODAY)).toBe(0)
  })

  it('ritmo alerta quando o gasto passa o mês decorrido em mais de 5 p.p.', () => {
    const r = resumoMes(base(), '2026-11', TODAY)
    const rt = ritmoDoMes(r, TODAY)
    expect(rt.diasRestantes).toBe(15)
    expect(rt.acima).toBe(true)
    expect(rt.porDia).toBe(0)
  })

  it('itens de pagamento incluem fixos ativos e avulsos, ordenados por vencimento', () => {
    const d = base()
    d.pagosFixos = { '2026-11': { f: true } }
    d.pagamentos = [{ id: 'p', mes: '2026-11', tipo: 'Fatura', desc: 'Nubank', valor: 900, venc: '2026-11-03', pago: false }]
    const it = itensPagamento(d, '2026-11')
    expect(it.map((x) => x.key)).toEqual(['p:p', 'f:f'])
    expect(it[1].pago).toBe(true)
    expect(itensPagamento(d, '2025-12')).toEqual([])
  })
})

describe('repetirFaturas', () => {
  let n = 0
  const id = () => `n${++n}`
  const pags: Pagamento[] = [
    { id: '1', mes: '2026-01', tipo: 'Fatura', desc: 'Nubank', valor: 900, venc: '2026-01-31', pago: true },
    { id: '2', mes: '2026-01', tipo: 'Boleto', desc: 'IPTU', valor: 100, venc: '2026-01-10', pago: true },
    { id: '3', mes: '2026-01', tipo: 'Fatura', desc: 'XP', valor: 500, venc: '2026-01-20', pago: true },
    { id: '4', mes: '2026-02', tipo: 'Fatura', desc: 'xp', valor: 450, venc: '2026-02-20', pago: false },
  ]
  it('copia só faturas, como pendentes, com clamp do dia e sem duplicar', () => {
    const novos = repetirFaturas(pags, '2026-02', id)
    expect(novos).toHaveLength(1)
    expect(novos[0]).toMatchObject({ mes: '2026-02', desc: 'Nubank', venc: '2026-02-28', pago: false, valor: 900 })
  })
})

describe('chipAssinatura', () => {
  const a = { id: 'a', nome: 'X', categoria: '', valor: 10, dia: 1, inicio: '2026-06', fim: '2027-01' as string | null }
  it('conta cobranças restantes inclusive o mês exibido', () => {
    expect(chipAssinatura(a, '2026-11')).toMatchObject({ label: 'Até Jan/27 · 3 cobranças', cobrancas: 3, restante: 30 })
    expect(chipAssinatura(a, '2027-01')).toMatchObject({ label: 'Até Jan/27 · 1 cobrança', tom: 'warn' })
  })
  it('Encerrada, Começa e Recorrente', () => {
    expect(chipAssinatura(a, '2027-02').label).toBe('Encerrada')
    expect(chipAssinatura(a, '2026-05').label).toBe('Começa Jun/26')
    expect(chipAssinatura({ ...a, fim: null }, '2026-11').label).toBe('Recorrente')
  })
})

describe('aplicar como padrão', () => {
  it('renda: troca o padrão, remove ajustes futuros e preserva o passado', () => {
    const d: Dados = {
      ...dadosVazios(),
      fontesRenda: [{ id: 'a', nome: 'A' }],
      rendaPadrao: { a: 100 },
      renda: { '2026-12': { a: 999 } },
      lancamentos: [{ id: 'l', mes: '2026-09', data: '2026-09-01', desc: '', categoria: 'X', valor: 1 }],
    }
    const r = aplicarRenda(d, '2026-11', { a: 200 }, true)
    expect(r.rendaPadrao).toEqual({ a: 200 })
    expect(r.renda['2026-12']).toBeUndefined()
    expect(r.renda['2026-09']).toEqual({ a: 100 })
    expect(r.renda['2026-10']).toEqual({ a: 100 })
  })
  it('limites: sem padrão grava só no mês', () => {
    const d = { ...dadosVazios(), limitesPadrao: { X: 1 } }
    const r = aplicarLimites(d, '2026-11', { X: 5 }, false)
    expect(r.limites).toEqual({ '2026-11': { X: 5 } })
    expect(r.limitesPadrao).toEqual({ X: 1 })
  })
})

describe('valorFixo (gasto percentual, ex.: oferta de 10%)', () => {
  const d: Dados = {
    ...dadosVazios(),
    fontesRenda: [{ id: 'sal', nome: 'Salário' }, { id: 'extra', nome: 'Extra' }],
    rendaPadrao: { sal: 10000, extra: 2000 },
    renda: { '2026-12': { sal: 15000, extra: 2000 } },
  }
  const fixo = { valor: 999, percentual: 0.1, baseFontes: null as string[] | null }

  it('valor fixo continua igual quando não é percentual', () => {
    expect(valorFixo(d, { valor: 500, percentual: null }, '2026-11')).toBe(500)
  })
  it('sem fontes escolhidas, usa a renda total do mês', () => {
    expect(valorFixo(d, fixo, '2026-11')).toBe(1200)
  })
  it('acompanha a renda de cada mês', () => {
    expect(valorFixo(d, fixo, '2026-12')).toBe(1700)
  })
  it('com fontes escolhidas, usa só elas', () => {
    expect(valorFixo(d, { ...fixo, baseFontes: ['sal'] }, '2026-11')).toBe(1000)
    expect(valorFixo(d, { ...fixo, baseFontes: ['sal'] }, '2026-12')).toBe(1500)
  })
  it('entra no comprometido e no checklist de pagamentos', () => {
    const dd: Dados = {
      ...d,
      fixos: [{ id: 'o', nome: 'Oferta', categoria: 'Doações', valor: 0, dia: 10, forma: 'Pix', inicio: '2026-01', fim: null, percentual: 0.1, baseFontes: ['sal'] }],
    }
    expect(resumoMes(dd, '2026-12', TODAY).tFix).toBe(1500)
    expect(itensPagamento(dd, '2026-12')[0].valor).toBe(1500)
  })
})

describe('definirTotalCategoria (Atualizar totais)', () => {
  let n = 0
  const id = () => `aj${++n}`
  const base = [
    { id: 'a', mes: '2026-11', data: '2026-11-03', desc: 'Assaí', categoria: 'Mercado', valor: 300 },
    { id: 'b', mes: '2026-11', data: '2026-11-04', desc: 'Uber', categoria: 'Transporte', valor: 40 },
    { id: 'c', mes: '2026-10', data: '2026-10-04', desc: 'Assaí', categoria: 'Mercado', valor: 500 },
  ]
  const totalMercado = (ls: typeof base) => ls.filter((l) => l.mes === '2026-11' && l.categoria === 'Mercado').reduce((s, l) => s + l.valor, 0)

  it('cria um ajuste com a diferença para chegar ao total informado', () => {
    const r = definirTotalCategoria(base, '2026-11', 'Mercado', 1230, '2026-11-21', id)
    expect(totalMercado(r)).toBe(1230)
    expect(r.filter((l) => 'ajuste' in l && l.ajuste)).toHaveLength(1)
  })
  it('atualizar de novo reaproveita o mesmo ajuste', () => {
    const r1 = definirTotalCategoria(base, '2026-11', 'Mercado', 1230, '2026-11-21', id)
    const r2 = definirTotalCategoria(r1, '2026-11', 'Mercado', 1500, '2026-11-25', id)
    const ajustes = r2.filter((l) => 'ajuste' in l && l.ajuste)
    expect(ajustes).toHaveLength(1)
    expect(ajustes[0]).toMatchObject({ valor: 1200, data: '2026-11-25' })
    expect(totalMercado(r2)).toBe(1500)
  })
  it('remove o ajuste quando o total volta a bater com os lançamentos', () => {
    const r1 = definirTotalCategoria(base, '2026-11', 'Mercado', 1230, '2026-11-21', id)
    const r2 = definirTotalCategoria(r1, '2026-11', 'Mercado', 300, '2026-11-21', id)
    expect(r2).toEqual(base)
  })
  it('aceita total menor que os lançamentos (ajuste negativo) e não mexe em outros meses/categorias', () => {
    const r = definirTotalCategoria(base, '2026-11', 'Mercado', 250, '2026-11-21', id)
    expect(totalMercado(r)).toBe(250)
    expect(r.filter((l) => l.mes === '2026-10' || l.categoria === 'Transporte')).toEqual([base[1], base[2]])
  })
  it('data do ajuste: hoje no mês atual, último dia no passado, dia 1 no futuro', () => {
    expect(dataDoAjuste('2026-11', '2026-11-21')).toBe('2026-11-21')
    expect(dataDoAjuste('2026-10', '2026-11-21')).toBe('2026-10-31')
    expect(dataDoAjuste('2026-12', '2026-11-21')).toBe('2026-12-01')
  })
})
