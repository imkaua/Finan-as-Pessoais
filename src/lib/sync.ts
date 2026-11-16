import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { ensureSignedIn, getFirestoreDb, isFirebaseConfigured } from './firebase'
import type { Dados } from '../types'
import { SCHEMA_VERSION } from './migrate'

export { isFirebaseConfigured }

const SYNC_CODE_KEY = 'financas-sync-code'
const COLLECTION = 'financas-sync'
const WORDS = ['sol', 'lua', 'rio', 'mar', 'paz', 'luz', 'flor', 'vale', 'pico', 'onda', 'brisa', 'verde']

export function getSyncCode(): string | null {
  return localStorage.getItem(SYNC_CODE_KEY)
}

export function persistSyncCode(code: string | null) {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code)
  else localStorage.removeItem(SYNC_CODE_KEY)
}

export function normalizeCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '-')
}

export function generateCode(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${pick()}-${pick()}-${num}`
}

/**
 * Os dados da v3 ficam num documento próprio (`<código>--v3`) na mesma coleção,
 * para que um aparelho ainda com a versão antiga do app não sobrescreva o
 * formato novo (e vice-versa). As regras do Firestore já cobrem qualquer id.
 */
const docId = (code: string) => `${normalizeCode(code)}--v${SCHEMA_VERSION}`

export interface RemoteDoc {
  schemaVersion?: number
  updatedAt?: number
  dados?: unknown
}

export async function subscribeToSync(
  code: string,
  onRemoteData: (data: RemoteDoc | null) => void,
  onError: (err: unknown) => void,
): Promise<Unsubscribe | null> {
  const db = getFirestoreDb()
  if (!db) return null
  await ensureSignedIn()
  const ref = doc(db, COLLECTION, docId(code))
  return onSnapshot(
    ref,
    (snap) => {
      // Ignora o eco local da própria escrita (ainda não confirmado pelo
      // servidor) para não sobrescrever uma edição mais nova feita enquanto
      // esse envio estava em andamento.
      if (snap.metadata.hasPendingWrites) return
      onRemoteData(snap.exists() ? (snap.data() as RemoteDoc) : null)
    },
    onError,
  )
}

/** Lê o documento da versão antiga (v2), usado só na primeira conexão da v3. */
export async function readLegacySync(code: string): Promise<unknown | null> {
  const db = getFirestoreDb()
  if (!db) return null
  await ensureSignedIn()
  const snap = await getDoc(doc(db, COLLECTION, normalizeCode(code)))
  if (!snap.exists()) return null
  const { updatedAt: _u, ...data } = snap.data()
  return data
}

export async function pushToSync(code: string, dados: Dados): Promise<void> {
  const db = getFirestoreDb()
  if (!db) return
  await ensureSignedIn()
  const ref = doc(db, COLLECTION, docId(code))
  // O Firestore não aceita `undefined`; o round-trip em JSON remove esses campos.
  const limpo = JSON.parse(JSON.stringify(dados)) as Dados
  await setDoc(ref, { schemaVersion: SCHEMA_VERSION, updatedAt: Date.now(), dados: limpo })
}
