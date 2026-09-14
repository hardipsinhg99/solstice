import { Reveal } from '../../components/motion/Reveal.jsx'
import { ProductCard } from './ProductCard.jsx'

// A list, so a screen reader hears how many products the filter left. Grid
// tracks - 2 on phones, 3 from 700px, 4 from 1200px - are in pages.css.
//
// The reveal is on the cell and the hover lift on the card inside it: one
// transition list per element, or the hover rule would replace the reveal's
// and the cards would snap in instead of rising.
export function ProductGrid({ products, onSelect, showTrade = false }) {
  return (
    <ul className="products-list">
      {products.map((product, index) => (
        <Reveal as="li" key={product.slug} delay={(index % 4) * 60} className="products-list-item">
          <ProductCard product={product} onSelect={onSelect} showTrade={showTrade}/>
        </Reveal>
      ))}
    </ul>
  )
}
