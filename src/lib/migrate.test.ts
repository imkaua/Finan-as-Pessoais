import { describe, expect, it } from 'vitest'
import { AVISO_CATEGORIAS_FIXAS, migrarV2, paraDadosAtuais, type V2State } from './migrate'

const TODAY = '2026-11-16'
let n = 0
const uid = () => `id${++n}`

const v2: V2State = {
  categories: [
    { id: 'moradia', name: 'Moradia' },
    { id: 'alimentacao', name: 'Alimentação' },
    { id: 'lazer', name: 'Lazer' },
  ],
  incomeSources: [
    { id: 'kaua', name: 'Assessoria Kauã' },
    { id: 'vida', name: 'Vida' },
  ],
  months: {
    '2026-09': { income: { kaua: 8000, vida: 1000 }, planned: { moradia: 3000, alimentacao: 1200 }, actual: { alimentacao: 1100, lazer: 0 } },
    '2026-10': { income: { kaua: 9000, vida: 0 }, planned: { alimentacao: 1300, lazer: 400 }, actual: { lazer: 380 } },
    '2026-11': { income: { kaua: 9500, vida: 500 }, planned: { alimentacao: 1300 }, actual: { alimentacao: 600 } },
    '2026-12': { income: {}, planned: {}, actual: {} },
  },
  emergencyFund: { goal: 30000, startingBalance: 10000, contributions: { '2026-09': 1000, '2026-10': 500, '2026-11': 0, '2026-12': 0 } },
  bigExpenses: [
    { id: 'viagem', name: 'Viagem', totalAmount: 8000, savedSoFar: 2000, targetDate: '2027-07-01', notes: 'Santiago' },
    { id: 'curso', name: 'Curso', totalAmount: 3000, savedSoFar: 0, targetDate: '', notes: '' },
  ],
}

describe('migrarV2', () => {
  const d = migrarV2(v2, TODAY, uid)

  it('mantém a renda por fonte em cada mês e usa o mês mais recente como padrão', () => {
    expect(d.fontesRenda).toEqual([{ id: 'kaua', nome: 'Assessoria Kauã' }, { id: 'vida', nome: 'Vida' }])
    expect(d.renda['2026-09']).toEqual({ kaua: 8000, vida: 1000 })
    expect(d.renda['2026-10']).toEqual({ kaua: 9000 })
    expect(d.renda['2026-12']).toBeUndefined()
    expect(d.rendaPadrao).toEqual({ kaua: 9500, vida: 500 })
  })

  it('planejado vira limite por nome de categoria e avisa sobre categorias fixas', () => {
    expect(d.limites['2026-09']).toEqual({ Moradia: 3000, 'Alimentação': 1200 })
    expect(d.limitesPadrao).toEqual({ 'Alimentação': 1300 })
    expect(d.avisos).toEqual([AVISO_CATEGORIAS_FIXAS])
  })

  it('realizado vira um lançamento por categoria/mês, ignorando zeros', () => {
    const l = d.lancamentos.map((x) => [x.mes, x.data, x.categoria, x.valor])
    expect(l).toEqual([
      ['2026-09', '2026-09-30', 'Alimentação', 1100],
      ['2026-10', '2026-10-31', 'Lazer', 380],
      ['2026-11', TODAY, 'Alimentação', 600],
    ])
  })

  it('reserva de emergência vira objetivo com histórico de aportes', () => {
    const r = d.objetivos.find((g) => g.nome === 'Reserva de Emergência')!
    expect(r).toMatchObject({ icone: 'shield', valor: 30000, acumulado: 11500, inicio: '2026-09-01', fim: '2027-11-30' })
    expect(r.aportes).toEqual([{ data: '2026-09-01', valor: 1000 }, { data: '2026-10-01', valor: 500 }])
  })

  it('grandes gastos viram objetivos, preservando id e notas', () => {
    const v = d.objetivos.find((g) => g.id === 'viagem')!
    expect(v).toMatchObject({ nome: 'Viagem', valor: 8000, acumulado: 2000, fim: '2027-07-01', notas: 'Santiago' })
    const c = d.objetivos.find((g) => g.id === 'curso')!
    expect(c.fim).toBe('2027-11-30')
    expect(c.notas).toBeUndefined()
  })

  it('começa sem fixos, assinaturas e pagamentos', () => {
    expect(d.fixos).toEqual([])
    expect(d.assinaturas).toEqual([])
    expect(d.pagamentos).toEqual([])
  })

  it('estado vazio da v2 não cria objetivos nem aviso', () => {
    const e = migrarV2({ categories: [], incomeSources: [], months: {}, emergencyFund: { goal: 0, startingBalance: 0, contributions: {} }, bigExpenses: [] }, TODAY, uid)
    expect(e.objetivos).toEqual([])
    expect(e.avisos).toEqual([])
    expect(e.fontesRenda).toHaveLength(1)
  })
})

describe('paraDadosAtuais', () => {
  it('aceita o formato bruto do localStorage v2 ({ state, version })', () => {
    const d = paraDadosAtuais({ state: v2, version: 2 }, TODAY, uid)
    expect(d.objetivos).toHaveLength(3)
  })
  it('aceita backup v3 com envelope', () => {
    const d = paraDadosAtuais({ app: 'x', schemaVersion: 3, dados: { fixos: [], objetivos: [] } }, TODAY, uid)
    expect(d.fontesRenda).toHaveLength(1)
    expect(d.lancamentos).toEqual([])
  })
  it('rejeita arquivos desconhecidos', () => {
    expect(() => paraDadosAtuais({ foo: 1 }, TODAY, uid)).toThrow()
  })
})
