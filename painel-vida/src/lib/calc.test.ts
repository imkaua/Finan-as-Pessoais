import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cashMonth, logicalToday, parseDuration, fmtPace, weekStart, addMonths } from './dates.ts'
import { boxBalance, changeGoal, checkups, goalFor, monthBudget, reviewCoverage, projectBoxes } from './calc.ts'
import type { Settings } from '../data/types.ts'

const settings: Settings = {
  id: 'main',
  dayCutoffHour: 4,
  card: { closingDay: 3, dueDay: 10 },
  boxYieldPct: 1,
  categories: [
    { id: 'moradia', name: 'Moradia', kind: 'fixo' },
    { id: 'mercado', name: 'Mercado', kind: 'variavel' },
  ],
  incomeSources: [
    { id: 'fixa', name: 'Fixa', variable: false },
    { id: 'comissao', name: 'Comissão', variable: true },
  ],
  specialties: [{ id: 'dent', name: 'Dentista', everyMonths: 6 }],
  goals: [],
  contentPlatforms: [],
}

test('dia lógico: madrugada conta como dia anterior', () => {
  assert.equal(logicalToday(4, new Date(2026, 9, 3, 1, 30)), '2026-10-02')
  assert.equal(logicalToday(4, new Date(2026, 9, 3, 4, 0)), '2026-10-03')
})

test('fatura: compra após o fechamento vai para a fatura seguinte', () => {
  const card = { closingDay: 3, dueDay: 10 }
  assert.equal(cashMonth('2026-10-02', 'cartao', card), '2026-10')
  assert.equal(cashMonth('2026-10-05', 'cartao', card), '2026-11')
  assert.equal(cashMonth('2026-12-20', 'cartao', card), '2027-01')
  // vencimento antes do fechamento: paga no mês seguinte ao fechamento
  assert.equal(cashMonth('2026-10-10', 'cartao', { closingDay: 25, dueDay: 5 }), '2026-11')
  assert.equal(cashMonth('2026-10-26', 'cartao', { closingDay: 25, dueDay: 5 }), '2026-12')
  // fechamento dia 31 em fevereiro
  assert.equal(cashMonth('2027-02-28', 'cartao', { closingDay: 31, dueDay: 8 }), '2027-03')
  assert.equal(cashMonth('2026-10-05', 'pix', card), '2026-10')
})

test('orçamento: fixo conta previsto, variável soma lançamentos, caixinha fica fora', () => {
  const b = monthBudget(
    '2026-10',
    settings,
    {
      id: '2026-10',
      date: '2026-10-01',
      planned: { moradia: 2000, mercado: 800 },
      fixedActual: {},
      incomeForecast: { fixa: 3000, comissao: 5000 },
      incomeReceived: { comissao: 4200 },
    },
    [
      { id: 'a', date: '2026-10-02', amount: 300, categoryId: 'mercado', description: '', payment: 'cartao', origin: 'mes' },
      { id: 'b', date: '2026-10-09', amount: 1000, categoryId: 'mercado', description: '', payment: 'pix', origin: 'viagem' },
      { id: 'c', date: '2026-11-01', amount: 50, categoryId: 'mercado', description: '', payment: 'pix', origin: 'mes' },
      { id: 'd', date: '2026-10-03', amount: 70, categoryId: 'mercado', description: '', payment: 'pix', origin: 'mes', deletedAt: 1 },
    ],
  )
  assert.equal(b.rows.find((r) => r.categoryId === 'moradia')!.actual, 2000)
  assert.equal(b.rows.find((r) => r.categoryId === 'mercado')!.actual, 300)
  assert.equal(b.incomeExpected, 7200)
  assert.equal(b.incomeConservative, 7200)
  const pending = monthBudget('2026-10', settings, { id: 'x', date: '', planned: {}, fixedActual: {}, incomeForecast: { fixa: 3000, comissao: 5000 }, incomeReceived: {} }, [])
  assert.equal(pending.incomeExpected, 8000)
  assert.equal(pending.incomeConservative, 3000)
})

test('caixinha: saldo conferido + movimentos posteriores − gastos pagos por ela', () => {
  const r = boxBalance(
    'viagem',
    [
      { id: '1', boxId: 'viagem', date: '2026-09-01', kind: 'aporte', amount: 999 },
      { id: '2', boxId: 'viagem', date: '2026-09-30', kind: 'saldo', amount: 5000 },
      { id: '3', boxId: 'viagem', date: '2026-10-01', kind: 'aporte', amount: 500 },
      { id: '4', boxId: 'viagem', date: '2026-10-02', kind: 'retirada', amount: 200 },
    ],
    [{ id: 'e', date: '2026-10-05', amount: 1000, categoryId: 'extra', description: '', payment: 'pix', origin: 'viagem' }],
    '2026-10-10',
  )
  assert.equal(r.balance, 4300)
  assert.equal(r.daysSinceCheck, 10)
})

