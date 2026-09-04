import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Cole aqui o objeto "firebaseConfig" que aparece no Firebase Console em
// Configurações do projeto > Geral > Seus apps > SDK setup and configuration.
// Esses valores não são segredo: são feitos para ficar no código do site.
const firebaseConfig = {
  apiKey: 'COLE_AQUI_SUA_API_KEY',
  authDomain: 'COLE_AQUI.firebaseapp.com',
  projectId: 'COLE_AQUI',
  storageBucket: 'COLE_AQUI.appspot.com',
  messagingSenderId: 'COLE_AQUI',
  appId: 'COLE_AQUI',
}

export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith('COLE_AQUI')

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

function ensureApp() {
  if (!isFirebaseConfigured) return null
  if (!app) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  }
  return { app, auth: auth!, db: db! }
}

export function getFirestoreDb(): Firestore | null {
  return ensureApp()?.db ?? null
}

export function ensureSignedIn(): Promise<string | null> {
  const ctx = ensureApp()
  if (!ctx) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      ctx.auth,
      (user) => {
        unsubscribe()
        if (user) {
          resolve(user.uid)
        } else {
          signInAnonymously(ctx.auth)
            .then((cred) => resolve(cred.user.uid))
            .catch(reject)
        }
      },
      reject,
    )
  })
}
