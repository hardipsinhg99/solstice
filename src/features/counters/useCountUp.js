import { useEffect, useState } from 'react'
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

export function useCountUp(target, { duration = 1400 } = {}) {
  const [ref, inView] = useInView()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }

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
