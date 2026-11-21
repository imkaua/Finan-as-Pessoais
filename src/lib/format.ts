const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Valor em reais com centavos (R$ 1.234,56). */
export const BRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0)

/** Valor abreviado para eixos de gráfico (R$ 12,5k). */
export const BRLk = (v: number) =>
  Math.abs(v) >= 1000
    ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    : `R$ ${Math.round(v).toLocaleString('pt-BR')}`

export const pct = (v: number) => `${Math.round((Number.isFinite(v) ? v : 0) * 100)}%`

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * Converte texto digitado em número, aceitando "1.234,56", "1234,56" e "1234.56".
 * Retorna NaN se não for um número.
 */
export function parseValor(txt: string): number {
  const s = String(txt).trim().replace(/[R$\s]/g, '')
  if (!s) return NaN
  let norm = s
  if (s.includes(',')) norm = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) norm = s.replace(/\./g, '') // "1.234" = mil, não 1,234
  return Number(norm)
}

/** Formata para exibir num campo editável (sem símbolo, com vírgula). */
export const valorParaCampo = (v: number | undefined | null) =>
  v == null || !Number.isFinite(v) ? '' : String(Math.round(v * 100) / 100).replace('.', ',')

/** "10% da renda" ou "10% de Salário + Vida", para gastos percentuais. */
export function descreverPercentual(
  percentual: number,
  baseFontes: string[] | null | undefined,
  fontes: { id: string; nome: string }[],
): string {
  const p = `${(Math.round(percentual * 10000) / 100).toLocaleString('pt-BR')}%`
  const nomes = (baseFontes ?? []).map((id) => fontes.find((f) => f.id === id)?.nome).filter(Boolean)
  return nomes.length && nomes.length < fontes.length ? `${p} de ${nomes.join(' + ')}` : `${p} da renda`
}
