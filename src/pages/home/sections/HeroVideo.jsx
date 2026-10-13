import { useEffect, useRef, useState } from 'react'

const PHONE = '(max-width: 780px)'

/**
 * Whether this visit should get the video at all. Every "no" leaves the hero
 * image in place, which is the hero exactly as it is without a video.
 *
 *  - The prerender job: the video must never be baked into the static HTML a
 *    crawler reads. It would add nothing for them and a download for everyone.
 *  - prefers-reduced-motion: a looping background is motion with no off
 *    switch. The still image is the honoured preference, not a degraded one.
 *  - Data Saver, or a 2G connection: a background is the last thing worth
 *    those bytes. Everyone else gets it.
 */
function wantsVideo () {
  if (typeof window === 'undefined' || window.__SOLSTICE_PRERENDER__) return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  const c = navigator.connection
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false
  return true
}

/**
 * The Home hero background video, layered over the hero image.
 *
 * It must never cost the page its first impression, so it is the LAST thing to
 * load: nothing is requested until the window `load` event and an idle frame,
 * after the heading, the image and the rest of the page. Until it is actually
 * playing it is transparent and the image shows; then it fades in. A failure at
 * any point - autoplay refused (iOS Low Power Mode), a decode or network error
 * - removes it, and the image is simply still there.
 *
 * The loop is the browser's own `loop` attribute: the seam is made invisible at
 * encode time (the server crossfades the clip's end into its start), so no
 * script ever restarts or seeks the video.
 *
 * Phones (<=780px) get the phone rendition, roughly a third of the desktop
 * file. Off screen, or in a background tab, it pauses - a background nobody can
 * see should not spend a battery - and carries on from the same frame when it
 * is seen again.
 */
export function HeroVideo ({ video, focus }) {
  const ref = useRef(null)
  const [src, setSrc] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const desktopUrl = video?.desktop?.url
  const mobileUrl = video?.mobile?.url
  const usable = Boolean(desktopUrl) && video?.published !== false

  // 1. Defer: after load, in an idle frame. The choice of file is made then,
  //    from the real viewport - never from a guess baked into markup.
  useEffect(() => {
    if (!usable || !wantsVideo()) return undefined
    let cancelled = false
    let idle
    let timer
    const start = () => {
      if (cancelled) return
      setSrc(window.matchMedia(PHONE).matches && mobileUrl ? mobileUrl : desktopUrl)
    }
    const afterLoad = () => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(start, { timeout: 2000 })
      else timer = setTimeout(start, 300)
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', afterLoad)
      if (idle) window.cancelIdleCallback?.(idle)
      clearTimeout(timer)
    }
  }, [usable, desktopUrl, mobileUrl])

  // 2. Play while visible, pause when not.
  useEffect(() => {
    const el = ref.current
    if (!el || !src) return undefined
    // iOS Safari autoplays only a video it can see is muted, and React sets
    // `muted` as a property, not the attribute that check reads.
    el.muted = true
    el.defaultMuted = true
    el.setAttribute('muted', '')

    let visible = true
    const sync = () => {
      if (visible && !document.hidden) {
        // A rejected play() is autoplay being refused: keep the image.
        el.play()?.catch?.(() => setFailed(true))
      } else {
        el.pause()
      }
    }
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [src])

  if (!src || failed) return null
  return (
    <video
      ref={ref}
      className={playing ? 'hero-video is-playing' : 'hero-video'}
      src={src}
      muted autoPlay loop playsInline preload="auto"
      disablePictureInPicture disableRemotePlayback
      tabIndex={-1}
      style={focus?.trim() ? { objectPosition: focus.trim() } : undefined}
      onPlaying={() => setPlaying(true)}
      onError={() => setFailed(true)}
    />
  )
}
