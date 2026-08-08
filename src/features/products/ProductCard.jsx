import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { cardProps } from '../../components/ui/Card.jsx'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

// The catalogue card carries specification, not just a name and a photograph.
//
// A sourcing manager scans this grid against an internal checklist - season,
// origin, pack - and only opens a card once it already looks like a fit.
// Surfacing those three from the existing product data turns each card into a
// preview of the spec sheet, which is what website-strategy.md Pillar 1 means by
// evidence density, and it is why the cue reads "specification" rather than
// "product". Every value shown is real data already in data/products.js -
// nothing here is invented or padded.
const SPECS = [
  { key: 'season', label: 'Season', icon: 'calendar' },
  { key: 'origin', label: 'Origin', icon: 'globe' },
  { key: 'packaging', label: 'Pack', icon: 'box' }
]

export function ProductCard({ product, delay = 0, onSelect }) {
  return (
    <Reveal as="article" delay={delay} className="product-list-card" {...cardProps(() => onSelect(product.slug), `View ${product.name} specification`)}>
      <div className="product-list-image">
        <img
          src={unsplashAt(product.image, 800)}
          srcSet={unsplashSrcSet(product.image)}
          sizes="(max-width: 780px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt=""
          loading="lazy"
          decoding="async"
        />
        {/* Category chip sits on the image so the card's body is left entirely
            to specification. */}
        <span className="product-list-tag">{product.type}</span>
      </div>

      <div className="product-list-info">
        <h3>{product.name}</h3>
        <p>{product.description}</p>

        <dl className="product-specs">
          {SPECS.map(spec => (
            <div key={spec.key}>
              <dt><Icon name={spec.icon} size={13}/>{spec.label}</dt>
              <dd>{product[spec.key]}</dd>
            </div>
          ))}
        </dl>

        <p className="product-cert"><Icon name="award" size={13}/>{product.certification}</p>
        <span className="card-cue" aria-hidden="true">View full specification <Icon name="arrow" size={16}/></span>
      </div>
    </Reveal>
  )
}
