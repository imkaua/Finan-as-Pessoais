import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Backend } from './backend'
import { ALL_COLLECTIONS, WINDOWED, type CollectionName, type Collections, type Settings } from './types'
import { withDefaults } from './defaults'
import { addDays, logicalToday, toISO } from '../lib/dates'

/** Quantos dias de histórico ficam "ao vivo". O resto é lido sob demanda. */
export const LIVE_WINDOW_DAYS = 400

type Data = { [K in CollectionName]: Collections[K][] }

interface DataApi {
  data: Data
  settings: Settings
  today: string
  ready: boolean
  error: string | null
  backend: Backend
  windowStart: string
  newId: () => string
  save: <K extends CollectionName>(col: K, doc: Partial<Collections[K]> & { id?: string }) => Promise<string>
  remove: (col: CollectionName, id: string) => Promise<void>
  restore: (col: CollectionName, id: string) => Promise<void>
  increment: (col: CollectionName, id: string, field: string, delta: number, extra: Record<string, unknown>) => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  /** Configurações já confirmadas pelo servidor (seguro editar listas). */
  settingsSynced: boolean
}

const Ctx = createContext<DataApi | null>(null)

function emptyData(): Data {
  const d = {} as Record<CollectionName, unknown[]>
  for (const c of ALL_COLLECTIONS) d[c] = []
  return d as Data
}

function useToday(cutoff: number): string {
  const [today, setToday] = useState(() => logicalToday(cutoff))
  useEffect(() => {
    // O app pode ficar aberto de um dia para o outro: confere o dia a cada minuto
    // e ao voltar para a aba.
    const tick = () => setToday(logicalToday(cutoff))
    tick()
    const t = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [cutoff])
  return today
}

export function DataProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyData)
  const [savedSettings, setSavedSettings] = useState<Partial<Settings> | undefined>()
  const [settingsFromServer, setSettingsFromServer] = useState(false)
  const settingsSyncedRef = useRef(false)
  settingsSyncedRef.current = settingsFromServer && !!savedSettings
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const settings = useMemo(() => withDefaults(savedSettings), [savedSettings])
  const today = useToday(settings.dayCutoffHour)
  // Janela fixa ao abrir o app (não muda a cada dia para não reabrir assinaturas).
  const [windowStart] = useState(() => addDays(toISO(new Date()), -LIVE_WINDOW_DAYS))

  useEffect(() => {
    const onError = (e: unknown) => {
      console.error(e)
      setError('Não foi possível ler seus dados. Confira a internet — o que você registrar fica salvo no aparelho e sobe quando a conexão voltar.')
    }
    const markLoaded = (name: string) =>
      setLoaded((prev) => (prev.has(name) ? prev : new Set(prev).add(name)))
    const unsubs = ALL_COLLECTIONS.map((col) =>
      backend.subscribe(
        col,
        WINDOWED.includes(col) ? windowStart : null,
        (docs) => {
          setData((prev) => ({ ...prev, [col]: docs }))
          markLoaded(col)
        },
        onError,
      ),
    )
    unsubs.push(
      backend.subscribe(
        'settings',
        null,
        (docs, fromServer) => {
          setSavedSettings(docs.find((d) => d.id === 'main') as Partial<Settings> | undefined)
          if (fromServer) setSettingsFromServer(true)
          markLoaded('settings')
        },
        onError,
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [backend, windowStart])

  const newId = useCallback(() => crypto.randomUUID(), [])

  const save = useCallback<DataApi['save']>(
    async (col, doc) => {
      const id = doc.id ?? crypto.randomUUID()
      const { id: _id, ...rest } = doc
      const payload: Record<string, unknown> = { ...rest }
      if (!doc.id) payload.createdAt = Date.now()
      await backend.put(col, id, payload)
      return id
    },
    [backend],
  )

  const remove = useCallback(
    (col: CollectionName, id: string) => backend.put(col, id, { deletedAt: Date.now() }),
    [backend],
  )
  const restore = useCallback((col: CollectionName, id: string) => backend.put(col, id, { deletedAt: null }), [backend])
  const increment = useCallback<DataApi['increment']>(
    (col, id, field, delta, extra) => backend.increment(col, id, field, delta, extra),
    [backend],
  )
  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!settingsSyncedRef.current) throw new Error('Configurações ainda não sincronizadas')
      // Grava só os campos alterados; o resto da configuração fica intacto.
      await backend.put('settings', 'main', { ...patch, id: undefined })
    },
    [backend],
  )

  const ready = loaded.size >= ALL_COLLECTIONS.length + 1

  // Primeiro acesso: grava as configurações padrão com a data de início. Assim as
  // metas e categorias ficam fixas na conta, mesmo que os padrões do código mudem.
  // Só com resposta do SERVIDOR: num aparelho novo e offline o cache vem vazio, e
  // gravar os padrões aí sobrescreveria as configurações reais da conta.
  useEffect(() => {
    if (!settingsFromServer) return
    if (!savedSettings) {
      const defaults = withDefaults(undefined)
      backend.put('settings', 'main', {
        ...defaults,
        id: undefined,
        startedAt: today,
        goals: defaults.goals.map((g) => ({ ...g, from: today })),
      })
    } else if (savedSettings && !savedSettings.startedAt) {
      backend.put('settings', 'main', { startedAt: today })
    }
  }, [settingsFromServer, savedSettings, backend, today])

  const value: DataApi = {
    data,
    settings,
    today,
    ready,
    error,
    backend,
    windowStart,
    newId,
    save,
    remove,
    restore,
    increment,
    saveSettings,
    settingsSynced: settingsFromServer && !!savedSettings,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}

/** Atalho: documentos não excluídos de uma coleção. */
export function useLive<K extends CollectionName>(col: K): Collections[K][] {
  const { data } = useData()
  return useMemo(() => data[col].filter((d) => !d.deletedAt), [data, col])
}
