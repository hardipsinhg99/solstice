import { useEffect, useState } from 'react'

/* Path routing on the History API. No router library: the surface this site
   needs is a current route, a way to change it, and back/forward - which is
   three browser calls, not a dependency.

   The INTERNAL route strings are unchanged ('home', 'products/export',
   'product/mangoes', 'admin/products'). Only their mapping to a URL changed, so
   every call site that navigates by route name kept working untouched. That is
   what app/navigation.js was for.

   One collision the URL map creates and the hash scheme did not have:
   /products/export is a direction FILTER while /products/mangoes is a product.
   Under hashes those were different prefixes - #products/ and #product/ - and
   merging them into one path segment means the segment itself has to be
   classified. TRADE_SEGMENTS is that classification, and it is the reason a
   product may never be given the slug "export" or "import". */
const TRADE_SEGMENTS = new Set(['export', 'import'])

/* route -> path. Only routes whose URL is not simply "/" + route need an entry;
   everything else round-trips through the default below. */
const ROUTE_TO_PATH = { home: '/', network: '/trade-network' }
const PATH_TO_ROUTE = { '': 'home', 'trade-network': 'network' }

/** The canonical, shareable URL for an internal route. */
export function toPath (route) {
  if (ROUTE_TO_PATH[route]) return ROUTE_TO_PATH[route]
  // 'product/<slug>' is the one route whose path is not its own name: the map
  // puts detail pages under the listing, at /products/<slug>.
  if (route.startsWith('product/')) return `/products/${route.slice(8)}`
  return `/${route}`
}

/** The internal route for a URL path. Inverse of toPath. */
export function toRoute (pathname) {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (segments.length === 0) return 'home'
  if (PATH_TO_ROUTE[segments[0]] && segments.length === 1) return PATH_TO_ROUTE[segments[0]]
  if (segments[0] === 'admin') return segments.join('/')
  if (segments[0] === 'products') {
    if (segments.length === 1) return 'products'
    // The classification described above.
    // A third segment after a direction is a category slug from a Home card
    // (/products/export/fresh-fruit) and is kept; see productsCategory below.
    // /products/all/<category>: the whole catalogue with a category chip
    // pre-selected (Home cards). 'all' is not a direction - productsTrade()
    // still returns null for it - and only counts with a third segment, so a
    // product that happened to have the slug "all" stays reachable.
    if (segments[1] === 'all' && segments[2]) return segments.slice(0, 3).join('/')
    if (TRADE_SEGMENTS.has(segments[1])) return segments.slice(0, 3).join('/')
    return `product/${segments[1]}`
  }
  return segments.join('/')
}

/* Legacy hashes. A fragment is never sent to the server, so no redirect rule can
   fix these - an indexed or bookmarked solsticellp.com/#about only reaches the
   client, and the client has to translate it before React renders. Anything that
   does not translate is left alone and falls through to the app's 404 rather
   than being quietly sent Home, which would tell a crawler that a dead URL is a
   real page. */
export function migrateLegacyHash () {
  const raw = window.location.hash.slice(1)
  if (!raw) return
  const route = raw.replace(/^\/+/, '')
  const known =
    route === '' || route === 'home' ||
    ['about', 'services', 'team', 'network', 'gallery', 'contact', 'products'].includes(route) ||
    route.startsWith('products/') || route.startsWith('product/') ||
    route === 'admin' || route.startsWith('admin/')
  if (!known) {
    // Something linked a hash this map does not know - an old route, a typo in
    // a directory listing, a URL from before a rename. It is left alone (the
    // app will answer Not Found) and recorded, because the alternative is
    // guessing at what is still out there. The request 404s; its value is the
    // line it writes in the nginx access log, which is greppable server-side
    // without an endpoint, a dependency or a cookie. An <img> rather than
    // fetch(): no CORS preflight, no promise to handle, fails silently.
    try {
      new Image().src = `/__legacy-hash?h=${encodeURIComponent(raw.slice(0, 120))}`
      console.warn(`[router] unmapped legacy hash: #${raw}`)
    } catch { /* logging must never break a page load */ }
    return
  }
  // replaceState, not pushState: the hash URL should not become a back-button
  // stop the user can return to.
  window.history.replaceState(null, '', toPath(route) + window.location.search)
}

export const goTo = (route) => {
  const path = toPath(route)
  if (path !== window.location.pathname) window.history.pushState(null, '', path)
  // pushState does not emit popstate, so the app is told directly.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePathRoute () {
  const [route, setRoute] = useState(() => toRoute(window.location.pathname))
  useEffect(() => {
    const sync = () => setRoute(toRoute(window.location.pathname))
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])
  return route
}

export const isProductRoute = (route) => route.startsWith('product/')
export const isProductsRoute = (route) => route === 'products' || route.startsWith('products/')
export const productsTrade = (route) => {
  const segment = route.split('/')[1]
  return TRADE_SEGMENTS.has(segment) ? segment : null
}
export const productSlug = (route) => route.split('/')[1]
// Optional third segment: a category slug. It only pre-selects a category
// chip; the route is still a products route with the same direction, so every
// existing URL keeps meaning what it meant. 'products/export/fresh-fruit' is
// that category's exports; 'products/all/fresh-fruit' (what the Home cards
// use) is the whole catalogue - 'all' is not a direction, so productsTrade()
// returns null and the page shows both, as on a bare '#products'.
export const productsCategory = (route) => (isProductsRoute(route) && route.split('/')[2]) || null

export const isAdminRoute = (route) => route === 'admin' || route.startsWith('admin/')
export const adminSection = (route) => route.split('/')[1] || 'dashboard'
export const adminParam = (route) => route.split('/')[2] || null

/* The set the app will render. Anything else is a 404 - the hash router used to
   fall back to Home, which is wrong for a URL scheme crawlers will index. */
export const KNOWN_ROUTES = new Set(['home', 'about', 'services', 'team', 'network', 'gallery', 'contact', 'products'])
export const isKnownRoute = (route) =>
  KNOWN_ROUTES.has(route) || isProductRoute(route) || isProductsRoute(route) || isAdminRoute(route)
