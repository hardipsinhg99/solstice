import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useInView } from '../../components/motion/useInView.js'

// Count-up for the Journey in Numbers grid.
//
// Built on the existing useInView rather than a second observer: that hook is
// one-shot by design (it unobserves on first intersection), which is exactly
// the "count once, never re-trigger on a later scroll pass" behaviour needed
// here - the guarantee comes from the hook's semantics, not from a flag this
// module has to maintain.
//
// useInView already short-circuits to `true` under prefers-reduced-motion, so
// the reduced-motion path arrives here immediately; the check below then sets
// the final value in one synchronous pass with no frame ever scheduled.
//
// Layout stability is a CSS concern, not a JS one: the stat grid sizes its
// columns from the grid template, never from the digits inside, so a value
// growing from "0" to "350" cannot move anything. See .about-stat in pages.css.

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

/* The REAL number is the default; 0 is only ever a moment of animation.
 *
 * This hook used to start every counter at 0 and count up when it scrolled into
 * view. The prerender job snapshots the page without scrolling, so the static
 * HTML every crawler reads - and every AI engine that does not run JavaScript -
 * said "0 Operational Countries, 0+ Export Markets, 0+ Containers Handled,
 * 0 Group Companies". The figures the About page exists to state were being
 * published as zeros.
 *
 * Now the value starts at the target, so every render that does not animate
 * carries the truth: the prerender job, a crawler, reduced motion, and a counter
 * already on screen when the page loads. Only a real visit with the counter
 * still below the fold drops it to 0 - in a layout effect, before the frame is
 * painted, so nobody sees the swap - and counts up when it arrives. */
const shouldAnimate = (el) => {
  if (typeof window === 'undefined' || window.__SOLSTICE_PRERENDER__) return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if (!el) return false
  // Already visible at mount: show the number, do not make the reader wait.
  return el.getBoundingClientRect().top >= window.innerHeight
}

export function useCountUp(target, { duration = 1400 } = {}) {
  const [ref, inView] = useInView()
  const [value, setValue] = useState(target)
  const armed = useRef(false)

  useLayoutEffect(() => {
    armed.current = shouldAnimate(ref.current)
    setValue(armed.current ? 0 : target)
    // ref is a stable ref object; re-arm only when the figure itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  useEffect(() => {
    if (!inView || !armed.current) return

    let frame = 0
    let startedAt = 0
    const step = (now) => {
      if (!startedAt) startedAt = now
      const progress = Math.min(1, (now - startedAt) / duration)
      setValue(Math.round(target * easeOutCubic(progress)))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, target, duration])

  return [ref, value]
}
