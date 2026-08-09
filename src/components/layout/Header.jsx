import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Nav } from './Nav.jsx'
import { useNavigate } from '../../app/navigation.js'
import { useTranslateSlot } from './useTranslateSlot.js'

export function Header({ route, theme, setTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  const [langSlotRef, langReady] = useTranslateSlot()

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
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onNavigate = (target) => { navigate(target); setMenuOpen(false) }

  return (
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
          <div
            ref={langSlotRef}
            className={langReady ? 'lang-slot is-ready' : 'lang-slot'}
            aria-hidden="true"
          />
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
      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"/>}
    </header>
  )
}
