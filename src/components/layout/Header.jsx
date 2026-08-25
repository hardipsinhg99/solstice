import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Nav } from './Nav.jsx'
import { useNavigate } from '../../app/navigation.js'
import { useTranslateSlot } from './useTranslateSlot.js'
import { useSiteSettings } from '../../features/settings/index.js'

export function Header({ route, theme, setTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  // Waits for a DEFINITIVE answer before loading Google's script. `resolved`
  // is what separates "the admin turned it off" from "settings have not landed
  // yet" - and only the first of those is knowable at first paint. Injecting on
  // the optimistic default is what made the toggle inoperative and put a late
  // <select> into the navbar, reflowing it ~500ms after paint.
  const translateOn = settings.resolved && settings.translateEnabled !== false
  const [langSlotRef, langReady] = useTranslateSlot(translateOn)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll lock, plus the two things the drawer was missing: Escape to dismiss
  // (SC 2.1.2 - a keyboard user who opened it had no way out but tabbing through
  // every item), and returning focus to the toggle that opened it. Running the
  // effect only while open means the cleanup restores body overflow on unmount
  // too, so an unmount mid-open cannot leave the page permanently frozen.
  useEffect(() => {
    if (!menuOpen) return

    // Scroll lock that PRESERVES the scroll offset.
    //
    // `body{overflow:hidden}` alone was the bug behind "opening the menu jumps
    // me to another part of the page". The body is the scrolling element here,
    // so hiding its overflow clamps the current offset - the browser has
    // nowhere to keep it - and releasing it on close restored a different
    // position. Mid-page it looked like being thrown to the end of the
    // document.
    //
    // position:fixed with a negative top holds the page exactly where it was
    // and gives the drawer a viewport to sit in, then the offset is written
    // back by hand on close. `width:100%` stops the fixed body collapsing to
    // its content and reflowing the layout behind the overlay.
    const y = window.scrollY
    const body = document.body
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.width = '100%'

    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      // 'instant' overrides html{scroll-behavior:smooth}. Without it the
      // restore ANIMATES back to where you already were, which reads as the
      // page sliding away the moment the menu closes.
      window.scrollTo({ top: y, left: 0, behavior: 'instant' })
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onNavigate = (target) => { navigate(target); setMenuOpen(false) }

  return (
    // Fragment, not a lone <header>, so the backdrop can be a SIBLING of the
    // header rather than a child of it. That placement is the whole fix, not a
    // tidy-up: .site-header carries backdrop-filter, and a filtered element
    // becomes the containing block for its position:fixed descendants. Inside
    // the header the backdrop's `inset` resolved against an 82px box (68px once
    // scrolled), so it computed to ~12px tall - or zero - instead of covering
    // the viewport. Outside it, `fixed` means fixed to the viewport again.
    <>
    <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
      <div className="container nav">
        <button className="brand brand-logo notranslate" translate="no" onClick={() => onNavigate('home')} aria-label="Solstice home">
          {/* Intrinsic dimensions, not the rendered 145px: they give the browser
              the aspect ratio it needs to reserve the box before the PNG lands,
              which is what stops the header from reflowing on first paint. */}
          <img src="/solstice-logo.png" alt="Solstice Trading International LLP" width="1299" height="468"/>
        </button>
        <Nav route={route} open={menuOpen} onNavigate={onNavigate}/>
        <div className="nav-tools">
          {/* Empty on purpose. Google's <select> is parked over this box with
              position:fixed from outside #root; nothing is rendered into it here,
              because anything React puts inside a translated subtree is what
              causes the removeChild crash. Collapses to zero width when the
              script is blocked, so no gap is left behind. */}
          {translateOn && <div
            ref={langSlotRef}
            className={langReady ? 'lang-slot is-ready' : 'lang-slot'}
            aria-hidden="true"
            />}
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'dark'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17}/>
          </button>
          <button
            ref={toggleRef}
            className="menu-toggle"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            <Icon name={menuOpen ? 'close' : 'menu'}/>
          </button>
        </div>
      </div>
    </header>
    {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"/>}
    </>
  )
}
