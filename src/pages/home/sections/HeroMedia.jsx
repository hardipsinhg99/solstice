import { useEffect, useRef, useState } from 'react'
import { HERO_VIDEO_SRC, HERO_POSTER_SRC } from '../../../lib/constants.js'

// Decides whether the hero video may exist at all. Gating happens here rather than
// in CSS because display:none still downloads the file - a component that never
// renders never requests it. Starts false so the first paint is always the poster.
function useHeroVideoAllowed() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    // 781px complements the 780px mobile breakpoint in styles.css exactly.
    const wide = window.matchMedia('(min-width: 781px)')
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

// Decorative only: aria-hidden and tabIndex -1 keep it out of the a11y tree and
// off the tab order. Every failure path (404, bad codec, blocked autoplay) simply
// leaves opacity at 0, which is the poster still underneath.
function HeroVideo() {
  const ref = useRef(null)
  const onScreen = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const resume = () => { if (onScreen.current && !document.hidden) video.play().catch(() => {}) }

    // A dedicated observer, not useInView: that hook calls unobserve() on first
    // intersection by design, so it can report "seen" but never "left" - it cannot
    // drive pause/resume. Left as-is rather than changing its semantics site-wide.
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      if (entry.isIntersecting) resume()
      else video.pause()
    }, { threshold: 0.01 })
    io.observe(video)

    const onVisibility = () => { if (document.hidden) video.pause(); else resume() }

    // `playing`, not `canplay`. canplay only says the data arrived - it fires
    // even when autoplay was refused, which would fade in a video frozen on
    // frame 0. Latching on `playing` means the reveal happens if and only if
    // the clip is actually running, so a refusal (iOS Low Power Mode, some
    // privacy settings) simply leaves this element at opacity 0 and the poster
    // still is the hero. No controls, nothing focusable, nothing to break.
    const onPlaying = () => setReady(true)
    document.addEventListener('visibilitychange', onVisibility)
    video.addEventListener('playing', onPlaying)

    // The autoPlay attribute starts playback, but its promise is not ours to
    // catch - an explicit attempt gives us the rejection so it never surfaces
    // as an unhandled promise rejection in the console. One attempt only; a
    // refusal is a user/OS decision, not a transient error to retry.
    video.play().catch(() => {})

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      video.removeEventListener('playing', onPlaying)
      video.pause()
    }
  }, [])

  return (
    <video
      ref={ref}
      className={ready ? 'hero-video ready' : 'hero-video'}
      src={HERO_VIDEO_SRC}
      poster={HERO_POSTER_SRC}
      muted loop playsInline autoPlay
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}

// The gate's state lives here, not in Home. If Home re-rendered when the gate
// resolves, its inline globeTheme object literals would be rebuilt, changing the
// Globe effect's dependencies and forcing a second WebGL init (measured: +857ms
// of script evaluation). Isolating the state keeps Home's render count at one.
export function HeroMedia() {
  const allowed = useHeroVideoAllowed()
  return (
    <div className="hero-media" aria-hidden="true">
      {/* A real <img>, not the CSS background-image this replaced. The preload
          scanner cannot see a background-image behind a custom property, so the
          LCP element was undiscoverable until the stylesheet had parsed;
          fetchPriority pulls it further forward still. Intrinsic dimensions are
          declared, and the element is absolutely positioned inside an
          already-sized box, so it reserves its space and shifts nothing.
          alt="" because the parent is aria-hidden and this is decoration. */}
      <img
        className="hero-poster"
        src={HERO_POSTER_SRC}
        alt=""
        width="1920"
        height="1080"
        fetchPriority="high"
        decoding="async"
      />
      {allowed && <HeroVideo/>}
    </div>
  )
}