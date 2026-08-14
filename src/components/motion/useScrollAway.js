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
/* ASYMMETRIC on purpose. Hiding is cheap to be wrong about - the stack comes
   straight back - so 8px is enough to catch a deliberate downward scroll.
   Showing is expensive to be wrong about: on a touch screen a thumb produces
   small upward twitches constantly while reading, and at 8px every one of them
   popped the buttons back over the text they had just moved out of. Coming back
   therefore needs a movement large enough to read as intent.
   Cumulative within a direction, not per-event: a slow deliberate scroll up
   arrives as many small deltas and must still add up. */
const HIDE_AFTER_PX = 8
const SHOW_AFTER_PX = 56
const ARM_AFTER_PX = 240    // never hide while still near the top of the page

export function useScrollAway() {
  useEffect(() => {
    const root = document.body
    let last = window.scrollY
    let frame = 0
    let travel = 0        // distance covered in the current direction
    let state = 'near'    // mirrors the attribute so it is only written on change

    const apply = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - last
      if (delta === 0) return

      // Reset the run when the direction flips, so the distances measure travel
      // in ONE direction rather than net displacement.
      if ((delta > 0) !== (travel > 0)) travel = 0
      travel += delta
      last = y

      // Above the arming line there is nothing to stand aside from.
      const next = y <= ARM_AFTER_PX ? 'near'
        : travel >= HIDE_AFTER_PX ? 'away'
          : travel <= -SHOW_AFTER_PX ? 'near'
            : state

      // The attribute used to be written on EVERY scroll frame - 19 writes in a
      // single flick, each invalidating style for every rule that matches body.
      // It now changes only when the state actually does.
      if (next === state) return
      state = next
      travel = 0
      root.dataset.cornerStack = state
    }

    // rAF-coalesced: scroll fires far more often than the compositor paints, and
    // this only ever writes one attribute.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply) }

    root.dataset.cornerStack = state
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      delete root.dataset.cornerStack
    }
  }, [])
}
