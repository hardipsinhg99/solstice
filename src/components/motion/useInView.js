import { useEffect, useRef, useState } from 'react'

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
