/** Aceita o formato brasileiro e o com ponto: "1.234,56", "1.270.958", "12,5", "12.5". */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s|R\$/g, '')
  if (!t) return null
  let normalized: string
  if (t.includes(',')) normalized = t.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) normalized = t.replace(/\./g, '') // pontos de milhar
  else normalized = t
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
