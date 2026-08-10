import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { goTo } from '../../app/router.js'

const when = (iso) => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
})

/**
 * Page title, notification bell, profile menu.
 *
 * Deliberately NOT the reference mockup's top bar, which mirrored the whole
 * public site navigation - Home / About us / Services / Products / Team /
 * Gallery / Contact us - across the admin. An operator editing a product does
 * not navigate to the public About page from here; the sidebar already has one
 * "View site" button for the one time they want that. Reproducing the marketing
 * nav would mean a second navigation model to keep in sync with data/navigation.js
 * for no workflow it serves.
 *
 * Both menus are native buttons and a plain <ul>. No dropdown library, no focus
 * trap: these are menus, not dialogs, so Escape closes, outside-click closes,
 * and Tab is allowed to walk out - which is what a keyboard user expects here.
 */
function useDismissable(active, onClose) {
  const ref = useRef(null)

  // Closing a panel that currently holds focus must hand focus back to the
  // trigger. Without this, Escape unmounts the focused element and the browser
  // drops focus to <body> - a keyboard user is silently returned to the top of
  // the document and has to tab all the way back. The trigger is the first
  // button inside the wrapper, which is the only DOM assumption here.
  const closeAndRestore = () => {
    if (ref.current?.contains(document.activeElement)) ref.current.querySelector('button')?.focus()
    onClose()
  }

  // No dependency array: the handlers close over `open` through onClose, which is
  // a new function each render anyway, so a dependency list would re-register
  // just as often while pretending otherwise. Guarded on `active` so nothing is
  // listening while both menus are shut.
  useEffect(() => {
    if (!active) return
    const onKey = (e) => { if (e.key === 'Escape') closeAndRestore() }
    // pointerdown, not click: a click listener fires after the button's own
    // handler has already toggled the menu back open. A pointer dismissal does
    // NOT move focus - the user is looking at where they clicked.
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  })

  return ref
}

export function AdminTopBar({ title, admin, notifications, onSignOut, onOpenEnquiry }) {
  const [open, setOpen] = useState(null) // null | 'bell' | 'profile'
  const close = () => setOpen(null)
  const bellRef = useDismissable(open === 'bell', close)
  const profileRef = useDismissable(open === 'profile', close)

  const items = notifications?.items ?? []
  const count = notifications?.count ?? 0

  const initials = (admin?.name ?? admin?.email ?? '?')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

  return (
    <header className="admin-topbar">
      <h1 className="admin-topbar-title">{title}</h1>

      <div className="admin-topbar-actions">
        <div className="admin-menu" ref={bellRef}>
          <button
            className="admin-icon-btn"
            onClick={() => setOpen((o) => (o === 'bell' ? null : 'bell'))}
            aria-expanded={open === 'bell'}
            // The count is in the accessible name, not only in the badge: a
            // superscript number is invisible to a screen reader.
            aria-label={count === 0 ? 'Notifications, none new' : `Notifications, ${count} new ${count === 1 ? 'enquiry' : 'enquiries'}`}
          >
            <Icon name="bell" size={18}/>
            {count > 0 && <span className="admin-badge" aria-hidden="true">{count > 9 ? '9+' : count}</span>}
          </button>

          {open === 'bell' && (
            <div className="admin-menu-panel" role="group" aria-label="New enquiries">
              <p className="admin-menu-head">
                {count === 0 ? 'No new enquiries' : `${count} new ${count === 1 ? 'enquiry' : 'enquiries'}`}
              </p>
              {items.length === 0 ? (
                <p className="admin-menu-empty">Enquiries from the contact form land here the moment they arrive.</p>
              ) : (
                <ul className="admin-menu-list">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button className="admin-menu-item" onClick={() => { close(); onOpenEnquiry?.(n.id) }}>
                        <strong>{n.name}</strong>
                        <span className="admin-menu-snippet">{n.snippet}</span>
                        <span className="admin-meta">{when(n.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {count > 0 && (
                <button className="admin-menu-foot" onClick={() => { close(); goTo('admin/enquiries') }}>
                  See all enquiries
                </button>
              )}
            </div>
          )}
        </div>

        <div className="admin-menu" ref={profileRef}>
          <button
            className="admin-profile-btn"
            onClick={() => setOpen((o) => (o === 'profile' ? null : 'profile'))}
            aria-expanded={open === 'profile'}
            aria-label={`Account menu for ${admin?.name ?? admin?.email ?? 'the current admin'}`}
          >
            <span className="admin-avatar" aria-hidden="true">{initials}</span>
            <span className="admin-profile-name">
              <strong>{admin?.name ?? 'Admin'}</strong>
              {/* No role label. There are no roles - see docs/admin.md. Printing
                  "Administrator" would imply a permission system that does not
                  exist, which is exactly the kind of decoration that gets read
                  as a feature. */}
              <span className="admin-meta">{admin?.email}</span>
            </span>
            <Icon name="chevron" size={14}/>
          </button>

          {open === 'profile' && (
            <div className="admin-menu-panel is-right" role="group" aria-label="Account">
              <p className="admin-menu-head">{admin?.email}</p>
              <button className="admin-menu-item" onClick={() => { close(); goTo('admin/settings') }}>
                Site settings
              </button>
              <button className="admin-menu-item" onClick={() => { close(); goTo('home') }}>
                View the public site
              </button>
              <button className="admin-menu-item is-danger" onClick={() => { close(); onSignOut() }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
