import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { cardProps } from '../../components/ui/Card.jsx'

export function ProductCard({ product, delay = 0, onSelect }) {
  return (
    <Reveal as="article" delay={delay} className="product-list-card" {...cardProps(() => onSelect(product.slug), `View ${product.name}`)}>
      <div className="product-list-image" style={{ backgroundImage: `url('${product.image}')` }}/>
      <div className="product-list-info">
        <span>{product.type}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <span className="card-cue" aria-hidden="true">View product <Icon name="arrow" size={16}/></span>
      </div>
    </Reveal>
  )
}
