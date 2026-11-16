import type { Dados } from '../types'
import { paraDadosAtuais, SCHEMA_VERSION } from './migrate'
import { todayISO } from './dates'

export const BACKUP_APP = 'minhas-financas'

export interface Backup {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportadoEm: string
  dados: Dados
}

export function montarBackup(dados: Dados): Backup {
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportadoEm: new Date().toISOString(), dados }
}

/** Baixa um arquivo .json com todos os dados. */
export function exportarBackup(dados: Dados) {
  const blob = new Blob([JSON.stringify(montarBackup(dados), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `minhas-financas-${todayISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lê um arquivo de backup (v2 ou v3) e devolve os dados no formato atual. */
export async function lerBackup(file: File, uid: () => string): Promise<Dados> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  return paraDadosAtuais(json, todayISO(), uid)
}
