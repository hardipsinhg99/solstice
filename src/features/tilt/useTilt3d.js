import { useEffect, useRef } from 'react'

// Pointer-driven 3D tilt, shared by the founder cards, the industry cards, the
// mission/vision panels and the hero quote.
//
// The hook writes two custom properties - --tilt-x and --tilt-y - onto the
// element and nothing else. CSS composes them into whatever transform that
// component wants, which is what lets stacked layers inside one card read the
// same values at different depths without the JS knowing anything about them.
//
// Three gates, all of which must pass before a single listener is attached:
//   1. (hover: hover) and (pointer: fine) - capability, not user-agent. A touch
//      device gets the static end state, never a hover state it cannot exit.
//   2. (prefers-reduced-motion: reduce) - no tilt at all.
//   3. an element to attach to.
// Both queries are watched for changes, so plugging in a mouse or toggling the
// OS motion setting mid-session attaches or detaches cleanly.
//
// Motion is a per-frame lerp toward the pointer target and back to rest on
// leave, so there is no spring library and no easing curve to import - the
// settle is the same exponential approach the globe's momentum already uses.

const REST_EPSILON = 0.01 // deg - below this the loop has nothing left to draw

export function useTilt3d({ max = 7, lerp = 0.12 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0

    const write = () => {
      el.style.setProperty('--tilt-x', `${currentX.toFixed(3)}deg`)
      el.style.setProperty('--tilt-y', `${currentY.toFixed(3)}deg`)
    }

    const tick = () => {
      currentX += (targetX - currentX) * lerp
      currentY += (targetY - currentY) * lerp
      write()
      // Park the loop once the card has settled AND is heading nowhere, so a
      // page of idle cards costs nothing.
      if (Math.abs(targetX - currentX) < REST_EPSILON && Math.abs(targetY - currentY) < REST_EPSILON) {
        currentX = targetX
        currentY = targetY
        write()
        frame = 0
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const start = () => { if (!frame) frame = requestAnimationFrame(tick) }

    const onMove = (event) => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      // -0.5..0.5 from the card's centre. rotateX is inverted: pushing the
      // pointer down should tip the top of the card away from the viewer.
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      targetY = px * max * 2
      targetX = -py * max * 2
      start()
    }

    const onLeave = () => { targetX = 0; targetY = 0; start() }

    const attach = () => {
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      el.dataset.tilt = 'on'
    }

    const detach = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      currentX = currentY = targetX = targetY = 0
      write()
      delete el.dataset.tilt
    }

    const evaluate = () => {
      detach()
      if (fine.matches && !still.matches) attach()
    }

    evaluate()
    fine.addEventListener('change', evaluate)
    still.addEventListener('change', evaluate)

    return () => {
      fine.removeEventListener('change', evaluate)
      still.removeEventListener('change', evaluate)
      detach()
    }
  }, [max, lerp])

  return ref
}
