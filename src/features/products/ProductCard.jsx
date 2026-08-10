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

// A slot awaiting real data. Rendered deliberately unlike a product: no
// photograph, a hatched plate, an "awaiting details" tag, and no interaction -
// it is a plain <article>, so it takes no tab stop and cannot lead to a detail
// page that has nothing to show. The point is that it can never be mistaken for
// something Solstice actually trades.
function PlaceholderCard({ product, delay }) {
  return (
    <Reveal as="article" delay={delay} className="product-list-card is-placeholder" data-unresolved="product">
      <div className="product-list-image is-placeholder">
        <Icon name="box" size={26}/>
        <span className="product-list-tag">Awaiting details</span>
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
      </div>
    </Reveal>
  )
}

export function ProductCard({ product, delay = 0, onSelect }) {
  if (product.placeholder) return <PlaceholderCard product={product} delay={delay}/>

  return (
    <Reveal as="article" delay={delay} className="product-list-card" {...cardProps(() => onSelect(product.slug), `View ${product.name} specification`)}>
      <div className="product-list-image">
        {/* No image is a real state now that imagery is admin-managed: an editor
            can delete the only photograph. Rendering <img src={null}> would give
            every buyer a broken-image glyph, so the awaiting-image plate stands
            in - the same visual language as the placeholder card, without
            claiming the product itself is unresolved. */}
        {product.image ? (
        <img
          src={unsplashAt(product.image, 800)}
          srcSet={unsplashSrcSet(product.image)}
          sizes="(max-width: 780px) 100vw, (max-width: 1024px) 50vw, 33vw"
          {...(product.imageWidth ? { width: product.imageWidth, height: product.imageHeight } : {})}
          alt={product.imageAlt || ''}
          loading="lazy"
          decoding="async"
        />
        ) : (
          <div className="product-list-image-empty" role="img" aria-label={`${product.name} — photograph to follow`}>
            <Icon name="box" size={24}/>
            <span>Photograph to follow</span>
          </div>
        )}
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
