import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { cardProps } from '../../components/ui/Card.jsx'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

export function ProductCard({ product, delay = 0, onSelect }) {
  return (
    <Reveal as="article" delay={delay} className="product-list-card" {...cardProps(() => onSelect(product.slug), `View ${product.name}`)}>
      {/* A CSS background-image is fetched eagerly at one fixed size regardless
          of viewport - six 1000px catalogue photographs downloaded in full on a
          phone. An <img> gets loading="lazy" and srcset; the wrapper keeps the
          fixed-height crop and the hover scale exactly as they were. */}
      <div className="product-list-image">
        <img
          src={unsplashAt(product.image, 800)}
          srcSet={unsplashSrcSet(product.image)}
          sizes="(max-width: 780px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="product-list-info">
        <span>{product.type}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <span className="card-cue" aria-hidden="true">View product <Icon name="arrow" size={16}/></span>
      </div>
    </Reveal>
  )
}
