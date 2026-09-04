import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppStateSnapshot, useStore } from '../store'
import {
  generateCode,
  getSyncCode,
  normalizeCode,
  persistSyncCode,
  pushToSync,
  subscribeToSync,
} from '../lib/sync'
import { isFirebaseConfigured } from '../lib/firebase'
import type { AppState } from '../types'

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'error'

const PUSH_DELAY_MS = 800

export function useCloudSync() {
  const [code, setCode] = useState<string | null>(() => getSyncCode())
  const [status, setStatus] = useState<SyncStatus>(code ? 'connecting' : 'off')
  const [error, setError] = useState<string | null>(null)
  const hydratingRef = useRef(false)
  const lastSyncedRef = useRef<string>('')

  useEffect(() => {
    if (!code) {
      setStatus('off')
      return
    }
    if (!isFirebaseConfigured) {
      setStatus('error')
      setError('A sincronização na nuvem ainda não foi configurada neste site.')
      return
    }

    setStatus('connecting')
    setError(null)
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    subscribeToSync(
      code,
      (data) => {
        if (cancelled) return
        if (data) {
          const { updatedAt: _updatedAt, ...appState } = data
          hydratingRef.current = true
          useStore.setState(appState as Partial<AppState>)
          hydratingRef.current = false
          lastSyncedRef.current = JSON.stringify(appState)
        } else {
          const snapshot = getAppStateSnapshot()
          lastSyncedRef.current = JSON.stringify(snapshot)
          pushToSync(code, snapshot).catch(() => {
            if (!cancelled) {
              setStatus('error')
              setError('Não foi possível salvar na nuvem agora. Confira sua internet.')
            }
          })
        }
        if (!cancelled) setStatus('synced')
      },
      () => {
        if (!cancelled) {
          setStatus('error')
          setError('Não foi possível conectar. Confira o código e sua internet.')
        }
      },
    ).then((unsub) => {
      if (cancelled) unsub?.()
      else unsubscribe = unsub ?? undefined
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [code])

  useEffect(() => {
    if (!code || !isFirebaseConfigured) return
    let timer: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = useStore.subscribe(() => {
      if (hydratingRef.current) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const snapshot = getAppStateSnapshot()
        const serialized = JSON.stringify(snapshot)
        if (serialized === lastSyncedRef.current) return
        lastSyncedRef.current = serialized
        pushToSync(code, snapshot).catch(() => {
          setStatus('error')
          setError('Não foi possível salvar na nuvem agora. Confira sua internet.')
        })
      }, PUSH_DELAY_MS)
    })

    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [code])

  const createCode = useCallback(() => {
    const fresh = generateCode()
    persistSyncCode(fresh)
    setCode(fresh)
  }, [])

  const joinCode = useCallback((raw: string) => {
    const normalized = normalizeCode(raw)
    if (!normalized) return
    persistSyncCode(normalized)
    setCode(normalized)
  }, [])

  const disconnect = useCallback(() => {
    persistSyncCode(null)
    setCode(null)
    setStatus('off')
    setError(null)
  }, [])

  return { code, status, error, createCode, joinCode, disconnect, isFirebaseConfigured }
}
