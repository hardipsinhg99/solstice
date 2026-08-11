import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { goTo } from '../../app/router.js'
import { EDITABLE_PAGES, pageSection } from '../../features/pages/index.js'

/**
 * Grouped, collapsible navigation.
 *
 * The groups are the point. A flat list works at four items and stops working
 * at eight, and the ordering that makes sense to whoever built it is not the
 * one that makes sense to the person using it. MAIN is what you open the panel
 * to do, CONTENT is what you edit occasionally, SETTINGS is what you touch
 * twice a year.
 *
 * Catalogue is a real expandable group rather than two more top-level links: it
 * is where an operator spends their day, and it is the part that will grow.
 */
const CATALOGUE = {
  label: 'Catalogue',
  icon: 'box',
  children: [
    { section: 'products', route: 'admin/products', label: 'Products', icon: 'box', alsoMatches: ['product'] },
    { section: 'enquiries', route: 'admin/enquiries', label: 'Enquiries', icon: 'mail' }
  ]
}

const GROUPS = [
  {
    label: 'Main',
    items: [
      { section: 'dashboard', route: 'admin/dashboard', label: 'Dashboard', icon: 'grid' },
      CATALOGUE
    ]
  },
  {
    label: 'Content',
    items: [
      // Derived from PAGE_CONFIG, not restated. A new editable page appears here
      // the moment it has a config entry - which is what makes "a config entry
      // and a seed row" a true statement rather than an aspiration.
      ...EDITABLE_PAGES.map((page) => ({
        section: pageSection(page.slug),
        route: `admin/${pageSection(page.slug)}`,
        label: page.title,
        icon: page.icon
      })),
      { section: 'gallery', route: 'admin/gallery', label: 'Gallery', icon: 'image' }
    ]
  },
  { label: 'Settings', items: [{ section: 'settings', route: 'admin/settings', label: 'Settings', icon: 'sliders' }] }
]

const COLLAPSE_KEY = 'solstice-admin-nav-collapsed'
const GROUP_KEY = 'solstice-admin-nav-catalogue'

// localStorage, matching the precedent the theme toggle set with `solstice-theme`.
// This is a UI preference belonging to a person and a machine, not content: it
// has no business in the database, and a server round-trip to learn whether a
// sidebar is narrow would be absurd.
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === 'true'
  } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, String(value)) } catch { /* storage blocked */ }
}

const isActive = (item, section) =>
  item.section === section || (item.alsoMatches ?? []).includes(section)

export function AdminSidebar({ section, admin, onSignOut }) {
  const [collapsed, setCollapsed] = useState(() => read(COLLAPSE_KEY, false))
  const [catalogueOpen, setCatalogueOpen] = useState(() => read(GROUP_KEY, true))

  useEffect(() => { write(COLLAPSE_KEY, collapsed) }, [collapsed])
  useEffect(() => { write(GROUP_KEY, catalogueOpen) }, [catalogueOpen])

  // Collapsing the group must not hide the page you are on. If the operator is
  // inside Catalogue and collapses it, the active child would vanish with no
  // indication of where they are - so the group stays open while it holds the
  // current page.
  const inCatalogue = CATALOGUE.children.some((c) => isActive(c, section))
  const catalogueExpanded = catalogueOpen || inCatalogue

  // Collapsing the whole sidebar hides the labels VISUALLY only - the CSS uses
  // the visually-hidden pattern, not display:none, so every button keeps its
  // accessible name and the collapsed rail never becomes a row of unlabelled
  // icons for a screen reader.
  const link = (item) => (
    <li key={item.route}>
      <button
        className={isActive(item, section) ? 'admin-nav-link is-active' : 'admin-nav-link'}
        onClick={() => goTo(item.route)}
        aria-current={isActive(item, section) ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        <Icon name={item.icon} size={17}/>
        <span className="admin-nav-text">{item.label}</span>
      </button>
    </li>
  )

  return (
    <nav className={collapsed ? 'admin-nav is-collapsed' : 'admin-nav'} aria-label="Admin sections">
      <div className="admin-nav-head">
        <span className="admin-brand admin-nav-text">Solstice admin</span>
        <button
          className="admin-nav-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
        >
          <Icon name="menu" size={18}/>
        </button>
      </div>

      {GROUPS.map((group) => (
        <div className="admin-nav-group" key={group.label}>
          {/* The heading labels the list for a screen reader too, so the visual
              grouping and the accessibility tree say the same thing. */}
          <h2 className="admin-nav-heading admin-nav-text" id={`navgroup-${group.label}`}>{group.label}</h2>
          <ul className="admin-nav-list" aria-labelledby={`navgroup-${group.label}`}>
            {group.items.map((item) =>
              item.children ? (
                <li key={item.label}>
                  <button
                    className="admin-nav-link admin-nav-parent"
                    onClick={() => setCatalogueOpen((o) => !o)}
                    aria-expanded={catalogueExpanded}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} size={17}/>
                    <span className="admin-nav-text">{item.label}</span>
                    <span className={catalogueExpanded ? 'admin-nav-caret is-open' : 'admin-nav-caret'} aria-hidden="true">
                      <Icon name="chevron" size={14}/>
                    </span>
                  </button>
                  {catalogueExpanded && (
                    <ul className="admin-nav-list admin-nav-sub">{CATALOGUE.children.map(link)}</ul>
                  )}
                </li>
              ) : (
                link(item)
              )
            )}
          </ul>
        </div>
      ))}

      <div className="admin-nav-foot">
        <span className="admin-meta admin-nav-text">{admin?.email}</span>
        <button className="admin-btn admin-nav-action" onClick={onSignOut} title={collapsed ? 'Sign out' : undefined}>
          <Icon name="user" size={15}/><span className="admin-nav-text">Sign out</span>
        </button>
        <button className="admin-btn admin-nav-action" onClick={() => goTo('home')} title={collapsed ? 'View site' : undefined}>
          <Icon name="globe" size={15}/><span className="admin-nav-text">View site</span>
        </button>
      </div>
    </nav>
  )
}
