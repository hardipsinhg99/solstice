import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './useAdminAuth.js'

// Native fetch only - no data-fetching library, per the standing no-new-frontend-
// dependency rule. At 8 products a hook with three states is the whole
// requirement; anything more is machinery without a problem to solve.

export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(async (search = '') => {
    setStatus('loading')
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      setProducts(await apiFetch(`/products/admin/all${query}`))
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { products, status, error, reload: load }
}

export const getAdminProduct = (id) => apiFetch(`/products/admin/${id}`)
export const createProduct = (payload) => apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) })
export const updateProduct = (id, payload) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const deleteProduct = (id) => apiFetch(`/products/${id}`, { method: 'DELETE' })
export const setProductStatus = (id, status) =>
  apiFetch(`/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

/**
 * The API speaks Prisma's shape: uppercase enums, `certifications` as rows,
 * `varieties` as rows. Every existing display component - ProductCard,
 * ProductGrid, ProductFilter, ProductDetailPage - was built and tested against
 * the flat shape of src/data/products.js. Mapping at the boundary keeps those
 * components untouched, which is the whole point: they are not what changed.
 */
export function toStaticShape(row) {
  return {
    slug: row.slug,
    name: row.name,
    type: row.type,
    // Phase 1b: the API now returns primaryImage as an object. Flattened back to
    // `image` (a URL string) here because that is what the display components
    // already consume, and because both unsplashAt() and unsplashSrcSet() pass
    // a non-Unsplash URL through untouched - so an uploaded /api/uploads/... URL
    // needs no change to the existing delivery helpers at all.
    image: row.primaryImage?.url ?? null,
    // Alt text could NOT be adapted away: ProductCard hardcoded alt="". That is
    // a component change, and a required one - the brief makes alt text
    // first-class and the site holds a WCAG standard everywhere else.
    imageAlt: row.primaryImage?.altText || null,
    // Width/height are 0 for the seeded EXTERNAL Unsplash rows, whose intrinsic
    // size we never measured. Emitted only when real, so the attributes are
    // omitted rather than set to zero.
    imageWidth: row.primaryImage?.width || null,
    imageHeight: row.primaryImage?.height || null,
    gallery: (row.gallery ?? []).map((g) => ({
      url: g.mediaAsset.url,
      alt: g.mediaAsset.altText || null,
      width: g.mediaAsset.width || null,
      height: g.mediaAsset.height || null
    })),
    description: row.description,
    season: row.season,
    origin: row.origin,
    packaging: row.packaging,
    trade: row.trade === 'IMPORT' ? 'import' : 'export',
    varieties: (row.varieties ?? []).map((v) => v.name),
    // The static shape carried exactly one certification string. Joining keeps
    // that contract while the table underneath can hold several.
    certification: (row.certifications ?? []).map((c) => c.name).join(' · '),
    ...(row.placeholder ? { placeholder: true } : {})
  }
}

/** Public read for the marketing site. Unauthenticated, published rows only. */
export async function fetchPublicProducts() {
  const response = await fetch('/api/products')
  if (!response.ok) throw new Error(`Products unavailable (${response.status})`)
  const rows = await response.json()
  return rows.map(toStaticShape)
}
