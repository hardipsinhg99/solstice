import { useEffect, useRef, useState } from 'react'

/**
 * One cached public GET, shared by every consumer that asks for the same key.
 *
 * This is the generalisation the Phase 1a report said to do when a second
 * resource arrived rather than writing a near-duplicate of useProductCatalogue.
 * Settings is that second resource. The behaviour is lifted from the products
 * hook unchanged - module-scope cache, in-flight de-duplication, and a
 * [data, status, retry] tuple - only the storage is keyed now.
 *
 * Native fetch and useState only. No data-fetching library, per the standing
 * no-new-frontend-dependency rule.
 */
const store = new Map() // key -> { data, inflight }

const entry = (key) => {
  if (!store.has(key)) store.set(key, { data: undefined, inflight: null })
  return store.get(key)
}

/**
 * Fetch once per key. Concurrent callers share one request: three components
 * mounting in the same frame must not produce three identical GETs.
 */
export function primeResource(key, fetcher) {
  const slot = entry(key)
  if (slot.data !== undefined) return Promise.resolve(slot.data)
  if (!slot.inflight) {
    slot.inflight = Promise.resolve()
      .then(fetcher)
      .then((data) => { slot.data = data; slot.inflight = null; return data })
      .catch((err) => { slot.inflight = null; throw err })
  }
  return slot.inflight
}

/** Drops a cached key so the next read refetches. */
export function clearResource(key) {
  store.delete(key)
}

/**
 * Returns [data, status, retry]. `status` is 'loading' | 'ready' | 'error'.
 *
 * `initial` is what `data` reads as before the first response - an empty array
 * for a collection, null for a single record - so a consumer never has to guard
 * against undefined on first render.
 *
 * The fetcher is held in a ref and deliberately absent from the effect's
 * dependencies: callers pass an inline arrow whose identity changes every
 * render, and depending on it would refetch on each one. The key is the cache
 * identity; the fetcher is only how a miss gets filled.
 */
export function useApiResource(key, fetcher, initial = null) {
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const cached = store.get(key)?.data
  const [data, setData] = useState(cached !== undefined ? cached : initial)
  const [status, setStatus] = useState(cached !== undefined ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const hit = store.get(key)?.data
    if (hit !== undefined) { setData(hit); setStatus('ready'); return }

    let cancelled = false
    setStatus('loading')
    primeResource(key, (...args) => fetcherRef.current(...args))
      .then((value) => { if (!cancelled) { setData(value); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [key, attempt])

  const retry = () => { clearResource(key); setAttempt((n) => n + 1) }
  return [data, status, retry]
}
