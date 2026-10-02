export function brl(value: number, precise = false): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: precise ? 2 : 0,
    minimumFractionDigits: precise ? 2 : 0,
  })
}

/** R$ 1,2 mi / R$ 350 mil — para patrimônio e captação. */
export function brlCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
  if (abs >= 10_000) return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  return brl(value)
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function num(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

/** Rótulo curto para eixo de gráfico: "18 mil", "1,2 mi". */
export function axisMoney(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  return String(Math.round(value))
}
