'use client'

import { useCallback, useEffect, useState } from 'react'

export function useResource<T>(load: () => Promise<T>, refreshMs = 0) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{ loader: typeof load; value?: T; error?: string }>()
  const refresh = useCallback(() => setVersion(version => version + 1), [])
  useEffect(() => {
    let active = true
    let timer: number | undefined
    async function read() {
      try {
        const value = await load()
        if (active) setResult({ loader: load, value })
      } catch (error) {
        if (active) setResult({ loader: load, error: error instanceof Error ? error.message : 'Request failed.' })
      } finally {
        if (active && refreshMs) timer = window.setTimeout(read, refreshMs)
      }
    }
    void read()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [load, refreshMs, version])
  const current = result?.loader === load ? result : undefined
  return { value: current?.value, error: current?.error, loading: !current, refresh }
}
