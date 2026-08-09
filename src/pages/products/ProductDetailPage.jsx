import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { products } from '../../data/products.js'
import { RelatedProducts } from '../../features/products/index.js'
import { useNavigate } from '../../app/navigation.js'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'
import ProductsPage from './ProductsPage.jsx'

export default function ProductDetailPage({ product, selectProduct }) {
  const navigate = useNavigate()
  if (!product) return <ProductsPage selectProduct={selectProduct}/>
  const index = products.findIndex(p => p.slug === product.slug)
  const related = [...products.filter(p => p.slug !== product.slug && p.type === product.type), ...products.filter(p => p.slug !== product.slug && p.type !== product.type)].slice(0, 3)
  const meta = [
    ['calendar', 'Seasonality', product.season],
    ['globe', 'Origin', product.origin],
    ['ship', 'Packaging options', product.packaging],
    ['award', 'Certifications', product.certification]
  ]
  return <>
    <section className="detail-hero">
      <div className="container detail-grid">
        <div className="detail-copy">
          <div className="detail-top">
            <button className="back-link" onClick={() => navigate('products')}>← All products</button>
            <span className="detail-index notranslate" translate="no">0{index + 1} / 0{products.length}</span>
          </div>
          <span className="detail-type notranslate" translate="no">{product.type.toUpperCase()}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          {/* Cultivar names are proper nouns - "Alphonso" must not become a literal. */}
          <div className="variety-pills notranslate" translate="no">{product.varieties.map(v => <span key={v}>{v}</span>)}</div>
          <Button onClick={() => navigate('contact')}>Enquire about {product.name}</Button>
        </div>
        {/* The one image on the site that must NOT be lazy: it is the largest
            element in this page's first viewport, so it is the LCP candidate.
            fetchPriority high pulls it ahead of the catalogue thumbnails that
            the browser would otherwise schedule alongside it. */}
        <Reveal as="div" className="detail-image">
          <img
            src={unsplashAt(product.image, 1000)}
            srcSet={unsplashSrcSet(product.image, [600, 1000, 1400])}
            sizes="(max-width: 780px) 89vw, 50vw"
            alt={product.name}
            fetchPriority="high"
            decoding="async"
          />
        </Reveal>
      </div>
    </section>
    <section className="detail-info section">
      <div className="container">
        <Reveal as="div" className="section-head"><div><Eyebrow>PRODUCT OVERVIEW</Eyebrow><h2>Everything you<br/>need to <em>know.</em></h2></div></Reveal>
        <div className="meta-grid">
          {meta.map(([icon, title, value], i) => (
            <Reveal as="div" key={title} delay={i * 80} className="meta-card">
              <div className="meta-icon"><Icon name={icon} size={19}/></div>
              <div><b>{title}</b><span className="notranslate" translate="no">{value}</span></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
    <RelatedProducts products={related} onSelect={selectProduct}/>
    <section className="detail-note">
      <div className="container">
        <Icon name="leaf"/>
        <p>Fresh produce is naturally seasonal. Final details-including variety, size, packing and availability-are confirmed with our team for each enquiry.</p>
      </div>
    </section>
  </>
}