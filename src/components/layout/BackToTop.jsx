import { useEffect, useRef, useState } from 'react'

// Appears once the page has scrolled past --back-to-top-threshold.
//
// Visibility comes from an IntersectionObserver watching a sentinel that is
// exactly the threshold tall and pinned to the top of the document: once that
// box has fully left the viewport, the user is past it. No scroll listener, not
// even a rAF-batched one - a scroll handler runs on every frame of every scroll
// for a signal that changes twice per page visit.
export function BackToTop({ targetRef }) {
  const sentinelRef = useRef(null)
  const buttonRef = useRef(null)
  const [past, setPast] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The hidden attribute is what actually keeps this out of the tab order while
  // it is invisible - opacity:0 alone leaves a focusable target sitting in the
  // corner. It is dropped immediately on the way in so the entrance can play,
  // and only restored once the fade-out has finished, so the exit is not cut
  // short. transitionend still fires under prefers-reduced-motion: the backstop
  // in base.css collapses durations to .01ms rather than to none, precisely so
  // nothing waiting on the event can stall.
  useEffect(() => {
    if (past) { setHidden(false); return }
    const el = buttonRef.current
    if (!el || el.hidden) return
    const done = (event) => {
      if (event.target === el && event.propertyName === 'opacity') setHidden(true)
    }
    el.addEventListener('transitionend', done)
    return () => el.removeEventListener('transitionend', done)
  }, [past])

  // Scrolling and focus are two separate jobs and both are needed. Without the
  // focus move the page scrolls up while a keyboard user's focus stays wherever
  // it was, so their next Tab drops them back at the foot of the document.
  // scrollTo is called with no `behavior` key on purpose: that means `auto`,
  // which defers to html{scroll-behavior} in base.css - smooth normally, and
  // instant under reduced motion, where the backstop forces scroll-behavior to
  // auto. Passing 'smooth' here would override that guard.
  const toTop = () => {
    window.scrollTo({ top: 0 })
    targetRef?.current?.focus({ preventScroll: true })
  }

  return <>
    {/* Zero-cost: absolutely positioned against the initial containing block, so
        it sits at the document origin without a positioned ancestor and takes
        part in no layout. visibility:hidden still produces a box, which is what
        IntersectionObserver needs - display:none would never report at all. */}
    <div ref={sentinelRef} className="back-to-top-sentinel" aria-hidden="true"/>
    <button
      ref={buttonRef}
      type="button"
      className={!past && !hidden ? 'back-to-top is-out' : 'back-to-top'}
      hidden={hidden}
      onClick={toTop}
      aria-label="Back to top"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 19V6"/><path d="m5.5 12.5 6.5-6.5 6.5 6.5"/>
      </svg>
    </button>
  </>
}
