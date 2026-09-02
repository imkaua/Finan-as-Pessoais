export function NumberInput({
  value,
  onChange,
  placeholder = '0',
  prefix = 'R$',
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  prefix?: string
  className?: string
}) {
  return (
    <div className="relative">
      {prefix && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        >
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? 0 : ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? 0 : Number(v))
        }}
        onFocus={(e) => e.target.select()}
        className={`w-full rounded-lg border text-sm py-2 tabular-nums outline-none focus:ring-2 focus:ring-[var(--series-1)]/40 ${className}`}
        style={{
          paddingLeft: prefix ? '2.25rem' : '0.75rem',
          paddingRight: '0.75rem',
          borderColor: 'var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}
