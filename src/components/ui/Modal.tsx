import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

interface ConfirmOpts {
  title: string
  text: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

interface ModalApi {
  open: (content: ReactNode) => void
  close: () => void
  confirm: (o: ConfirmOpts) => void
  toast: (msg: string) => void
}

const Ctx = createContext<ModalApi | null>(null)

export function useModal(): ModalApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useModal fora do ModalProvider')
  return c
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const open = useCallback((c: ReactNode) => {
    if (!lastFocus.current) lastFocus.current = document.activeElement as HTMLElement | null
    setContent(c)
  }, [])
  const close = useCallback(() => {
    setContent(null)
    lastFocus.current?.focus?.()
    lastFocus.current = null
  }, [])
  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastMsg(null), 2600)
  }, [])
  const confirm = useCallback(
    (o: ConfirmOpts) => open(<ConfirmDialog {...o} />),
    [open],
  )

  useEffect(() => {
    if (!content) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [content, close])

  return (
    <Ctx.Provider value={{ open, close, confirm, toast }}>
      {children}
      {content && (
        <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          {content}
        </div>
      )}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  )
}

/** Folha de formulário dentro do modal, com rodapé padrão. */
export function FormSheet({
  title,
  onSubmit,
  onDelete,
  deleteText,
  saveLabel = 'Salvar',
  children,
}: {
  title: string
  /** Retorne `false` para manter o modal aberto (ex.: validação). */
  onSubmit: () => boolean | void
  onDelete?: () => void
  deleteText?: string
  saveLabel?: string
  children: ReactNode
}) {
  const { close, confirm } = useModal()
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input,select,textarea')?.focus()
  }, [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (onSubmit() !== false) close()
  }
  return (
    <form ref={ref} className="sheet" onSubmit={submit} role="dialog" aria-modal="true" aria-label={title} noValidate>
      <h2>{title}</h2>
      {children}
      <div className="sheet-foot">
        {onDelete && (
          <button
            type="button"
            className="btn danger sm"
            onClick={() =>
              confirm({
                title: `Excluir “${title.replace(/^Editar\s+/i, '')}”?`,
                text: deleteText ?? 'Esta ação não pode ser desfeita.',
                confirmLabel: 'Excluir',
                danger: true,
                onConfirm: onDelete,
              })
            }
          >
            Excluir
          </button>
        )}
        <div className="r">
          <button type="button" className="btn ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn">
            {saveLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

function ConfirmDialog({ title, text, confirmLabel = 'Confirmar', danger, onConfirm }: ConfirmOpts) {
  const { close } = useModal()
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => btn.current?.focus(), [])
  return (
    <div className="sheet" role="alertdialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      <p style={{ color: 'var(--muted)', margin: 0 }}>{text}</p>
      <div className="sheet-foot">
        <div className="r">
          <button type="button" className="btn ghost" onClick={close}>
            Cancelar
          </button>
          <button
            ref={btn}
            type="button"
            className={`btn ${danger ? 'danger' : ''}`}
            onClick={() => {
              onConfirm()
              close()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
