// Header and footer navigation.
//
// Objects rather than [route, label] tuples, because one item now carries a
// submenu and a tuple has nowhere to put it.
//
// Products opens onto the two directions the business runs, and each is a real
// route - '#products/export' and '#products/import' - so the choice is in the
// URL, is shareable and survives a reload. The header control is split: the
// label navigates to '#products', which shows BOTH directions with a badge on
// each card, and the caret beside it opens the two filtered views. One job per
// control, so neither is ambiguous.
// `group` replaces the footer's positional navItems.slice(1,4) / slice(4).
// Those indices silently changed meaning the moment an item was added or
// removed - taking Team out shifted the Company column by one, and it only
// still read correctly by luck. The group is now stated rather than inferred.
export const navItems = [
  { route: 'home', label: 'Home', group: 'explore' },
  { route: 'about', label: 'About us', group: 'explore' },
  { route: 'services', label: 'Services', group: 'explore' },
  {
    route: 'products',
    label: 'Products',
    group: 'explore',
    children: [
      { route: 'products/export', label: 'Export', meta: 'Sourced in India, shipped out' },
      { route: 'products/import', label: 'Import', meta: 'Sourced abroad, brought in' }
    ]
  },
  // Team is deliberately absent. It is not merely unpublished - it is removed
  // from discovery entirely, so it appears in neither the header nor the
  // footer (both read this one list). The page, its member CRUD, the photo
  // pipeline and #admin/team all remain fully functional; restoring the page
  // to the site is this one line plus a publish.
  { route: 'network', label: 'Trade Network', group: 'company' },
  { route: 'gallery', label: 'Gallery', group: 'company' },
  { route: 'contact', label: 'Contact us', group: 'company' }
]

/**
 * Which nav routes are backed by a real CMS Page row, and therefore have a
 * publish state worth honouring. Products, Gallery and Contact are static
 * routes with no Page record - they must NEVER be filtered out, because
 * isPublished() would have no row to find and would hide them forever.
 */
export const CMS_ROUTES = new Set(['home', 'about', 'services', 'team', 'network'])

/** Drops CMS-backed items whose page is unpublished; leaves static routes alone. */
export const visibleNav = (items, isPublished) =>
  items.filter((i) => !CMS_ROUTES.has(i.route) || isPublished(i.route))

/** Footer columns, grouped explicitly. Home is the brand mark, not a link here. */
export const navGroup = (name, isPublished = () => true) =>
  visibleNav(navItems.filter((i) => i.group === name && i.route !== 'home'), isPublished)
