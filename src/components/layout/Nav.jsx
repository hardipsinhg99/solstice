import { Icon } from '../ui/Icon.jsx'
import { navItems } from '../../data/navigation.js'

export function Nav({ route, open, onNavigate }) {
  return (
    // aria-current marks the active page programmatically; the `.active` class
    // alone communicated it through weight and an underline, i.e. visually only.
    // The id is the target of the menu toggle's aria-controls.
    //
    // The closed mobile drawer is taken out of the tab order in responsive.css
    // (visibility:hidden), not with `inert` here: `open` is also false on
    // desktop, where the nav is permanently visible and must stay operable.
    <nav id="primary-navigation" aria-label="Primary" className={open ? 'nav-links open' : 'nav-links'}>
      {navItems.map(([target, label]) => (
        <button
          className={route === target ? 'active' : ''}
          aria-current={route === target ? 'page' : undefined}
          key={target}
          onClick={() => onNavigate(target)}
        >{label}</button>
      ))}
      <button className="nav-cta" onClick={() => onNavigate('contact')}>Send enquiry <Icon name="arrow" size={14}/></button>
    </nav>
  )
}
