import { fetchPublicProducts } from '../admin/useProductsApi.js'
import { useApiResource, primeResource, clearResource } from '../api/useApiResource.js'

// Thin wrapper over the generalised hook. The cache, the in-flight de-duplication
// and the [data, status, retry] contract all moved into useApiResource when
// Settings became the second resource; what remains here is the products-specific
// part - the key, the fetcher, and an empty array as the pre-load value.
//
// The exported names and return shape are deliberately unchanged, so App.jsx,
// HomePage, ProductsPage and ProductDetailPage did not have to be touched.
const KEY = 'products'

export function primeProductCatalogue() {
  return primeResource(KEY, fetchPublicProducts)
}

/** Lets the admin invalidate after a save without a full reload. */
export function clearProductCatalogue() {
  clearResource(KEY)
}

/**
 * Returns [products, status, retry]. `status` is 'loading' | 'ready' | 'error'.
 * Consumers get the same flat shape src/data/products.js exported, because the
 * mapping happens at the fetch boundary in useProductsApi.toStaticShape().
 */
export function useProductCatalogue() {
  return useApiResource(KEY, fetchPublicProducts, [])
}
