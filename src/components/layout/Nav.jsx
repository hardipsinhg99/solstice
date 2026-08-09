import { Icon } from '../ui/Icon.jsx'
import { navItems } from '../../data/navigation.js'
import { NavDropdown } from './NavDropdown.jsx'

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
      {navItems.map(item => (
        item.children
          ? <NavDropdown key={item.route} item={item} route={route} onNavigate={onNavigate}/>
          : (
            <button
              className={route === item.route ? 'active' : ''}
              aria-current={route === item.route ? 'page' : undefined}
              key={item.route}
              onClick={() => onNavigate(item.route)}
            >{item.label}</button>
          )
      ))}
      <button className="nav-cta" onClick={() => onNavigate('contact')}>Send enquiry <Icon name="arrow" size={14}/></button>
    </nav>
  )
}
