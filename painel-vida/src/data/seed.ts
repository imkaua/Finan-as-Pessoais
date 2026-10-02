// Dados de EXEMPLO para o modo demonstração. Nunca são gravados na conta real.
import type { Backend } from './backend'
import { DEFAULT_SETTINGS } from './defaults'
import { addDays, addMonthKey, monthKey, weekStart } from '../lib/dates'

/** Gerador pseudoaleatório fixo: a demonstração sai igual toda vez. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export async function seedDemo(backend: Backend, today: string): Promise<void> {
  const r = rng(42)
  const put = (col: Parameters<Backend['put']>[0], id: string, data: Record<string, unknown>) =>
    backend.put(col, id, { createdAt: Date.now(), ...data })
  const start = addDays(weekStart(today), -35) // ~6 semanas de uso
  const thisMonth = monthKey(today)
  const prevMonth = addMonthKey(thisMonth, -1)

  await put('settings', 'main', {
    ...DEFAULT_SETTINGS,
    id: undefined,
    startedAt: start,
    card: { closingDay: 3, dueDay: 10 },
    goals: DEFAULT_SETTINGS.goals.map((g) => ({ ...g, from: start })),
  })

  // Rotina diária
  for (let d = start, i = 0; d <= today; d = addDays(d, 1), i++) {
    const dow = i % 7 // 0 = segunda (start é segunda-feira)
    const skipped = r() < 0.12 && d !== today
    if (d < today && !skipped) put('days', d, { date: d, closed: true, note: '' })
    if (skipped) continue
    if (dow < 5) put('counters', d, { date: d, proactive: Math.round(3 + r() * 5) })
    if (dow === 0 || dow === 2 || dow === 5) {
      const km = Math.round((dow === 5 ? 8 + r() * 3 : 4 + r() * 2) * 10) / 10
      const pace = 330 + Math.round(r() * 50) // 5:30–6:20/km
      put('workouts', `run-${d}`, { date: d, kind: 'corrida', distanceKm: km, durationSec: Math.round(km * pace), rpe: Math.round(5 + r() * 3) })
    }
    if (dow === 1 || dow === 3 || (dow === 4 && r() > 0.5))
      put('workouts', `gym-${d}`, { date: d, kind: 'musculacao', plan: ['A', 'B', 'C'][i % 3], durationSec: 3600, rpe: 7 })
    if (dow < 5 && r() > 0.35) put('studyLogs', `st-${d}`, { date: d, itemId: 'cfp', minutes: 45 + Math.round(r() * 45), progress: r() > 0.6 ? 1 : 0 })
    if (dow < 5 && r() > 0.45)
      put('meetings', `mt-${d}`, { date: d, kind: ['prospeccao', 'diagnostico', 'proposta', 'cliente'][Math.floor(r() * 4)] })
    if (dow === 1 || dow === 4) put('contents', `ct-${d}`, { date: d, platform: r() > 0.4 ? 'Instagram' : 'WhatsApp (lista de transmissão)', title: '' })
  }
  // Estudos
  await put('studyItems', 'cfp', { kind: 'certificacao', name: 'CFP — exemplo', unit: 'módulos', total: 12, done: 5, minutesTotal: 2280, examDate: addDays(today, 150), status: 'ativo', date: start })
  await put('studyItems', 'livro', { kind: 'livro', name: 'Livro de exemplo', unit: 'páginas', total: 320, done: 140, minutesTotal: 600, status: 'ativo', date: start })

  // Clientes (apelidos) e revisões do mês
  const clients = ['Cliente A', 'Cliente B', 'Cliente C', 'Cliente D', 'Cliente E', 'Cliente F', 'Cliente G', 'Cliente H', 'Cliente I', 'Cliente J']
  clients.forEach((alias, i) => put('clients', `cl-${i}`, { alias, since: addDays(start, -200), date: addDays(start, -200) }))
  for (let i = 0; i < 6; i++) put('reviews', `rv-${i}`, { date: addDays(`${thisMonth}-01`, i), clientId: `cl-${i}` })
  for (let i = 0; i < 10; i++) put('reviews', `rvp-${i}`, { date: addDays(`${prevMonth}-01`, i * 2), clientId: `cl-${i}` })

  // Assessoria — 6 meses
  let aum = 18_000_000
  for (let i = 5; i >= 0; i--) {
    const k = addMonthKey(thisMonth, -i)
    const cap = Math.round(400_000 + r() * 900_000)
    const res = Math.round(100_000 + r() * 400_000)
    aum = Math.round(aum + cap - res + aum * 0.008)
    put('advisoryMonths', k, { date: `${k}-01`, captacao: cap, resgates: res, aum: i === 0 ? null : aum, comissao: Math.round(9000 + r() * 4000) })
  }

  // Finanças
  const planned = { moradia: 2200, contas: 450, transporte: 400, assinaturas: 120, 'plano-saude': 380, educacao: 300, mercado: 1100, compras: 600, extra: 500, consultas: 200 }
  const forecast = { 'assessoria-kaua': 7000, 'assessoria-middle': 2500, vida: 800, 'asset-kaua': 1200, 'asset-middle': 500 }
  await put('months', prevMonth, { date: `${prevMonth}-01`, planned, fixedActual: { contas: 510 }, incomeForecast: forecast, incomeReceived: { 'assessoria-kaua': 7400, 'assessoria-middle': 2100, vida: 950, 'asset-kaua': 1200, 'asset-middle': 420 } })
  await put('months', thisMonth, { date: `${thisMonth}-01`, planned, fixedActual: {}, incomeForecast: forecast, incomeReceived: { 'assessoria-kaua': 7150 } })
  const shops = [
    ['mercado', 'Mercado da semana'],
    ['compras', 'Farmácia'],
    ['extra', 'Jantar fora'],
    ['mercado', 'Hortifruti'],
    ['compras', 'Roupa'],
    ['extra', 'Cinema'],
  ]
  for (let d = addDays(today, -40), i = 0; d <= today; d = addDays(d, 3), i++) {
    const [cat, desc] = shops[i % shops.length]
    put('expenses', `ex-${d}`, { date: d, amount: Math.round((cat === 'mercado' ? 180 : 60) + r() * 140), categoryId: cat, description: desc, payment: r() > 0.25 ? 'cartao' : 'pix', origin: 'mes' })
  }

  // Caixinhas
  const boxes: [string, string, number, number, number][] = [
    ['reserva', 'Reserva de emergência', 40000, 1500, 26500],
    ['viagem', 'Viagem', 12000, 800, 4300],
    ['longo', 'Investimentos longo prazo', 0, 1000, 31000],
  ]
  for (const [id, name, goal, plan, balance] of boxes) {
    await put('boxes', id, { name, goal, monthlyPlan: plan })
    await put('boxEvents', `${id}-saldo`, { boxId: id, date: `${prevMonth}-28`, kind: 'saldo', amount: balance })
    await put('boxEvents', `${id}-aporte`, { boxId: id, date: `${thisMonth}-05` > today ? today : `${thisMonth}-05`, kind: 'aporte', amount: plan })
  }
  await put('expenses', 'ex-passagem', { date: addDays(today, -6), amount: 1250, categoryId: 'extra', description: 'Passagem aérea', payment: 'cartao', origin: 'viagem' })

  // Consultas
  await put('appointments', 'ap1', { date: addDays(today, -200), specialtyId: 'dentista', status: 'realizada', amount: 250 })
  await put('appointments', 'ap2', { date: addDays(today, -90), specialtyId: 'clinico', status: 'realizada', amount: 0 })
  await put('appointments', 'ap3', { date: addDays(today, 12), specialtyId: 'oftalmo', status: 'agendada', professional: 'Dra. Exemplo' })

  await put('weeklyReviews', addDays(weekStart(today), -7), {
    date: addDays(weekStart(today), -7),
    wins: 'Bati a meta de mensagens e fiz o longão de sábado.',
    problems: 'Estudei pouco na quinta e sexta.',
    focus: 'Estudar 1h antes do trabalho de seg a qua; 2 reuniões de diagnóstico.',
  })
}
