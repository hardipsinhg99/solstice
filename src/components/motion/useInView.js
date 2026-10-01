import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isPrerenderBoot } from '../../lib/prerender.js'

// Scroll-reveal: fades sections in as they enter the viewport, skipped entirely for reduced-motion users.
//
// One-shot by design - it unobserves on first intersection, so it reports "seen"
// but never "left". Anything needing continuous visibility (the hero video's
// pause/resume) uses its own observer.
//
// The `options` parameter was removed rather than honoured: it was spread into
// the observer but the effect's dep array is empty, so a caller passing options
// got them silently ignored on every render after the first. No caller passed
// any. Honouring it would mean putting an object literal in the deps, which
// re-creates the observer on each render - the same identity trap that cost the
// globe its WebGL context. Removing the parameter kills the trap outright.
export function useInView() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  // On a prerendered load this content is ALREADY on screen - the static HTML
  // painted it before React arrived. Starting it at opacity 0 and fading it in
  // would make the page visibly blink. So anything inside the viewport at mount
  // is revealed before the first paint, with its transition switched off for
  // that one change. A layout effect because a plain effect runs after paint,
  // which is the blink. Below the fold nothing changes: it was never seen, so
  // it still fades in on scroll exactly as designed.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !isPrerenderBoot()) return
    const r = el.getBoundingClientRect()
    if (r.bottom <= 0 || r.top >= window.innerHeight) return
    el.style.transition = 'none'
    setInView(true)
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = '' }))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.unobserve(el) }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}
