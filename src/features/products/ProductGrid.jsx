import { ProductCard } from './ProductCard.jsx'

export function ProductGrid({ products, onSelect, showTrade = false }) {
  return (
    <div className="products-list">
      {products.map((product, index) => (
        <ProductCard
          key={product.slug} product={product} delay={(index % 3) * 80}
          onSelect={onSelect} showTrade={showTrade}
        />
      ))}
    </div>
  )
}
