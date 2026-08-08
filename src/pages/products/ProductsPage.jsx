import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { products } from '../../data/products.js'
import { ProductFilter, ProductGrid, TradeSwitch } from '../../features/products/index.js'
import { ExplodeSequence } from './sections/ExplodeSequence.jsx'
import { CatalogueEmpty } from './sections/CatalogueEmpty.jsx'

export default function ProductsPage({ selectProduct }) {
  const [trade, setTrade] = useState('export')
  const [category, setCategory] = useState('All')

  const inTrade = products.filter(product => product.trade === trade)
  // Categories are derived from what the active direction actually contains,
  // never hardcoded - an empty direction offers no chips, and a future import
  // catalogue with different categories gets correct ones for free.
  const categories = ['All', ...new Set(inTrade.map(product => product.type))]
  const filtered = category === 'All' ? inTrade : inTrade.filter(product => product.type === category)

  // Switching direction resets the category. "Fresh fruit" may not exist on the
  // other side, and carrying it across would strand the grid empty for a reason
  // the user never chose.
  const changeTrade = (next) => { setTrade(next); setCategory('All') }

  const noun = filtered.length === 1 ? 'product' : 'products'
  const countLabel = filtered.length > 0
    ? `${filtered.length} ${trade} ${noun}`
    : `No ${trade} products published yet`

  return <>
    <PageTitle mark="04" eyebrow="FRESH FROM INDIA" title="Our seasonal" accent="selection." copy="A concise collection of fresh fruits and vegetables. Availability depends on season and requirements."/>
    <ExplodeSequence/>
    <section className="products-page section">
      <div className="container">
        <TradeSwitch value={trade} onChange={changeTrade}/>
        {categories.length > 1 && <ProductFilter options={categories} value={category} onChange={setCategory}/>}

        {/* The grid is swapped by a control rather than by navigation, so the
            result count is announced - otherwise a screen-reader user presses
            Import and is told nothing changed. */}
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
