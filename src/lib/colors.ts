export function seriesVar(slot: number): string {
  const n = ((slot - 1) % 8) + 1
  return `var(--series-${n})`
}
