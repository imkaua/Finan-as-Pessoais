import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  dayCutoffHour: 4,
  card: { closingDay: 1, dueDay: 10 },
  boxYieldPct: 0.8,
  categories: [
    { id: 'moradia', name: 'Moradia', kind: 'fixo' },
    { id: 'contas', name: 'Contas da casa', kind: 'fixo' },
    { id: 'transporte', name: 'Transporte', kind: 'fixo' },
    { id: 'assinaturas', name: 'Assinaturas', kind: 'fixo' },
    { id: 'plano-saude', name: 'Plano de saúde / academia', kind: 'fixo' },
    { id: 'educacao', name: 'Educação', kind: 'fixo' },
    { id: 'mercado', name: 'Mercado', kind: 'variavel' },
    { id: 'compras', name: 'Compras', kind: 'variavel' },
    { id: 'extra', name: 'Extra', kind: 'variavel' },
    { id: 'consultas', name: 'Consultas', kind: 'variavel' },
  ],
  incomeSources: [
    { id: 'assessoria-kaua', name: 'Assessoria Kauã', variable: true },
    { id: 'assessoria-middle', name: 'Assessoria Middle', variable: true },
    { id: 'vida', name: 'Vida', variable: true },
    { id: 'asset-kaua', name: 'Asset Kauã', variable: true },
    { id: 'asset-middle', name: 'Asset Middle', variable: true },
  ],
  specialties: [
    { id: 'clinico', name: 'Clínico geral (check-up)', everyMonths: 12 },
    { id: 'exames', name: 'Exames de sangue', everyMonths: 12 },
    { id: 'dentista', name: 'Dentista', everyMonths: 6 },
    { id: 'oftalmo', name: 'Oftalmologista', everyMonths: 12 },
    { id: 'dermato', name: 'Dermatologista', everyMonths: 12 },
  ],
  goals: [
    { id: 'g-corridas', metric: 'corridas', target: 3, from: '2026-01-01' },
    { id: 'g-musculacao', metric: 'musculacao', target: 3, from: '2026-01-01' },
    { id: 'g-estudo', metric: 'estudoHoras', target: 5, from: '2026-01-01' },
    { id: 'g-reunioes', metric: 'reunioes', target: 5, from: '2026-01-01' },
    { id: 'g-mensagens', metric: 'mensagens', target: 25, from: '2026-01-01' },
    { id: 'g-conteudos', metric: 'conteudos', target: 3, from: '2026-01-01' },
    { id: 'g-revisoes', metric: 'revisoesCobertura', target: 100, from: '2026-01-01' },
  ],
  contentPlatforms: ['Instagram', 'LinkedIn', 'WhatsApp (lista de transmissão)', 'YouTube'],
}

/** Completa configurações salvas com campos novos que versões futuras adicionarem. */
export function withDefaults(saved: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    card: { ...DEFAULT_SETTINGS.card, ...saved?.card },
    categories: saved?.categories ?? DEFAULT_SETTINGS.categories,
    incomeSources: saved?.incomeSources ?? DEFAULT_SETTINGS.incomeSources,
    specialties: saved?.specialties ?? DEFAULT_SETTINGS.specialties,
    goals: saved?.goals ?? DEFAULT_SETTINGS.goals,
    contentPlatforms: saved?.contentPlatforms ?? DEFAULT_SETTINGS.contentPlatforms,
  }
}

export const GOAL_LABELS: Record<string, { label: string; unit: string; period: 'semana' | 'mês' }> = {
  corridas: { label: 'Corridas', unit: 'corridas', period: 'semana' },
  km: { label: 'Quilometragem', unit: 'km', period: 'semana' },
  musculacao: { label: 'Musculação', unit: 'treinos', period: 'semana' },
  estudoHoras: { label: 'Estudo', unit: 'h', period: 'semana' },
  reunioes: { label: 'Reuniões', unit: 'reuniões', period: 'semana' },
  mensagens: { label: 'Mensagens proativas', unit: 'mensagens', period: 'semana' },
  conteudos: { label: 'Conteúdos publicados', unit: 'posts', period: 'semana' },
  revisoesCobertura: { label: 'Cobertura de revisões', unit: '%', period: 'mês' },
}
