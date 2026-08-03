import { useState } from 'react'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { products } from '../../data/products.js'
import { ProductFilter, ProductGrid } from '../../features/products/index.js'

export default function ProductsPage({ selectProduct }) {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? products : products.filter(p => p.type === filter)
  return <>
    <PageTitle mark="04" eyebrow="FRESH FROM INDIA" title="Our seasonal" accent="selection." copy="A concise collection of fresh fruits and vegetables. Availability depends on season and requirements."/>
    <section className="products-page section">
      <div className="container">
        <ProductFilter options={['All', 'Fresh fruit', 'Fresh vegetable']} value={filter} onChange={setFilter}/>
        <ProductGrid products={filtered} onSelect={selectProduct}/>
      </div>
    </section>
  </>
}