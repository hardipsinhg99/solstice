import { useEffect, useRef, useState } from 'react'

// Scroll-reveal: fades sections in as they enter the viewport, skipped entirely for reduced-motion users.
export function useInView(options) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.unobserve(el) }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px', ...options })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}
