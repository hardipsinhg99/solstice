import { useEffect, useRef, useState } from 'react'
import { SNAPSHOT_ID } from '../../lib/prerender.js'

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
const store = new Map() // key -> { data, inflight, seeded?, revalidating? }

/* A prerendered page carries the responses it was rendered from. Seeding the
   store from them BEFORE the first render is what makes React's first frame
   'ready' rather than 'loading' - without it, every prerendered page would show
   its full content, blink to the fallback copy while the API answered, then
   show the content again. Read at module evaluation, which runs before
   main.jsx calls createRoot.

   Seeded entries are marked, because a snapshot is only as fresh as the last
   prerender run. The first consumer to mount revalidates it once; see below. */
try {
  const tag = typeof document !== 'undefined' && document.getElementById(SNAPSHOT_ID)
  if (tag) {
    for (const [key, data] of Object.entries(JSON.parse(tag.textContent))) {
      store.set(key, { data, inflight: null, seeded: true })
    }
    tag.remove()
  }
} catch { /* a malformed snapshot just means an ordinary client-side fetch */ }

/* The prerenderer reads the store back out to build that snapshot. Exposed only
   when it has set the flag, so a normal visit publishes nothing on window. */
if (typeof window !== 'undefined' && window.__SOLSTICE_PRERENDER__) window.__SOLSTICE_STORE__ = store

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
    const slot = store.get(key)
    const hit = slot?.data

    // Seeded from the prerendered page: already rendered, but possibly stale.
    // Refetch once - shared by every consumer of the key - and swap only if the
    // answer changed. On failure the snapshot stays, which is exactly what a
    // visitor was already looking at.
    if (slot?.seeded) {
      let cancelled = false
      slot.revalidating ??= Promise.resolve()
        .then(() => fetcherRef.current())
        .then((fresh) => { slot.data = fresh; slot.seeded = false; return fresh })
      slot.revalidating
        .then((fresh) => {
          if (!cancelled && JSON.stringify(fresh) !== JSON.stringify(hit)) setData(fresh)
        })
        .catch(() => { slot.seeded = false })
      return () => { cancelled = true }
    }

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
