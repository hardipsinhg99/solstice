/**
 * Whether this page load began from prerendered HTML, and the id of the data
 * snapshot the prerenderer embeds.
 *
 * The app mounts with createRoot, not hydrateRoot, so on a prerendered page
 * React discards the static DOM and renders its own over it. That is only
 * invisible if React's first frame looks exactly like the HTML it replaces.
 * Two things would break that: CMS data not yet loaded (the snapshot below
 * fixes it) and entrance motion replaying on content that is already on screen
 * (this flag lets the motion code tell the difference).
 *
 * In lib/ because both features/api and components/motion read it, and
 * neither may import from app/.
 */
export const SNAPSHOT_ID = '__solstice_state'
const ATTR = 'data-prerendered'

const root = () => (typeof document === 'undefined' ? null : document.documentElement)

export const isPrerenderBoot = () => Boolean(root()?.hasAttribute(ATTR))

/**
 * Called once, before createRoot, and only if #root already holds markup.
 * Cleared the first time the path changes: from then on every mount is a
 * genuine client-side render and animates exactly as it always has.
 */
export function beginPrerenderBoot () {
  const el = root()
  if (!el) return
  el.setAttribute(ATTR, '')
  const bootPath = location.pathname
  const end = () => {
    // A popstate that lands on the same path (the logo on the page you are
    // already on) is not a new page. Ending the flag there would restart the
    // hero's intro on the hero already showing.
    if (location.pathname === bootPath) return
    el.removeAttribute(ATTR)
    window.removeEventListener('popstate', end)
  }
  window.addEventListener('popstate', end)
}
