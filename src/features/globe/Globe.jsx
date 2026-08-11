import { useEffect, useRef, useCallback, useState } from 'react'
import createGlobe from 'cobe'
import { GlobeFallback } from './GlobeFallback.jsx'

export function Globe({
  markers = [],
  arcs = [],
  className = '',
  markerColor = [0.3, 0.45, 0.85],
  baseColor = [1, 1, 1],
  arcColor = [0.3, 0.45, 0.85],
  glowColor = [0.94, 0.93, 0.91],
  dark = 0,
  mapBrightness = 10,
  markerSize = 0.025,
  markerElevation = 0.01,
  arcWidth = 0.5,
  arcHeight = 0.25,
  speed = 0.003,
  // Opening rotation, in radians. Defaulted rather than required so nothing
  // that already renders a globe has to pass it. phiForMarkers() derives the
  // value that centres a given marker set - the globe used to open on the
  // Americas with every Solstice office on the far side.
  phi: initialPhi = 0,
  theta = 0.2,
  diffuse = 1.5,
  mapSamples = 16000
}) {
  const canvasRef = useRef(null)
  const pointerInteracting = useRef(null)
  const lastPointer = useRef(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const velocity = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)
  // Set when this browser cannot give us a working WebGL globe. Rendering an
  // empty canvas at full opacity is indistinguishable from a broken page, so the
  // SVG fallback takes over instead of leaving a blank square.
  const [webglFailed, setWebglFailed] = useState(false)

  const handlePointerDown = useCallback((event) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    isPausedRef.current = true
  }, [])

  const handlePointerMove = useCallback((event) => {
    if (pointerInteracting.current !== null) {
      const deltaX = event.clientX - pointerInteracting.current.x
      const deltaY = event.clientY - pointerInteracting.current.y
      dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 }
      const now = Date.now()
      if (lastPointer.current) {
        const dt = Math.max(now - lastPointer.current.t, 1)
        const maxVelocity = 0.15
        velocity.current = {
          phi: Math.max(-maxVelocity, Math.min(maxVelocity, ((event.clientX - lastPointer.current.x) / dt) * 0.3)),
          theta: Math.max(-maxVelocity, Math.min(maxVelocity, ((event.clientY - lastPointer.current.y) / dt) * 0.08))
        }
      }
      lastPointer.current = { x: event.clientX, y: event.clientY, t: now }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
      lastPointer.current = null
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe = null
    let animationId = 0
    let revealTimer = 0
    let phi = initialPhi

    // Idle auto-rotation is a continuous, unstoppable animation - precisely what
    // SC 2.3.3 covers. Drag still works under reduced motion; only the
    // never-ending spin stops, so the component keeps its whole purpose.
    const stillQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // The marker/arc payloads were rebuilt with two .map() calls on every one of
    // the ~60 frames per second. They never change within an effect run, so they
    // are built once here.
    const frameMarkers = markers.map(m => ({ location: m.location, size: markerSize, id: m.id }))
    const frameArcs = arcs.map(a => ({ from: a.from, to: a.to, id: a.id }))

    // A globe scrolled out of view, or on a backgrounded tab, was still running
    // a full WebGL draw every frame. Both conditions now hold the loop.
    let onScreen = true
    const shouldRun = () => onScreen && !document.hidden

    function animate() {
      if (!isPausedRef.current) {
        if (!stillQuery.matches) phi += speed
        if (Math.abs(velocity.current.phi) > 0.0001 || Math.abs(velocity.current.theta) > 0.0001) {
          phiOffsetRef.current += velocity.current.phi
          thetaOffsetRef.current += velocity.current.theta
          velocity.current.phi *= 0.95
          velocity.current.theta *= 0.95
        }
        const thetaMin = -0.4, thetaMax = 0.4
        if (thetaOffsetRef.current < thetaMin) thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1
        else if (thetaOffsetRef.current > thetaMax) thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1
      }
      globe.update({
        phi: phi + phiOffsetRef.current + dragOffset.current.phi,
        theta: theta + thetaOffsetRef.current + dragOffset.current.theta,
        dark,
        mapBrightness,
        markerColor,
        baseColor,
        arcColor,
        markerElevation,
        markers: frameMarkers,
        arcs: frameArcs
      })
      animationId = shouldRun() ? requestAnimationFrame(animate) : 0
    }

    // Single entry point for restarting the loop, so no path can ever leave two
    // rAF chains running against the same canvas.
    function resume() {
      if (globe && !animationId && shouldRun()) animationId = requestAnimationFrame(animate)
    }

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      // Ask for the context ourselves first. A browser can refuse one - a
      // blocklisted driver, hardware acceleration off, or too many live contexts
      // across tabs - and cobe's failure mode is a correctly sized, fully opaque,
      // completely empty canvas, which reads as a missing globe rather than as
      // an error.
      const probe = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!probe) {
        // eslint-disable-next-line no-console
        console.warn('[Globe] WebGL is unavailable in this browser; using the SVG globe.')
        setWebglFailed(true)
        return
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      try {
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: initialPhi,
        theta,
        dark,
        diffuse,
        mapSamples,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        markerElevation,
        markers: frameMarkers,
        arcs: frameArcs,
        arcColor,
        arcWidth,
        arcHeight,
        opacity: 0.7
      })
      animate()
      revealTimer = setTimeout(() => { canvas.style.opacity = '1' })
      } catch (error) {
        // A driver that accepts a context and then rejects the program still
        // leaves a blank square. Same answer.
        // eslint-disable-next-line no-console
        console.warn('[Globe] WebGL globe failed to start; using the SVG globe.', error)
        globe = null
        setWebglFailed(true)
      }
    }

    // Visibility gates. Both are attached up front so they apply whether init()
    // runs immediately or waits on the ResizeObserver below.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) resume()
    }, { threshold: 0 })
    io.observe(canvas)
    const onVisibility = () => { if (!document.hidden) resume() }
    document.addEventListener('visibilitychange', onVisibility)

    // A zero-width canvas cannot be initialised, so wait for it to be laid out.
    // One observer either way - the previous version returned two different
    // cleanups from two branches, which was easy to let drift apart.
    let ro = null
    if (canvas.offsetWidth > 0) {
      init()
    } else {
      ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      ro?.disconnect()
      if (revealTimer) clearTimeout(revealTimer)
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [markers, arcs, markerColor, baseColor, arcColor, glowColor, dark, mapBrightness, markerSize, markerElevation, arcWidth, arcHeight, speed, initialPhi, theta, diffuse, mapSamples])

  if (webglFailed) {
    return <GlobeFallback markers={markers} arcs={arcs} phi={initialPhi}/>
  }

  return (
    <div className={`globe-wrap ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="globe-canvas"
      />
    </div>
  )
}
