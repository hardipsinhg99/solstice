import { useEffect, useRef, useState } from 'react'
import { FRAME_COUNT, framePath, MAX_DPR, DESCENT_VH, FADE_START, FADE_TO } from './config.js'

// Drives the scroll-linked frame sequence.
//
// Division of labour, which is the whole performance story:
//   - there is no scroll listener at all; a single rAF loop measures and draws
//   - the loop only runs while the section intersects the viewport
//   - the draw is skipped entirely when the frame index has not moved
//
// Returns { ready, failed }. Until `ready` the caller shows the poster; on
// `failed` (any frame missing) it shows the poster permanently and no loop
// ever starts.
export function useFrameSequence({ scrollRef, canvasRef }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const framesRef = useRef(null)
  const progressRef = useRef(0)
  const activeRef = useRef(false)
  const lastIndexRef = useRef(-1)
  const lastTransformRef = useRef(-1)
  const rafRef = useRef(0)

  // --- preload every frame before anything becomes scrubbable ---------------
  useEffect(() => {
    let cancelled = false
    const images = new Array(FRAME_COUNT)

    const load = (i) => new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      // 60 frames fire as 60 concurrent requests, and on the Products page they
      // race the catalogue photography the buyer actually came for. The sequence
      // is not visible until the user scrolls into it, so it explicitly yields:
      // the browser schedules these behind anything of default priority.
      img.fetchPriority = 'low'
      img.onload = () => {
        images[i] = img
        // decode() moves the rasterisation cost off the first draw. A decode
        // rejection is not fatal - the bitmap still paints - so resolve either way.
        if (typeof img.decode === 'function') img.decode().then(resolve, resolve)
        else resolve()
      }
      img.onerror = () => reject(new Error(`explode frame ${i + 1} failed`))
      img.src = framePath(i)
    })

    Promise.all(Array.from({ length: FRAME_COUNT }, (_, i) => load(i)))
      .then(() => { if (!cancelled) { framesRef.current = images; setReady(true) } })
      .catch(() => { if (!cancelled) setFailed(true) }) // missing asset -> poster, silently

    return () => { cancelled = true; framesRef.current = null }
  }, [])

  // --- size, observe, scrub -------------------------------------------------
  useEffect(() => {
    if (!ready || failed) return
    const canvas = canvasRef.current
    const scroller = scrollRef.current
    if (!canvas || !scroller) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cw = 0, ch = 0

    // Backing store follows the element box, capped at 2x DPR. ResizeObserver,
    // not window.resize: the stage can change size without the window doing so.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      cw = canvas.clientWidth
      ch = canvas.clientHeight
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastIndexRef.current = -1 // force a redraw at the new size
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // getBoundingClientRect forces a synchronous layout. Called from the scroll
    // listener - as it was - that happens at input frequency, ahead of style and
    // layout for the frame, which is the classic layout-thrash shape even though
    // the comment described the listener as doing "nothing else". Reading it
    // inside the rAF tick instead means at most one forced layout per painted
    // frame, and none at all while the loop is parked.
    const readProgress = () => {
      const r = scroller.getBoundingClientRect()
      const span = r.height - window.innerHeight
      progressRef.current = span <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / span))
    }
    readProgress()

    const draw = (index) => {
      const img = framesRef.current?.[index]
      if (!img) return
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h) // cover-fit, centred
    }

    const tick = () => {
      rafRef.current = activeRef.current ? requestAnimationFrame(tick) : 0
      readProgress()
      const p = progressRef.current

      // Compositor-only properties. Only touched when they actually move, so a
      // stationary page does no style work at all.
      if (Math.abs(p - lastTransformRef.current) > 0.0005) {
        lastTransformRef.current = p
        canvas.style.transform = `translate3d(0, ${(p * DESCENT_VH).toFixed(3)}vh, 0)`
        canvas.style.opacity = p < FADE_START
          ? '1'
          : (1 - ((p - FADE_START) / (1 - FADE_START)) * (1 - FADE_TO)).toFixed(3)
      }

      const index = Math.round(p * (FRAME_COUNT - 1))
      if (index === lastIndexRef.current) return // the skip that keeps this cheap
      lastIndexRef.current = index
      draw(index)
    }

    // A dedicated observer, not motion/useInView: that hook calls unobserve() on
    // first intersection by design, so it can report "seen" but never "left" and
    // cannot stop a loop. Its ignored-`options` bug is already gone - the
    // parameter was removed in 72181b2 - so there was nothing to work around,
    // only the one-shot semantics.
    const io = new IntersectionObserver(([entry]) => {
      activeRef.current = entry.isIntersecting
      if (entry.isIntersecting && !rafRef.current) rafRef.current = requestAnimationFrame(tick)
    }, { threshold: 0 })
    io.observe(scroller)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      activeRef.current = false
      io.disconnect()
      ro.disconnect()
    }
  }, [ready, failed, canvasRef, scrollRef])

  return { ready, failed }
}
