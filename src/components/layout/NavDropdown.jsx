import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'

// A click-triggered disclosure for a nav item that has children.
//
// Disclosure semantics (a button with aria-expanded revealing a list), not
// role="menu"/"menuitem". Menu roles are a strict contract: they oblige roving
// arrow-key focus, typeahead, and Home/End, and a menu that declares the role
// without honouring it is worse for a screen-reader user than plain buttons.
// This is site navigation, which is exactly what the disclosure pattern is for.
// Arrow keys are still wired below as a convenience - allowed, not owed.
//
// Click, never hover: a hover menu is unusable on touch and hostile on a
// trackpad, and the brief asked for click explicitly.
//
// The panel is conditionally rendered rather than hidden with CSS, so a closed
// menu cannot leave seven invisible items in the tab order - the failure the
// mobile drawer had to be fixed for.
export function NavDropdown({ item, route, onNavigate }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = `nav-menu-${item.route}`

  const close = ({ refocus } = {}) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close({ refocus: true }); return }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const options = [...(panelRef.current?.querySelectorAll('button') ?? [])]
      if (!options.length) return
      event.preventDefault()
      const at = options.indexOf(document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      // Wraps at both ends; an unfocused panel enters at the first item.
      const next = at === -1 ? 0 : (at + step + options.length) % options.length
      options[next].focus()
    }

    // pointerdown, not click: closing on the press means the menu is already
    // gone by the time the release lands, so a click aimed at something behind
    // the panel is not swallowed by it.
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    // A tab that lands outside the dropdown closes it too, so keyboard users
    // are not dragging an open panel around behind them.
    const onFocusIn = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open])

  const go = (target) => { onNavigate(target); setOpen(false) }
  const parentActive = route === item.route

  return (
    <div className="nav-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={parentActive ? 'nav-dropdown-trigger active' : 'nav-dropdown-trigger'}
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={parentActive ? 'page' : undefined}
        onClick={() => setOpen(value => !value)}
      >
        {item.label}
        <Icon name="chevron" size={13}/>
      </button>

      {open && (
        <div className="nav-dropdown-panel" id={panelId} ref={panelRef}>
          <ul>
            {item.children.map(child => (
              <li key={child.route}>
                <button
                  type="button"
                  className={route === child.route ? 'nav-dropdown-item active' : 'nav-dropdown-item'}
                  onClick={() => go(child.route)}
                >
                  <span className="nav-dropdown-item-label">{child.label}</span>
                  {child.meta && <span className="nav-dropdown-item-meta">{child.meta}</span>}
                  <Icon name="arrow" size={14}/>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
