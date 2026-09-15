import { useEffect, useState } from 'react'

// Auto-advancing horizontal row that is also a real, swipeable scroll box.
//
// Replaces the CSS `translate(-50%)` marquee the certifications and buyer
// quotes used. That version could not be swiped (the track moved by transform
// inside a non-scrolling box), and on iPhone it had two ways to stop dead:
// with Reduce Motion on it rendered a static row, and a tap left `:hover`
// stuck on the strip, which held the animation paused.
//
// Here the row is an ordinary `overflow-x:auto` element, so touch, trackpad
// and keyboard scrolling are the browser's own - momentum included - and a
// requestAnimationFrame loop nudges `scrollLeft` when nobody is touching it.
//
//   - Normal motion: a constant drift of `speed` px/s (a little slower on
//     phones, where the same px/s crosses a narrower screen faster).
//   - Reduce Motion: no drift; a short eased slide to the next item every
//     STEP_EVERY ms.
//   - A touch, swipe, wheel or keyboard scroll pauses it; it resumes
//     RESUME_AFTER ms after the last one. Mouse hover and keyboard focus
//     inside the row pause it too - hover only for a real mouse, so a tap on
//     a phone can never leave it stuck.
//   - Off-screen or in a background tab, the loop stops entirely.
//
// Seamless looping: the caller renders `copies` identical runs of items (all
// but the first aria-hidden). The position is kept inside the SECOND run,
// [loop, 2*loop), and moving by exactly one run's width is invisible - so the
// row never reaches an end in either direction. `copies` is sized from the
// measured run and viewport widths, so two quotes on a 2560px screen loop as
// cleanly as thirty logos on a phone.
//
// Markup contract: ref goes on the scroll box; its first child is the track;
// the track's children are the runs; items carry `data-marquee-item`.
// The ref is a callback ref held in state, because both callers render the
// row only once their CMS data arrives - a plain useRef read in a mount-only
// effect would find nothing and never start.

const STEP_EVERY = 5000
const STEP_MS = 700
const RESUME_AFTER = 2500

export function useAutoScroller({ speed = 34 } = {}) {
  const [el, setEl] = useState(null)
  const [copies, setCopies] = useState(3)

  useEffect(() => {
    const track = el?.firstElementChild
    if (!el || !track) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)')

    let loop = 0          // width of one run, gap included
    let pos = 0           // float position; browsers may round scrollLeft
    let written = -1      // scrollLeft as read back after our own last write
    let raf = 0
    let last = 0
    let visible = false
    let hovered = false
    let focused = false
    let touching = false
    let holdUntil = 0
    let step = null
    let nextStepAt = 0

    const write = (x) => { pos = x; el.scrollLeft = x; written = el.scrollLeft }
    // Same picture, position folded back into the second run.
    const normalise = () => {
      if (loop > 0 && (pos < loop || pos >= 2 * loop)) write(loop + (((pos - loop) % loop) + loop) % loop)
    }

    const measure = () => {
      const runs = track.children
      if (runs.length < 2) return
      const w = runs[1].offsetLeft - runs[0].offsetLeft
      if (w <= 0) return
      loop = w
      // Enough runs that the second one plus a full viewport always exists.
      const need = Math.max(3, Math.ceil(el.clientWidth / loop) + 2)
      setCopies((c) => (c === need ? c : need))
      normalise()
    }

    // The next item's left edge, lined up just inside the faded edge. At least
    // 24px away, so a step is always a visible slide - never a nudge that
    // merely tidies the alignment of the item already in place.
    const nextTarget = () => {
      const inset = el.clientWidth * 0.1
      for (const item of el.querySelectorAll('[data-marquee-item]')) {
        if (item.offsetLeft > pos + inset + 24) return item.offsetLeft - inset
      }
      return pos
    }

    const paused = () => hovered || focused || touching || performance.now() < holdUntil

    const frame = (t) => {
      raf = requestAnimationFrame(frame)
      // First frame after (re)starting: the first step waits a full interval.
      if (!last) nextStepAt = t + STEP_EVERY
      // Capped only against a long stall (the loop stops outright in a
      // background tab); a slow device still moves at the set speed.
      const dt = Math.min(250, t - (last || t))
      last = t
      if (!loop || paused()) { step = null; nextStepAt = t + STEP_EVERY; return }
      normalise()
      if (reduce.matches) {
        if (step) {
          const k = Math.min(1, (t - step.start) / STEP_MS)
          write(step.from + (step.to - step.from) * (1 - (1 - k) ** 3))
          if (k === 1) { step = null; nextStepAt = t + STEP_EVERY }
        } else if (t >= nextStepAt) {
          step = { from: pos, to: nextTarget(), start: t }
        }
      } else {
        const rate = el.clientWidth < 700 ? speed * 0.8 : speed
        write(pos + (rate * dt) / 1000)
      }
    }

    const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame) } }
    const stop = () => { cancelAnimationFrame(raf); raf = 0 }
    const hold = () => { holdUntil = performance.now() + RESUME_AFTER; step = null }

    // Any scroll we did not write is the user's: follow it and hold.
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - written) <= 1) return
      pos = el.scrollLeft
      written = pos
      hold()
    }
    const onTouchStart = () => { touching = true; hold() }
    const onTouchEnd = () => { touching = false; hold() }
    const onEnter = () => { if (mouse.matches) hovered = true }
    const onLeave = () => { hovered = false }
    // Keyboard focus only. A tap focuses the (tabindex) row too, and pausing
    // on that would recreate the stuck-on-tap problem this hook exists to fix.
    // (:focus-visible throws before iOS 15.4 - there, focus simply never pauses.)
    const onFocusIn = (e) => {
      try { focused = e.target.matches(':focus-visible') } catch { focused = false }
    }
    const onFocusOut = (e) => { if (!el.contains(e.relatedTarget)) focused = false }
    const onVisibility = () => (document.hidden ? stop() : start())

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start(); else stop()
    })
    const ro = new ResizeObserver(measure)

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    document.addEventListener('visibilitychange', onVisibility)
    io.observe(el)
    ro.observe(track)
    ro.observe(el)
    measure()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [el, speed])

  return [setEl, copies]
}
