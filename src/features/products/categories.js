// A product category - the product's `type`, set per product in the admin -
// as a URL segment: "Spice / Agricultural Product" -> "spice-agricultural-product".
//
// The Home feature cards link to their product's category list with it, and the
// Products page reads it back by slugging its own categories and comparing. So
// the destination is always derived from live catalogue data: renaming a type in
// the admin changes the link and the filter together, and nothing is stored.
export function categorySlug(type) {
  return String(type ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The route for one category's list: 'products/export/fresh-fruit'. */
export function categoryRoute({ trade, type }) {
  const direction = trade === 'import' ? 'import' : 'export'
  const slug = categorySlug(type)
  return slug ? `products/${direction}/${slug}` : `products/${direction}`
}
