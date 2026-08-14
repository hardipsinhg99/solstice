import { useEffect, useRef, useState } from 'react'

// Positions Google's translate widget over a reserved slot in the header.
//
// The widget lives outside #root (see index.html) so React can never reconcile
// the nodes Google mutates. That means it also cannot be laid out by the header's
// flexbox, so the header reserves an empty spacer and this hook parks the real
// widget on top of it with position:fixed. The widget is never moved in the DOM -
// re-parenting it under #root would hand it straight back to React and reinstate
// the removeChild crash the split placement exists to prevent.
//
// Returns [slotRef, ready]. `ready` stays false when the script is blocked, which
// is common for this particular widget, and the header collapses the slot rather
// than leaving a hole where the switcher would have been.
const LOADER_ID = 'google-translate-loader'
const LOADER_SRC = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'

/**
 * Injects Google's loader once, and only when asked.
 *
 * index.html no longer carries the <script> tag. That is the difference between
 * a real setting and a CSS hide: with the widget disabled the request to
 * translate.google.com is never made, so there is no third-party script, no
 * cookie and no widget to suppress afterwards.
 *
 * Idempotent by id - React may run this effect more than once, and two loaders
 * would build two widgets into the same container.
 */
function ensureLoader() {
  if (document.getElementById(LOADER_ID)) return
  const el = document.createElement('script')
  el.id = LOADER_ID
  el.src = LOADER_SRC
  el.async = true
  document.head.appendChild(el)
}

export function useTranslateSlot(enabled = true) {
  const slotRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Disabled: nothing is injected, nothing is positioned, and `ready` stays
    // false so the header collapses the slot to zero width - the same path an
    // ad blocker already produced, so there is no second layout to reason about.
    if (!enabled) { setReady(false); return }

    const host = document.getElementById('google_translate_element')
    const slot = slotRef.current
    if (!host || !slot) return

    ensureLoader()

    // SIMPLE layout renders a native <select>. Its presence is the only reliable
    // signal that the script both loaded and finished building the widget.
    const widget = () => host.querySelector('select')

    let frame = 0
    const place = () => {
      frame = 0
      if (!widget()) return
      const r = slot.getBoundingClientRect()
      host.style.left = `${Math.round(r.left)}px`
      host.style.top = `${Math.round(r.top)}px`
      host.style.width = `${Math.round(r.width)}px`
      host.style.height = `${Math.round(r.height)}px`
    }
    // getBoundingClientRect forces a synchronous layout, so it is read inside a
    // rAF rather than straight out of the scroll handler - same reasoning as the
    // explode sequence's progress read. At most one forced layout per frame.
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place) }

    const adopt = () => {
      const select = widget()
      if (!select) return false
      // Google also renders an attribution anchor inside the gadget. The gadget's
      // text is collapsed to fit a 118px header slot, which would leave that link
      // focusable but invisible - a second phantom tab stop. The <select> is the
      // only control that should catch a Tab here. Safe to mutate: these nodes are
      // outside #root, so React neither owns nor reconciles them.
      host.querySelectorAll('a[href],button,input,[tabindex]').forEach((el) => {
        if (el !== select) el.setAttribute('tabindex', '-1')
      })
      host.dataset.ready = 'true'
      setReady(true)
      place()
      return true
    }

    // Google may finish before or after this effect runs, so handle both.
    let mo = null
    if (!adopt()) {
      mo = new MutationObserver(() => { if (adopt()) { mo.disconnect(); mo = null } })
      mo.observe(host, { childList: true, subtree: true })
    }

    // The header animates 82px -> 68px on scroll, which moves the slot without
    // any scroll of its own once the transition is running. Observing the header
    // box catches every frame of that transition; the scroll and resize listeners
    // cover the rest.
    const ro = new ResizeObserver(schedule)
    ro.observe(slot)
    const header = slot.closest('header')
    if (header) ro.observe(header)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      mo?.disconnect()
      ro.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  return [slotRef, ready]
}
