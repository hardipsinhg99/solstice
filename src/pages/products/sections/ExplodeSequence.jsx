import { useEffect, useRef, useState } from 'react'
import { useFrameSequence, POSTER_SRC, MIN_VIEWPORT_PX } from '../../../features/explode/index.js'

// Decides whether the sequence may exist at all. Gating happens in React because
// display:none still downloads all 60 frames - a component that never renders
// never requests them. Starts false so the first paint is always the poster.
function useSequenceAllowed() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const wide = window.matchMedia(`(min-width: ${MIN_VIEWPORT_PX}px)`)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection
    const evaluate = () => {
      const thin = connection && (connection.saveData === true ||
        connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')
      setAllowed(wide.matches && !still.matches && !thin)
    }
    evaluate()
    wide.addEventListener('change', evaluate)
    still.addEventListener('change', evaluate)
    connection?.addEventListener?.('change', evaluate)
    return () => {
      wide.removeEventListener('change', evaluate)
      still.removeEventListener('change', evaluate)
      connection?.removeEventListener?.('change', evaluate)
    }
  }, [])
  return allowed
}

// The scrubbing version. Split out so the gate above can decline to mount it,
// which is what keeps the 3.56MB off mobile and off reduced-motion users.
function ExplodeCanvas() {
  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const { ready, failed } = useFrameSequence({ scrollRef, canvasRef })

  // Every frame missing (folder deleted) collapses to the same static fallback
  // the gated-out paths use.
  if (failed) return <ExplodePoster/>

  return (
    <div className="explode-scroll" ref={scrollRef} aria-hidden="true">
      <div className="explode-stage">
        <canvas
          ref={canvasRef}
          className={ready ? 'explode-canvas ready' : 'explode-canvas'}
          role="presentation"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function ExplodePoster() {
  return (
    <div className="explode-fallback" aria-hidden="true">
      <img src={POSTER_SRC} alt="" decoding="async" fetchPriority="low"/>
    </div>
  )
}

export function ExplodeSequence() {
  return useSequenceAllowed() ? <ExplodeCanvas/> : <ExplodePoster/>
}
