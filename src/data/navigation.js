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
  // Takes the slot Team occupied while Team is unpublished.
  { route: 'network', label: 'Trade Network', group: 'company' },
  { route: 'gallery', label: 'Gallery', group: 'company' },
  { route: 'contact', label: 'Contact us', group: 'company' }
]

/** Footer columns, grouped explicitly. Home is the brand mark, not a link here. */
export const navGroup = (name) =>
  navItems.filter((i) => i.group === name && i.route !== 'home')
