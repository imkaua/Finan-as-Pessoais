import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border)',
      }}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'critical'
  hint?: string
}) {
  const color =
    tone === 'good' ? 'var(--success-text)' : tone === 'critical' ? 'var(--status-critical)' : 'var(--text-primary)'
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
