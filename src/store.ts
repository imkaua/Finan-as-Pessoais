import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, BigExpense, Category, MonthKey } from './types'
import { MONTHS } from './types'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'moradia', name: 'Moradia', colorSlot: 1 },
  { id: 'alimentacao', name: 'Alimentação', colorSlot: 2 },
  { id: 'transporte', name: 'Transporte', colorSlot: 3 },
  { id: 'saude', name: 'Saúde', colorSlot: 4 },
  { id: 'lazer', name: 'Lazer', colorSlot: 5 },
  { id: 'assinaturas', name: 'Assinaturas', colorSlot: 6 },
  { id: 'educacao', name: 'Educação', colorSlot: 7 },
  { id: 'outros', name: 'Outros', colorSlot: 8 },
]

function emptyMonthBudget() {
  return { income: 0, planned: {}, actual: {} }
}

function defaultState(): AppState {
  const months = {} as AppState['months']
  for (const m of MONTHS) months[m.key] = emptyMonthBudget()
  return {
    categories: DEFAULT_CATEGORIES,
    months,
    emergencyFund: {
      goal: 0,
      startingBalance: 0,
      contributions: { '2026-09': 0, '2026-10': 0, '2026-11': 0, '2026-12': 0 },
    },
    bigExpenses: [],
  }
}

interface Store extends AppState {
  setIncome: (month: MonthKey, value: number) => void
  setPlanned: (month: MonthKey, categoryId: string, value: number) => void
  setActual: (month: MonthKey, categoryId: string, value: number) => void
  addCategory: (name: string) => void
  renameCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
  setEmergencyGoal: (value: number) => void
  setEmergencyStarting: (value: number) => void
  setEmergencyContribution: (month: MonthKey, value: number) => void
  addBigExpense: (expense: Omit<BigExpense, 'id'>) => void
  updateBigExpense: (id: string, patch: Partial<Omit<BigExpense, 'id'>>) => void
  removeBigExpense: (id: string) => void
  resetAll: () => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...defaultState(),

      setIncome: (month, value) =>
        set((s) => ({
          months: { ...s.months, [month]: { ...s.months[month], income: value } },
        })),

      setPlanned: (month, categoryId, value) =>
        set((s) => ({
          months: {
            ...s.months,
            [month]: {
              ...s.months[month],
              planned: { ...s.months[month].planned, [categoryId]: value },
            },
          },
        })),

      setActual: (month, categoryId, value) =>
        set((s) => ({
          months: {
            ...s.months,
            [month]: {
              ...s.months[month],
              actual: { ...s.months[month].actual, [categoryId]: value },
            },
          },
        })),

      addCategory: (name) =>
        set((s) => {
          const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
          const usedSlots = new Set(s.categories.map((c) => c.colorSlot))
          let colorSlot = 1
          for (let i = 1; i <= 8; i++) {
            if (!usedSlots.has(i)) {
              colorSlot = i
              break
            }
          }
          return { categories: [...s.categories, { id, name, colorSlot }] }
        }),

      renameCategory: (id, name) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      removeCategory: (id) =>
        set((s) => {
          const months = { ...s.months }
          for (const key of Object.keys(months) as MonthKey[]) {
            const { [id]: _p, ...planned } = months[key].planned
            const { [id]: _a, ...actual } = months[key].actual
            months[key] = { ...months[key], planned, actual }
          }
          return { categories: s.categories.filter((c) => c.id !== id), months }
        }),

      setEmergencyGoal: (value) =>
        set((s) => ({ emergencyFund: { ...s.emergencyFund, goal: value } })),

      setEmergencyStarting: (value) =>
        set((s) => ({ emergencyFund: { ...s.emergencyFund, startingBalance: value } })),

      setEmergencyContribution: (month, value) =>
        set((s) => ({
          emergencyFund: {
            ...s.emergencyFund,
            contributions: { ...s.emergencyFund.contributions, [month]: value },
          },
        })),

      addBigExpense: (expense) =>
        set((s) => ({
          bigExpenses: [...s.bigExpenses, { ...expense, id: Date.now().toString(36) }],
        })),

      updateBigExpense: (id, patch) =>
        set((s) => ({
          bigExpenses: s.bigExpenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      removeBigExpense: (id) =>
        set((s) => ({ bigExpenses: s.bigExpenses.filter((e) => e.id !== id) })),

      resetAll: () => set(defaultState()),
    }),
    { name: 'financas-pessoais-dashboard' },
  ),
)
