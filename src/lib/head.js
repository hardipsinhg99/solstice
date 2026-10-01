// Self-referential canonical + og:url for the current URL.
//
// index.html carries neither: one file is served for every path, so a static
// value would name the same canonical on all 40 pages. These are written per
// route instead - after Part 2 the prerenderer puts the correct pair in the
// static HTML and this keeps them right across client-side navigation.
//
// Origin is fixed, not location.origin: a page reached on any other host (a
// preview URL, a staging copy, an IP) must still point at production rather
// than canonicalise itself to a host that should never be indexed.
const ORIGIN = 'https://solsticellp.com'

const set = (selector, create, value) => {
  let el = document.head.querySelector(selector)
  if (!el) { el = create(); document.head.appendChild(el) }
  el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', value)
  return el
}

const drop = (selector) => document.head.querySelector(selector)?.remove()

/**
 * `path` is the current pathname. Admin pages pass null: they are noindex at
 * the server, and a canonical pointing at an admin URL is noise at best.
 */
export function setCanonical (path) {
  if (typeof document === 'undefined') return
  if (path === null) {
    drop('link[rel="canonical"]')
    drop('meta[property="og:url"]')
    return
  }
  // Trailing slash only on the root: /about and /about/ must not both exist.
  const url = ORIGIN + (path === '/' ? '/' : path.replace(/\/+$/, ''))
  set('link[rel="canonical"]', () => {
    const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l
  }, url)
  set('meta[property="og:url"]', () => {
    const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m
  }, url)
}
