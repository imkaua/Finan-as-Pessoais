import { useId, type ReactNode } from 'react'

interface Base {
  label: string
  hint?: ReactNode
  error?: string | null
}

export function TextField({ label, hint, error, value, onChange, type = 'text', ...rest }: Base & {
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'date' | 'month' | 'number'
  placeholder?: string
  required?: boolean
  min?: string | number
  max?: string | number
  inputMode?: 'decimal' | 'numeric' | 'text'
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-h` : undefined}
        {...rest}
      />
      {error ? (
        <span className="err" id={`${id}-h`}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="hint" id={`${id}-h`}>
            {hint}
          </span>
        )
      )}
    </div>
  )
}

/** Campo de valor em reais, aceita vírgula e separador de milhar. */
export function MoneyField(props: Base & { value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return <TextField {...props} inputMode="decimal" placeholder={props.placeholder ?? '0,00'} />
}

export function SelectField({ label, hint, value, onChange, options }: Base & {
  value: string
  onChange: (v: string) => void
  options: (string | [string, string])[]
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o]
          return (
            <option key={v} value={v}>
              {l}
            </option>
          )
        })}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="field cb">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

/** Sugestões de texto livre (datalist) para campos de categoria. */
export function TextWithSuggestions({ label, hint, value, onChange, suggestions, placeholder, error }: Base & {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} list={`${id}-l`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-invalid={!!error} />
      <datalist id={`${id}-l`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {error ? <span className="err">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  )
}
