import { Icon } from '../../components/ui/Icon.jsx'
import { cardProps } from '../../components/ui/Card.jsx'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

// The catalogue card carries specification, not just a name and a photograph.
//
// A sourcing manager scans this grid against an internal checklist - season,
// origin, pack - and only opens a card once it already looks like a fit.
// Surfacing those three from the existing product data turns each card into a
// preview of the spec sheet, which is what website-strategy.md Pillar 1 means by
// evidence density, and it is why the cue reads "specification" rather than
// "product". Every value shown is real data from the catalogue API - nothing
// here is invented or padded.
//
// Built for a two-up phone grid first. The card is a size container, so its
// layout follows its own width, not the viewport: a 150px phone card shows the
// spec rows as icon + value and a two-line description, a 280px desktop card
// adds the row labels and a third line. Badges sit in the card body, never on
// the photograph, so a long category cannot cover a narrow image.
const SPECS = [
  { key: 'season', label: 'Season', icon: 'calendar' },
  { key: 'origin', label: 'Origin', icon: 'globe' },
  { key: 'packaging', label: 'Pack', icon: 'box' }
]

// Rendered sizes of the photograph: half the width on phones, a third on
// tablets and small laptops, a quarter of the 1200px container above that.
const IMAGE_SIZES = '(max-width: 699px) 50vw, (max-width: 1199px) 33vw, 300px'
const IMAGE_WIDTHS = [320, 480, 800]

/**
 * The trade direction. Shown only on the combined '#products' view, where the
 * grid holds both directions and the badge is the only thing telling them
 * apart. On a filtered '#products/export' page every card would read "Export",
 * repeating what the page title already says. Text label always - the colour
 * reinforces, it never carries the meaning alone.
 */
function TradeBadge({ trade }) {
  const isImport = trade === 'import'
  return (
    <span className={isImport ? 'product-trade-badge is-import' : 'product-trade-badge'}>
      {isImport ? 'Import' : 'Export'}
    </span>
  )
}

function CardMeta({ product, showTrade }) {
  return (
    <div className="product-list-meta">
      {showTrade && <TradeBadge trade={product.trade}/>}
      {product.type && <span className="product-list-tag">{product.type}</span>}
    </div>
  )
}

function Specs({ product }) {
  return (
    <dl className="product-specs">
      {SPECS.filter(spec => product[spec.key]).map(spec => (
        <div key={spec.key}>
          {/* The label stays in the accessibility tree at every width; narrow
              cards hide only its visible text and keep the icon. */}
          <dt><Icon name={spec.icon} size={13}/><span className="product-spec-label">{spec.label}</span></dt>
          <dd>{product[spec.key]}</dd>
        </div>
      ))}
    </dl>
  )
}

// A slot awaiting real data. Rendered deliberately unlike a product: no
// photograph, a hatched plate, an "awaiting details" tag, and no interaction -
// it is a plain <article>, so it takes no tab stop and cannot lead to a detail
// page that has nothing to show. The point is that it can never be mistaken for
// something Solstice actually trades.
function PlaceholderCard({ product, showTrade = false }) {
  return (
    <article className="product-list-card is-placeholder" data-unresolved="product">
      <div className="product-list-image is-placeholder">
        <Icon name="box" size={24}/>
        <span>Awaiting details</span>
      </div>
      <div className="product-list-info">
        <CardMeta product={product} showTrade={showTrade}/>
        <h3>{product.name}</h3>
        {product.description && <p className="product-list-desc">{product.description}</p>}
        <Specs product={product}/>
      </div>
    </article>
  )
}

export function ProductCard({ product, onSelect, showTrade = false }) {
  if (product.placeholder) return <PlaceholderCard product={product} showTrade={showTrade}/>

  return (
    <article className="product-list-card" {...cardProps(() => onSelect(product.slug), `View ${product.name} specification`)}>
      <div className="product-list-image">
        {/* No image is a real state now that imagery is admin-managed: an editor
            can delete the only photograph. Rendering <img src={null}> would give
            every buyer a broken-image glyph, so the awaiting-image plate stands
            in - the same visual language as the placeholder card, without
            claiming the product itself is unresolved. */}
        {product.image ? (
          <img
            src={unsplashAt(product.image, 480)}
            srcSet={unsplashSrcSet(product.image, IMAGE_WIDTHS)}
            sizes={IMAGE_SIZES}
            {...(product.imageWidth ? { width: product.imageWidth, height: product.imageHeight } : {})}
            alt={product.imageAlt || ''}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="product-list-image-empty" role="img" aria-label={`${product.name} - photograph to follow`}>
            <Icon name="box" size={22}/>
            <span>Photograph to follow</span>
          </div>
        )}
      </div>

      <div className="product-list-info">
        <CardMeta product={product} showTrade={showTrade}/>
        <h3>{product.name}</h3>
        {/* Clamped in CSS to two or three lines; the full text is on the
            detail page, which the whole card opens. */}
        {product.description && <p className="product-list-desc">{product.description}</p>}
        <Specs product={product}/>
        {/* Only when there is a certification to name - an empty string would
            leave a bare award icon claiming nothing. */}
        {product.certification && <p className="product-cert"><Icon name="award" size={13}/>{product.certification}</p>}
        <span className="card-cue" aria-hidden="true">
          <span className="card-cue-long">View full specification</span>
          <span className="card-cue-short">View details</span>
          <Icon name="arrow" size={15}/>
        </span>
      </div>
    </article>
  )
}
