import { useEffect, useState } from 'react'

// Hash routing. This is the one file the Astro migration deletes: everything
// else navigates through app/navigation.js and never learns the scheme.
export const goTo = (route) => { window.location.hash = route === 'home' ? '' : route }

export function useHashRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || 'home')
  useEffect(() => {
    const sync = () => setRoute(location.hash.slice(1) || 'home')
    addEventListener('hashchange', sync)
    return () => removeEventListener('hashchange', sync)
  }, [])
  return route
}

export const isProductRoute = (route) => route.startsWith('product/')
// 'products', 'products/export', 'products/import'. No collision with the
// detail route above: 'products/...' does not start with 'product/'.
export const isProductsRoute = (route) => route === 'products' || route.startsWith('products/')
// Export is the default, so a bare '#products' and an unrecognised suffix both
// land somewhere real rather than on an empty page.
export const productsTrade = (route) => (route.split('/')[1] === 'import' ? 'import' : 'export')
export const productSlug = (route) => route.split('/')[1]
