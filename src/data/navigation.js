import { products } from './products.js'

// Header and footer navigation.
//
// Objects rather than [route, label] tuples, because one item now carries a
// submenu and a tuple has nowhere to put it.
//
// The Products submenu is derived from the catalogue, not written out by hand,
// so adding a product puts it in the header automatically and no list can drift
// out of sync with another. "All products" leads it because the Products trigger
// itself only opens the menu - a control that both navigates and expands leaves
// the user unable to predict which it will do.
export const navItems = [
  { route: 'home', label: 'Home' },
  { route: 'about', label: 'About us' },
  { route: 'services', label: 'Services' },
  {
    route: 'products',
    label: 'Products',
    children: [
      { route: 'products', label: 'All products' },
      ...products.map(product => ({
        route: `product/${product.slug}`,
        label: product.name,
        meta: product.type
      }))
    ]
  },
  { route: 'team', label: 'Team' },
  { route: 'gallery', label: 'Gallery' },
  { route: 'contact', label: 'Contact us' }
]
