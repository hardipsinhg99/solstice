import { useEffect } from 'react'

/**
 * Slides the bottom-right corner stack out of the way while the reader is
 * scrolling DOWN, and brings it back the moment they scroll up.
 *
 * Why this rather than making room for the buttons in the layout. The stack is
 * position:fixed, so it sits over whatever happens to be beneath it at that
 * scroll offset - on About it lands on the story timeline's h2, on Services on
 * "Global Sourcing & Procurement", on Contact on the intro. Those collisions
 * are not at one place in the document, they move with the scroll position, so
 * padding a container only relocates the problem. Nothing short of removing the
 * buttons from that space fixes it, and taking them away while the reader is
 * moving away from them costs nothing: reading is scrolling down, reaching for
 * a control is stopping or scrolling back.
 *
 * Writes a data attribute rather than toggling three components' props: the
 * three buttons are independent siblings under App, and one attribute on <body>
 * lets footer.css move all of them with a single rule per state.
 *
 * Deliberately NOT gated on prefers-reduced-motion. The attribute only decides
 * WHERE the stack sits; the transition that animates it is a normal CSS
 * transition, so base.css's reduced-motion backstop collapses it to 1e-05s and
 * the stack simply moves instantly. Gating the behaviour itself would leave the
 * overlap in place for exactly the users least able to tolerate it.
 */
const THRESHOLD_PX = 8      // ignore sub-pixel and rubber-band jitter
const ARM_AFTER_PX = 240    // never hide while still near the top of the page

export function useScrollAway() {
  useEffect(() => {
    const root = document.body
    let last = window.scrollY
    let frame = 0

    const apply = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      if (Math.abs(delta) < THRESHOLD_PX) return
      // Scrolling down and clear of the top: stand aside. Anything else: return.
      root.dataset.cornerStack = delta > 0 && y > ARM_AFTER_PX ? 'away' : 'near'
      last = y
    }

    // rAF-coalesced: scroll fires far more often than the compositor paints, and
    // this only ever writes one attribute.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply) }

    root.dataset.cornerStack = 'near'
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      delete root.dataset.cornerStack
    }
  }, [])
}
