import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Nav } from './Nav.jsx'
import { useNavigate } from '../../app/navigation.js'

export function Header({ route, theme, setTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : '' }, [menuOpen])
  const onNavigate = (target) => { navigate(target); setMenuOpen(false) }
  return (
    <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
      <div className="container nav">
        <button className="brand brand-logo" onClick={() => onNavigate('home')} aria-label="Solstice home">
          <img src="/solstice-logo.png" alt="Solstice Trading International LLP"/>
        </button>
        <Nav route={route} open={menuOpen} onNavigate={onNavigate}/>
        <div className="nav-tools">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17}/>
          </button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <Icon name={menuOpen ? 'close' : 'menu'}/>
          </button>
        </div>
      </div>
      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"/>}
    </header>
  )
}
