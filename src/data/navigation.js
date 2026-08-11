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
export const navItems = [
  { route: 'home', label: 'Home' },
  { route: 'about', label: 'About us' },
  { route: 'services', label: 'Services' },
  {
    route: 'products',
    label: 'Products',
    children: [
      { route: 'products/export', label: 'Export', meta: 'Sourced in India, shipped out' },
      { route: 'products/import', label: 'Import', meta: 'Sourced abroad, brought in' }
    ]
  },
  { route: 'team', label: 'Team' },
  { route: 'gallery', label: 'Gallery' },
  { route: 'contact', label: 'Contact us' }
]
