export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatBRLPrecise(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, (month ?? 1) - 1, day ?? 1)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
