import { useState } from 'react'
import { Card } from './Card'
import type { useCloudSync } from '../hooks/useCloudSync'

const STATUS_LABEL: Record<string, string> = {
  off: 'Não sincronizado',
  connecting: 'Conectando…',
  synced: 'Sincronizado',
  error: 'Erro de sincronização',
}

const STATUS_COLOR: Record<string, string> = {
  off: 'var(--text-muted)',
  connecting: 'var(--status-warning)',
  synced: 'var(--success-text)',
  error: 'var(--status-critical)',
}

export function SyncSection({ sync }: { sync: ReturnType<typeof useCloudSync> }) {
  const { code, status, error, createCode, joinCode, disconnect, isFirebaseConfigured } = sync
  const [joinValue, setJoinValue] = useState('')
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Sincronização entre aparelhos</h2>
      <p className="text-sm -mt-3" style={{ color: 'var(--text-secondary)' }}>
        Use o mesmo código em dois aparelhos (celular e computador, por exemplo) para ver os
        mesmos dados nos dois, atualizando automaticamente.
      </p>

      {!isFirebaseConfigured && (
        <Card>
          <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
            A sincronização na nuvem ainda não foi configurada neste site. Fale com quem
            configurou o dashboard para concluir esse passo.
          </p>
        </Card>
      )}

      {isFirebaseConfigured && !code && (
        <>
          <Card title="Este é o primeiro aparelho" subtitle="Crie um código novo aqui">
            <button
              onClick={createCode}
              className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer text-white"
              style={{ background: 'var(--series-1)' }}
            >
              Criar código de sincronização
            </button>
          </Card>

          <Card title="Já tenho um código" subtitle="Criado em outro aparelho">
            <form
              className="flex gap-2 max-w-md"
              onSubmit={(e) => {
                e.preventDefault()
                joinCode(joinValue)
              }}
            >
              <input
                value={joinValue}
                onChange={(e) => setJoinValue(e.target.value)}
                placeholder="ex: sol-lua-4821"
                className="flex-1 rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--series-1)]/40"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
              />
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer text-white"
                style={{ background: 'var(--series-1)' }}
              >
                Conectar
              </button>
            </form>
          </Card>
        </>
      )}

      {isFirebaseConfigured && code && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: STATUS_COLOR[status] }}
            />
            <span className="text-sm font-medium" style={{ color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Seu código de sincronização
          </p>
          <div className="flex items-center gap-2 max-w-md mb-1">
            <code
              className="flex-1 rounded-lg border px-3 py-2 text-sm tabular-nums"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              {code}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(code)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Digite esse mesmo código no outro aparelho, na aba "Sincronização", em "Já tenho um
            código".
          </p>

          {error && (
            <p className="text-xs mb-4" style={{ color: 'var(--status-critical)' }}>
              {error}
            </p>
          )}

          <button
            onClick={disconnect}
            className="text-xs cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            Desconectar este aparelho da sincronização
          </button>
        </Card>
      )}

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Qualquer pessoa que souber esse código consegue ver e editar esses dados — trate-o como
        uma senha simples e não compartilhe publicamente.
      </p>
    </div>
  )
}
