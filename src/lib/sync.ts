import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { ensureSignedIn, getFirestoreDb, isFirebaseConfigured } from './firebase'
import type { AppState } from '../types'

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

export type RemoteAppData = AppState & { updatedAt?: number }

export async function subscribeToSync(
  code: string,
  onRemoteData: (data: RemoteAppData | null) => void,
  onError: (err: unknown) => void,
): Promise<Unsubscribe | null> {
  const db = getFirestoreDb()
  if (!db) return null
  await ensureSignedIn()
  const ref = doc(db, COLLECTION, normalizeCode(code))
  return onSnapshot(
    ref,
    (snap) => {
      // Ignora o eco local da própria escrita (ainda não confirmado pelo
      // servidor) para não sobrescrever uma edição mais nova feita enquanto
      // esse envio estava em andamento.
      if (snap.metadata.hasPendingWrites) return
      onRemoteData(snap.exists() ? (snap.data() as RemoteAppData) : null)
    },
    onError,
  )
}

export async function pushToSync(code: string, state: AppState): Promise<void> {
  const db = getFirestoreDb()
  if (!db) return
  await ensureSignedIn()
  const ref = doc(db, COLLECTION, normalizeCode(code))
  await setDoc(ref, { ...state, updatedAt: Date.now() })
}
