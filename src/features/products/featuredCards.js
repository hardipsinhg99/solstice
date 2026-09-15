import { categoryName, categoryRoute, sameCategory } from './categories.js'

// Home "What we export" cards.
//
// Configured in Admin -> Pages -> Home -> What we export as a short list of
// { category, image, title, description, published }. Only the REFERENCE is
// stored: `category` is a product type as written in Admin -> Products (there
// is no separate category table - a category is the type its products share),
// and everything else about the category - which products are in it, which
// direction it trades in, its fallback photograph - is read from the live
// catalogue every time. Nothing about a product is copied into the page.

const MAX_CARDS = 3
// Import placeholder slots carry this type; it is not a browsable category.
const NOT_A_CATEGORY = /^to be confirmed$/i

/** The categories a card may point at: types of published, real products. */
export function productCategories(products) {
  const seen = new Map()
  for (const p of products ?? []) {
    const name = categoryName(p?.type)
    if (!name || p.placeholder || NOT_A_CATEGORY.test(name)) continue
    if (!seen.has(name)) seen.set(name, name)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

const photoOf = (p) => (p?.image
  ? { url: p.image, alt: p.imageAlt || '', width: p.imageWidth || null, height: p.imageHeight || null }
  : null)

/**
 * The cards the Home page renders, resolved against the live catalogue.
 *
 * `cards === undefined` means the section has never been configured - every
 * page row saved before this feature. Those keep showing exactly what they
 * always did (catalogue positions 1, 4 and 2), so deploying this changes
 * nothing on the live Home page until an editor saves the new section.
 *
 * A configured card is dropped, never rendered broken, when it is switched
 * off, has no category, or names a category no published product has any more
 * (re-typed, unpublished or deleted in Admin -> Products).
 */
export function resolveFeaturedCards(cards, products) {
  const list = products ?? []
  if (!Array.isArray(cards)) {
    return [list[0], list[3], list[1]].filter(Boolean).map((p) => ({
      category: categoryName(p.type), title: p.name, description: p.description,
      image: photoOf(p), route: categoryRoute(p)
    }))
  }
  return cards
    .filter((c) => c && c.published !== false && categoryName(c.category))
    .map((c) => {
      const members = list.filter((p) => !p.placeholder && sameCategory(p.type, c.category))
      if (members.length === 0) return null
      const custom = c.image?.url && c.image.published !== false ? c.image : null
      // "What we export": the export list when the category has exports, else
      // the direction it actually trades in.
      const trade = members.some((p) => p.trade === 'export') ? 'export' : 'import'
      const category = categoryName(c.category)
      return {
        category,
        title: (c.title ?? '').trim() || category,
        description: (c.description ?? '').trim(),
        image: custom ?? photoOf(members.find((p) => p.image)),
        route: categoryRoute({ trade, type: category })
      }
    })
    .filter(Boolean)
    .slice(0, MAX_CARDS)
}

/**
 * The editor's starting point for a Home page that has never saved this
 * section: today's three cards, as configuration. Category, title and
 * description are taken from the product each card shows now, and the image
 * references that product's current photograph (the same file - nothing is
 * copied or changed, and uploading a new one replaces only this reference).
 * Shown as unsaved in the editor; nothing is written until the editor saves.
 */
export function seedFeaturedCards(products) {
  const list = products ?? []
  return [list[0], list[3], list[1]].filter(Boolean).map((p) => ({
    category: categoryName(p.type),
    image: p.image ? { ...photoOf(p), published: true } : null,
    title: p.name ?? '',
    description: p.description ?? '',
    published: true
  }))
}

export const FEATURED_CARDS_MAX = MAX_CARDS
