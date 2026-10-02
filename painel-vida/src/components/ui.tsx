import type { CSSProperties } from 'react'
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${className}`} style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
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
    </section>
  )
}

export function Stat({ label, value, hint, tone = 'neutral' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'neutral' | 'good' | 'critical' }) {
  const color = tone === 'good' ? 'var(--success-text)' : tone === 'critical' ? 'var(--status-critical)' : 'var(--text-primary)'
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="text-xl font-semibold mt-1 tabular-nums" style={{ color }}>
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

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs ${className}`} style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

const inputStyle = {
  borderColor: 'var(--border)',
  background: 'var(--surface-1)',
  color: 'var(--text-primary)',
}
const inputClass = 'w-full rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40'

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} style={inputStyle} />
}

export function TextArea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      style={inputStyle}
    />
  )
}

/** Aceita vírgula ou ponto ("1.234,56", "12,5", "12.5"). */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s|R\$/g, '')
  if (!t) return null
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function fmtInput(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return ''
  return String(n).replace('.', ',')
}

/**
 * Campo numérico com teclado decimal. Usa type="text" porque o type="number"
 * do iPhone em português não aceita vírgula.
 */
export function NumberField({
  value,
  onChange,
  prefix,
  suffix,
  placeholder = '0',
  commitOnBlur = false,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  /** Só envia ao sair do campo (evita uma gravação por tecla em campos sincronizados). */
  commitOnBlur?: boolean
}) {
  const [text, setText] = useState(fmtInput(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(fmtInput(value))
  }, [value, focused])
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onChange={(e) => {
          setText(e.target.value)
          if (!commitOnBlur) onChange(parseNumber(e.target.value))
        }}
        onBlur={() => {
          setFocused(false)
          const n = parseNumber(text)
          if (commitOnBlur && n !== (value ?? null)) onChange(n)
        }}
        className={`${inputClass} tabular-nums`}
        style={{ ...inputStyle, paddingLeft: prefix ? '2.4rem' : undefined, paddingRight: suffix ? '2.6rem' : undefined }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass} style={inputStyle}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: 'var(--series-1)', color: '#fff', borderColor: 'transparent' },
    secondary: { background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'transparent' },
    danger: { background: 'transparent', color: 'var(--status-critical)', borderColor: 'transparent' },
  }
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border text-sm font-medium px-3 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ ...styles[variant], ...props.style }}
    />
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg p-0.5 flex-wrap" style={{ background: 'var(--surface-2)' }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer"
            style={{
              background: active ? 'var(--surface-1)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : undefined,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Progress({ value, max, color = 'var(--series-1)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export type Tone = 'good' | 'warning' | 'critical' | 'neutral'
const TONE: Record<Tone, { color: string; icon: string }> = {
  good: { color: 'var(--status-good)', icon: '✓' },
  warning: { color: 'var(--status-warning)', icon: '!' },
  critical: { color: 'var(--status-critical)', icon: '✕' },
  neutral: { color: 'var(--text-muted)', icon: '•' },
}

/** Status sempre com ícone + texto (nunca só cor). */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONE[tone]
  return (
    <span className="inline-flex items-start gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
      <span
        className="inline-flex shrink-0 items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
        style={{ background: t.color, color: '#fff' }}
        aria-hidden
      >
        {t.icon}
      </span>
      {children}
    </span>
  )
}

export function Row({ children, onDelete }: { children: ReactNode; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-xs cursor-pointer px-2 py-1"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Excluir"
          title="Excluir (vai para a lixeira)"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm py-3" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const cls = cols === 4 ? 'grid-cols-2 lg:grid-cols-4' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
  return <div className={`grid gap-3 ${cls}`}>{children}</div>
}
