import { useEffect, useState } from 'react'
import { fetchPublicProducts } from '../admin/useProductsApi.js'

// One fetch, module-scope cache, shared by every consumer. The catalogue is 8
// records that change a few times a season, so re-requesting it on each route
// change would be waste - and the product detail page, the home page and the
// catalogue all want the same array.
//
// Native fetch and useState only: no data-fetching library, per the standing
// no-new-frontend-dependency rule.
let cache = null
let inflight = null

export function primeProductCatalogue() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetchPublicProducts()
      .then((rows) => { cache = rows; inflight = null; return rows })
      .catch((err) => { inflight = null; throw err })
  }
  return inflight
}

/** Lets the admin invalidate after a save without a full reload. */
export function clearProductCatalogue() { cache = null; inflight = null }

/**
 * Returns [products, status, retry]. `status` is 'loading' | 'ready' | 'error'.
 * Consumers get the same flat shape src/data/products.js exported, because the
 * mapping happens at the fetch boundary - ProductCard, ProductGrid,
 * ProductFilter and ProductDetailPage were built and tested against that shape
 * and are deliberately not touched by this change.
 */
export function useProductCatalogue() {
  const [products, setProducts] = useState(cache ?? [])
  const [status, setStatus] = useState(cache ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (cache) { setProducts(cache); setStatus('ready'); return }
    let cancelled = false
    setStatus('loading')
    primeProductCatalogue()
      .then((rows) => { if (!cancelled) { setProducts(rows); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [attempt])

  return [products, status, () => { clearProductCatalogue(); setAttempt((n) => n + 1) }]
}
