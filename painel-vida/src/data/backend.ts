// Camada de armazenamento. Duas implementações com a mesma interface:
// - Firestore (padrão): users/{uid}/{coleção}/{id}, com cache offline.
// - Local (?demo na URL): localStorage, só para testar sem login.
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import { SCHEMA_VERSION, type CollectionName } from './types'

export type AnyDoc = { id: string } & Record<string, unknown>

export interface Backend {
  /** `fromServer` = resposta confirmada pelo servidor (não só o cache local do aparelho). */
  subscribe(col: CollectionName | 'settings', sinceDate: string | null, cb: (docs: AnyDoc[], fromServer: boolean) => void, onError: (e: unknown) => void): () => void
  /** Grava (mescla) campos no documento. `null` em um campo o remove. */
  put(col: CollectionName | 'settings', id: string, data: Record<string, unknown>): Promise<void>
  increment(col: CollectionName, id: string, field: string, delta: number, extra: Record<string, unknown>): Promise<void>
  fetchAll(col: CollectionName | 'settings'): Promise<AnyDoc[]>
}

// Mesmo projeto do app de finanças, mas com um "app" Firebase de nome próprio:
// o login (Google) e o cache offline ficam separados do login anônimo daquele app.
const firebaseConfig = {
  apiKey: 'AIzaSyCIBSn_Y9eyYwatay2flcGS7vlvrSoTDj4',
  authDomain: 'our-finance-7e979.firebaseapp.com',
  projectId: 'our-finance-7e979',
  storageBucket: 'our-finance-7e979.firebasestorage.app',
  messagingSenderId: '49452472297',
  appId: '1:49452472297:web:0986ecb7467656c1d71d78',
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

function ensure() {
  if (!app) {
    app = initializeApp(firebaseConfig, 'painel-vida')
    auth = getAuth(app)
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return { auth: auth!, db: db! }
}

export function watchUser(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(ensure().auth, (u) => cb(u && !u.isAnonymous ? u : null))
}

export async function signInGoogle(): Promise<void> {
  const { auth } = ensure()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw err
  }
}

export function signOutGoogle(): Promise<void> {
  return signOut(ensure().auth)
}

function clean(data: Record<string, unknown>, forMerge: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    out[k] = v === null && forMerge ? deleteField() : v
  }
  return out
}

export function firestoreBackend(uid: string): Backend {
  const { db } = ensure()
  const colRef = (col: string) => collection(db, 'users', uid, col)
  return {
    subscribe(col, sinceDate, cb, onError) {
      const q = sinceDate ? query(colRef(col), where('date', '>=', sinceDate)) : colRef(col)
      return onSnapshot(
        q,
        { includeMetadataChanges: col === 'settings' },
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AnyDoc), !snap.metadata.fromCache),
        onError,
      )
    },
    async put(col, id, data) {
      await setDoc(
        doc(db, 'users', uid, col, id),
        { ...clean(data, true), v: SCHEMA_VERSION, updatedAt: Date.now() },
        { merge: true },
      )
    },
    async increment(col, id, field, delta, extra) {
      await setDoc(
        doc(db, 'users', uid, col, id),
        { ...clean(extra, false), [field]: increment(delta), v: SCHEMA_VERSION, updatedAt: Date.now() },
        { merge: true },
      )
    },
    async fetchAll(col) {
      const snap = await getDocs(colRef(col))
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as AnyDoc)
    },
  }
}

// ---------- Modo demonstração (localStorage) ----------

const LOCAL_KEY = 'painel-vida-demo'

export function localBackend(): Backend {
  type Store = Record<string, Record<string, AnyDoc>>
  const read = (): Store => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Store
    } catch {
      return {}
    }
  }
  let store = read()
  const listeners = new Set<() => void>()
  const save = () => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(store))
    } catch {
      /* armazenamento indisponível: mantém em memória */
    }
    listeners.forEach((l) => l())
  }
  const list = (col: string) => Object.values(store[col] ?? {})

  return {
    subscribe(col, sinceDate, cb) {
      const emit = () => cb(list(col).filter((d) => !sinceDate || String(d.date ?? '') >= sinceDate), true)
      listeners.add(emit)
      queueMicrotask(emit)
      return () => listeners.delete(emit)
    },
    async put(col, id, data) {
      const current = store[col]?.[id] ?? { id }
      const next: AnyDoc = { ...current, v: SCHEMA_VERSION, updatedAt: Date.now() }
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue
        if (v === null) delete next[k]
        else if (typeof v === 'object' && !Array.isArray(v) && typeof next[k] === 'object' && next[k] !== null)
          next[k] = { ...(next[k] as object), ...v } // mescla mapas como o Firestore faz
        else next[k] = v
      }
      store = { ...store, [col]: { ...store[col], [id]: next } }
      save()
    },
    async increment(col, id, field, delta, extra) {
      const current = store[col]?.[id] ?? { id }
      const value = Number(current[field] ?? 0) + delta
      await this.put(col, id, { ...extra, [field]: value })
    },
    async fetchAll(col) {
      return list(col)
    },
  }
}
