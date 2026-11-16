import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { TomStatus } from '../../lib/finance'

export function Card({ title, sub, action, children, className = '' }: {
  title?: ReactNode
  sub?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action || sub) && (
        <div className="card-h">
          {title && <h2>{title}</h2>}
          {sub && <span className="sub num">{sub}</span>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, icon, value, sub, onClick }: {
  label: string
  icon?: string
  value: ReactNode
  sub?: ReactNode
  onClick?: () => void
}) {
  const body = (
    <>
      <div className="l">
        {icon && <Icon name={icon} size={15} />}
        {label}
      </div>
      <div className="v num">{value}</div>
      {sub != null && <div className="s">{sub}</div>}
    </>
  )
  return onClick ? (
    <button type="button" className="card kpi" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="card kpi">{body}</div>
  )
}

export type ChipTom = TomStatus | 'acc'
export function Chip({ tom = 'neutral', children, className = '' }: { tom?: ChipTom; children: ReactNode; className?: string }) {
  return <span className={`chip ${tom === 'neutral' ? '' : tom} ${className}`}>{children}</span>
}

export function Bar({ value, tom = 'ok' }: { value: number; tom?: TomStatus }) {
  const w = Math.min(100, Math.max(0, value * 100))
  return (
    <div className={`bar ${tom === 'warn' || tom === 'bad' ? tom : ''}`} role="presentation">
      <i style={{ width: `${w.toFixed(1)}%` }} />
    </div>
  )
}

export function Ring({ value, size = 118, stroke = 13 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="goal-ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(value * 100)}% concluído`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {value > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.min(1, value)).toFixed(2)} ${c.toFixed(2)}`}
          />
        )}
      </svg>
      <div className="pct num">{Math.round(value * 100)}%</div>
    </div>
  )
}

export function RowButtons({ onEdit, onDelete, label }: { onEdit?: () => void; onDelete?: () => void; label: string }) {
  return (
    <div className="rowbtns">
      {onEdit && (
        <button type="button" className="iconbtn" onClick={onEdit} aria-label={`Editar ${label}`} title="Editar">
          <Icon name="edit" size={16} />
        </button>
      )}
      {onDelete && (
        <button type="button" className="iconbtn" onClick={onDelete} aria-label={`Excluir ${label}`} title="Excluir">
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  )
}

export function Note({ tom, icon, children, className = '' }: { tom?: 'bad' | 'warn'; icon: string; children: ReactNode; className?: string }) {
  return (
    <div className={`note ${tom ?? ''} ${className}`} role={tom ? 'alert' : undefined}>
      <Icon name={icon} size={16} />
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Legend({ items }: { items: { label: string; color: string; value?: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}>
          <i className="dot" style={{ background: it.color }} />
          {it.label}
          {it.value != null && <b className="num">{it.value}</b>}
        </span>
      ))}
    </div>
  )
}