test('projeção com rendimento e aporte', () => {
  const p = projectBoxes([{ id: 'r', name: 'Reserva', goal: 0, monthlyPlan: 100 }], { r: 1000 }, 1, '2026-10', 2)
  assert.equal(p.length, 3)
  assert.ok(Math.abs(p[2].total - (1000 * 1.01 * 1.01 + 100 * 1.01 + 100)) < 1e-9)
})

test('meta com vigência: mudar a meta não reescreve o passado', () => {
  let goals = changeGoal([], 'corridas', 3, '2026-09-01', 'g1')
  goals = changeGoal(goals, 'corridas', 4, '2026-10-05', 'g2')
  assert.equal(goalFor(goals, 'corridas', '2026-09-20')!.target, 3)
  assert.equal(goalFor(goals, 'corridas', '2026-10-04')!.target, 3)
  assert.equal(goalFor(goals, 'corridas', '2026-10-05')!.target, 4)
  // trocar duas vezes no mesmo dia substitui, sem criar vigência vazia
  goals = changeGoal(goals, 'corridas', 5, '2026-10-05', 'g3')
  assert.equal(goals.filter((g) => g.metric === 'corridas').length, 2)
  assert.equal(goalFor(goals, 'corridas', '2026-10-05')!.target, 5)
  // remover a meta encerra a vigência
  goals = changeGoal(goals, 'corridas', null, '2026-11-01', 'g4')
  assert.equal(goalFor(goals, 'corridas', '2026-11-02'), undefined)
  assert.equal(goalFor(goals, 'corridas', '2026-10-31')!.target, 5)
})

test('cobertura de revisões usa a base ativa daquele mês', () => {
  const clients = [
    { id: 'a', alias: 'A', since: '2026-01-01', date: '2026-01-01' },
    { id: 'b', alias: 'B', since: '2026-01-01', inactiveSince: '2026-10-15', date: '2026-01-01' },
    { id: 'c', alias: 'C', since: '2026-11-01', date: '2026-11-01' },
  ]
  const reviews = [
    { id: 'r1', date: '2026-10-03', clientId: 'a' },
    { id: 'r2', date: '2026-10-20', clientId: 'a' },
  ]
  const oct = reviewCoverage('2026-10', clients, reviews)
  assert.equal(oct.base, 2)
  assert.equal(oct.reviewed, 1)
  assert.equal(reviewCoverage('2026-11', clients, []).base, 2)
})

test('consultas: vencida, agendada e sem histórico', () => {
  const c = checkups(
    settings.specialties,
    [{ id: 'x', date: '2026-01-10', specialtyId: 'dent', status: 'realizada' }],
    '2026-10-02',
  )
  assert.equal(c[0].status, 'vencida')
  assert.equal(c[0].next, '2026-07-10')
  const c2 = checkups(
    settings.specialties,
    [
      { id: 'x', date: '2026-01-10', specialtyId: 'dent', status: 'realizada' },
      { id: 'y', date: '2026-10-20', specialtyId: 'dent', status: 'agendada' },
    ],
    '2026-10-02',
  )
  assert.equal(c2[0].status, 'agendada')
  assert.equal(checkups(settings.specialties, [], '2026-10-02')[0].status, 'sem-historico')
})

test('utilitários de data e treino', () => {
  assert.equal(parseDuration('32:15'), 1935)
  assert.equal(parseDuration('1:05:20'), 3920)
  assert.equal(parseDuration('45'), 2700)
  assert.equal(fmtPace(1795, 5), '5:59/km')
  assert.equal(fmtPace(1799, 5), '6:00/km')
  assert.equal(weekStart('2026-10-04'), '2026-09-28')
  assert.equal(addMonths('2026-08-31', 6), '2027-02-28')
})

test('mês salvo parcialmente não quebra o cálculo', () => {
  const b = monthBudget('2026-10', settings, { id: '2026-10', planned: { moradia: 2000 } }, [])
  assert.equal(b.plannedTotal, 2000)
  assert.equal(b.rows.find((r) => r.categoryId === 'moradia')!.actual, 2000)
  assert.equal(b.incomeExpected, 0)
})

test('caixinha: duas conferências no mesmo dia, vale a última gravada', () => {
  const evs = [
    { id: '2', boxId: 'r', date: '2026-10-02', kind: 'saldo' as const, amount: 15000, createdAt: 200 },
    { id: '1', boxId: 'r', date: '2026-10-02', kind: 'saldo' as const, amount: 0, createdAt: 100 },
  ]
  assert.equal(boxBalance('r', evs, [], '2026-10-02').balance, 15000)
  assert.equal(boxBalance('r', [...evs].reverse(), [], '2026-10-02').balance, 15000)
})

test('campo numérico aceita formatos brasileiros', async () => {
  const { parseNumber } = await import('../components/parse.ts')
  assert.equal(parseNumber('1.270.958'), 1270958)
  assert.equal(parseNumber('1.234,56'), 1234.56)
  assert.equal(parseNumber('12,5'), 12.5)
  assert.equal(parseNumber('12.5'), 12.5)
  assert.equal(parseNumber('R$ 350'), 350)
  assert.equal(parseNumber(''), null)
})
