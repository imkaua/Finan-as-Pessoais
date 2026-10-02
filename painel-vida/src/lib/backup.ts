import type { Backend, AnyDoc } from '../data/backend'
import { ALL_COLLECTIONS, SCHEMA_VERSION, type CollectionName } from '../data/types'
import { toISO } from './dates'

const LAST_EXPORT_KEY = 'painel-vida-ultimo-backup'

interface BackupFile {
  app: 'painel-vida'
  schema: number
  exportedAt: string
  collections: Record<string, AnyDoc[]>
}

/** Baixa TUDO (inclusive o que está fora da janela "ao vivo"). Retorna o nº de registros. */
export async function exportAll(backend: Backend): Promise<number> {
  const names: (CollectionName | 'settings')[] = [...ALL_COLLECTIONS, 'settings']
  const entries = await Promise.all(names.map(async (c) => [c, await backend.fetchAll(c)] as const))
  const file: BackupFile = {
    app: 'painel-vida',
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    collections: Object.fromEntries(entries),
  }
  const blob = new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `painel-vida-backup-${toISO(new Date())}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return entries.reduce((n, [, docs]) => n + docs.length, 0)
}

export async function importAll(backend: Backend, text: string): Promise<number> {
  const file = JSON.parse(text) as BackupFile
  if (file.app !== 'painel-vida' || typeof file.collections !== 'object') throw new Error('Arquivo não é um backup do Painel de Vida')
  const allowed = new Set<string>([...ALL_COLLECTIONS, 'settings'])
  let n = 0
  for (const [col, docs] of Object.entries(file.collections)) {
    if (!allowed.has(col)) continue
    for (const d of docs) {
      const { id, ...rest } = d
      await backend.put(col as CollectionName, String(id), rest)
      n++
    }
  }
  return n
}

export function markExported() {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, toISO(new Date()))
  } catch {
    /* sem armazenamento local */
  }
}

export function lastExport(): string | null {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY)
  } catch {
    return null
  }
}
