import { Component, type ReactNode } from 'react'

/** Um erro numa aba não derruba o app inteiro — e os dados continuam salvos. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <p className="font-semibold">Esta tela encontrou um erro.</p>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
          Seus dados estão salvos. As outras abas continuam funcionando. Detalhe técnico: {this.state.error.message}
        </p>
      </div>
    )
  }
}
