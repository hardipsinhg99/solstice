import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { products } from '../../data/products.js'
import { ProductFilter, ProductGrid } from '../../features/products/index.js'
import { ExplodeSequence } from './sections/ExplodeSequence.jsx'
import { CatalogueEmpty } from './sections/CatalogueEmpty.jsx'

// Direction is a prop off the route, never local state. It is chosen from the
// header's Products menu, which navigates to '#products/export' or
// '#products/import' - a real URL that survives a reload and can be sent to
// someone. The page just renders whichever direction the route names.
const HEADINGS = {
  export: {
    eyebrow: 'FRESH FROM INDIA',
    title: 'Our seasonal',
    accent: 'selection.',
    copy: 'A concise collection of fresh fruits and vegetables. Availability depends on season and requirements.'
  },
  import: {
    eyebrow: 'INBOUND TRADE',
    title: 'What we bring',
    accent: 'in.',
    copy: 'Products Solstice sources from international markets into India. Tell us what you need and we will confirm availability.'
  }
}

export default function ProductsPage({ trade, selectProduct }) {
  const [category, setCategory] = useState('All')

  const inTrade = products.filter(product => product.trade === trade)
  // Categories are derived from what this direction actually contains, never
  // hardcoded - an empty direction offers no chips, and an import catalogue with
  // different categories gets correct ones for free.
  const categories = ['All', ...new Set(inTrade.map(product => product.type))]
  const filtered = category === 'All' ? inTrade : inTrade.filter(product => product.type === category)

  const noun = filtered.length === 1 ? 'product' : 'products'
  const countLabel = filtered.length > 0
    ? `${filtered.length} ${trade} ${noun}`
    : `No ${trade} products published yet`
  const heading = HEADINGS[trade]

  return <>
    <PageTitle mark="04" eyebrow={heading.eyebrow} title={heading.title} accent={heading.accent} copy={heading.copy}/>
    <ExplodeSequence/>
    <section className="products-page section">
      <div className="container">
        {categories.length > 1 && <ProductFilter options={categories} value={category} onChange={setCategory}/>}

        {/* The category chips swap the grid without navigating, so the result
            count is announced - otherwise a screen-reader user presses a chip
            and is told nothing changed. */}
        <div aria-live="polite">
          <p className="products-count">{countLabel}</p>
          {filtered.length > 0
            ? <ProductGrid products={filtered} onSelect={selectProduct}/>
            : <CatalogueEmpty direction={trade}/>}
        </div>
      </div>
    </section>
  </>
}
