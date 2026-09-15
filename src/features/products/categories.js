// The server's plain-text cleaner serialises through DOMPurify, which escapes
// "&" as "&amp;" - once on a product's type, and again on any copy of that type
// saved into page JSON. Names are compared and slugged decoded, so "Ceramics &
// Plastics" matches however many times it was escaped on the way.
export function categoryName(type) {
  let s = String(type ?? '').trim()
  for (let i = 0; i < 4 && /&(amp|lt|gt|quot|#39);/.test(s); i++) {
    s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  }
  return s
}

/** One category, however it was stored. */
export const sameCategory = (a, b) => categoryName(a) !== '' && categoryName(a) === categoryName(b)

// A product category - the product's `type`, set per product in the admin -
// as a URL segment: "Spice / Agricultural Product" -> "spice-agricultural-product".
//
// The Home feature cards link to their product's category list with it, and the
// Products page reads it back by slugging its own categories and comparing. So
// the destination is always derived from live catalogue data: renaming a type in
// the admin changes the link and the filter together, and nothing is stored.
export function categorySlug(type) {
  return categoryName(type)
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
