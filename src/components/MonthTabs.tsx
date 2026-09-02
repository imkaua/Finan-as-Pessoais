import { MONTHS, type MonthKey } from '../types'

export function MonthTabs({
  value,
  onChange,
}: {
  value: MonthKey
  onChange: (m: MonthKey) => void
}) {
  return (
    <div
      className="inline-flex rounded-xl border p-1 gap-1"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      {MONTHS.map((m) => {
        const active = m.key === value
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: active ? 'var(--surface-1)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: active ? '0 1px 2px var(--border)' : 'none',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
