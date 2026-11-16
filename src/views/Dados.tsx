import { useRef, useState } from 'react'
import { Card, Note } from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { useModal } from '../components/ui/Modal'
import { BACKUP_V2_KEY, getDados, uid, useStore } from '../store'
import { exportarBackup, lerBackup } from '../lib/backup'
import { plural } from '../lib/format'
import { SYNC_COLOR, SYNC_LABEL, type useCloudSync } from '../hooks/useCloudSync'

function temBackupV2() {
  try {
    return !!localStorage.getItem(BACKUP_V2_KEY)
  } catch {
    return false
  }
}

export function Dados({ sync }: { sync: ReturnType<typeof useCloudSync> }) {
  const { code, status, error, createCode, joinCode, disconnect, isFirebaseConfigured } = sync
  const { confirm, toast } = useModal()
  const store = useStore()
  const [joinValue, setJoinValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setImportErr(null)
    try {
      const d = await lerBackup(file, uid)
      const resumo = [
        plural(d.fixos.length, 'gasto fixo', 'gastos fixos'),
        plural(d.assinaturas.length, 'assinatura', 'assinaturas'),
        plural(d.lancamentos.length, 'lançamento', 'lançamentos'),
        plural(d.pagamentos.length, 'pagamento', 'pagamentos'),
        plural(d.objetivos.length, 'objetivo', 'objetivos'),
      ].join(', ')
      confirm({
        title: 'Substituir todos os dados?',
        text: `O backup tem ${resumo}. Tudo o que está neste navegador${code ? ' (e na sincronização)' : ''} será trocado por ele. Exporte um backup antes, se quiser guardar o estado atual.`,
        confirmLabel: 'Importar',
        danger: true,
        onConfirm: () => {
          store.substituirTudo(d)
          toast('Backup importado')
        },
      })
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const baixarV2 = () => {
    const raw = localStorage.getItem(BACKUP_V2_KEY)
    if (!raw) return
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'minhas-financas-versao-antiga.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card title="Backup">
        <p className="text-muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Baixe um arquivo com todos os seus dados ou restaure um backup salvo antes. Arquivos da versão anterior do dashboard também
          são aceitos e convertidos automaticamente.
        </p>
        <div className="actions">
          <button className="btn" onClick={() => exportarBackup(getDados())}>
            <Icon name="download" size={16} />
            Exportar backup (.json)
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} />
            Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {importErr && (
          <Note tom="bad" icon="alert" className="mt-3.5">
            {importErr}
          </Note>
        )}
        {temBackupV2() && (
          <p className="text-muted" style={{ fontSize: 12.5, marginTop: 14, marginBottom: 0 }}>
            Uma cópia dos dados da versão anterior foi guardada neste navegador antes da atualização.{' '}
            <button className="btn link" style={{ display: 'inline', padding: 0, textDecoration: 'underline' }} onClick={baixarV2}>
              Baixar cópia antiga
            </button>
          </p>
        )}
      </Card>

      <Card title="Sincronização entre aparelhos">
        <p className="text-muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Use o mesmo código em dois aparelhos (celular e computador, por exemplo) para ver os mesmos dados nos dois, atualizando
          automaticamente.
        </p>

        {!isFirebaseConfigured && (
          <Note tom="bad" icon="alert">
            A sincronização na nuvem ainda não foi configurada neste site.
          </Note>
        )}

        {isFirebaseConfigured && !code && (
          <div className="flex flex-col gap-4">
            <div>
              <b>Este é o primeiro aparelho</b>
              <div className="mt-2">
                <button className="btn" onClick={createCode}>
                  <Icon name="cloud" size={16} />
                  Criar código de sincronização
                </button>
              </div>
            </div>
            <hr className="sep" style={{ margin: 0 }} />
            <form
              onSubmit={(e) => {
                e.preventDefault()
                joinCode(joinValue)
              }}
            >
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="join">Já tenho um código criado em outro aparelho</label>
                <input id="join" value={joinValue} onChange={(e) => setJoinValue(e.target.value)} placeholder="ex: sol-lua-4821" />
              </div>
              <button type="submit" className="btn ghost">
                Conectar
              </button>
            </form>
          </div>
        )}

        {isFirebaseConfigured && code && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="sync-dot" style={{ background: SYNC_COLOR[status] }} />
              <b style={{ color: SYNC_COLOR[status] }}>{SYNC_LABEL[status]}</b>
            </div>
            <div className="field" style={{ marginBottom: 6 }}>
              <label>Seu código de sincronização</label>
              <div className="flex gap-2">
                <code className="flex-1 num" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface-2)' }}>
                  {code}
                </code>
                <button
                  className="btn ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(code)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <span className="hint">Digite esse mesmo código no outro aparelho, em “Dados e sincronização”.</span>
            </div>
            {error && (
              <Note tom="bad" icon="alert" className="my-3">
                {error}
              </Note>
            )}
            <button className="btn link" style={{ paddingLeft: 0 }} onClick={disconnect}>
              Desconectar este aparelho
            </button>
          </div>
        )}

        <p className="text-muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
          Qualquer pessoa que souber esse código consegue ver e editar esses dados — trate-o como uma senha simples.
        </p>
      </Card>

      <Card title="Apagar dados">
        <p className="text-muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Remove tudo o que está salvo neste navegador{code ? ' e na sincronização' : ''}.
        </p>
        <button
          className="btn danger"
          onClick={() =>
            confirm({
              title: 'Apagar todos os dados?',
              text: 'Gastos, pagamentos, assinaturas, objetivos e limites serão apagados. Exporte um backup antes se quiser guardar.',
              confirmLabel: 'Apagar tudo',
              danger: true,
              onConfirm: () => store.limparTudo(),
            })
          }
        >
          <Icon name="trash" size={16} />
          Apagar todos os dados
        </button>
      </Card>
    </div>
  )
}
