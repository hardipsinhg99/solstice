import { Icon } from '../ui/Icon.jsx'
import { navItems } from '../../data/navigation.js'

export function Nav({ route, open, onNavigate }) {
  return (
    <nav className={open ? 'nav-links open' : 'nav-links'}>
      {navItems.map(([target, label]) => (
        <button className={route === target ? 'active' : ''} key={target} onClick={() => onNavigate(target)}>{label}</button>
      ))}
      <button className="nav-cta" onClick={() => onNavigate('contact')}>Send enquiry <Icon name="arrow" size={14}/></button>
    </nav>
  )
}
