export type MonthKey = '2026-09' | '2026-10' | '2026-11' | '2026-12'

export interface MonthInfo {
  key: MonthKey
  label: string
  short: string
}

export const MONTHS: MonthInfo[] = [
  { key: '2026-09', label: 'Setembro', short: 'Set' },
  { key: '2026-10', label: 'Outubro', short: 'Out' },
  { key: '2026-11', label: 'Novembro', short: 'Nov' },
  { key: '2026-12', label: 'Dezembro', short: 'Dez' },
]

export interface Category {
  id: string
  name: string
  colorSlot: number
}

export interface IncomeSource {
  id: string
  name: string
  colorSlot: number
}

export interface MonthBudget {
  income: Record<string, number>
  planned: Record<string, number>
  actual: Record<string, number>
}

export interface EmergencyFundState {
  goal: number
  startingBalance: number
  contributions: Record<MonthKey, number>
}

export interface BigExpense {
  id: string
  name: string
  totalAmount: number
  savedSoFar: number
  targetDate: string
  notes: string
}

export interface AppState {
  categories: Category[]
  incomeSources: IncomeSource[]
  months: Record<MonthKey, MonthBudget>
  emergencyFund: EmergencyFundState
  bigExpenses: BigExpense[]
}
