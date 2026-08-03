import { Icon } from '../../components/ui/Icon.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { cardProps } from '../../components/ui/Card.jsx'

export function RelatedProducts({ products, onSelect }) {
  if (products.length === 0) return null
  return (
    <section className="related-products section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>KEEP EXPLORING</Eyebrow><h2>You may also<br/><em>be looking for.</em></h2></div>
        </Reveal>
        <div className="related-grid">
          {products.map((p, i) => (
            <Reveal as="article" key={p.slug} delay={i * 90} className="related-card" {...cardProps(() => onSelect(p.slug), `View ${p.name}`)}>
              <div className="related-image" style={{ backgroundImage: `url('${p.image}')` }}/>
              <span>{p.type}</span>
              <h3>{p.name}</h3>
              <span className="card-cue" aria-hidden="true"><Icon name="arrow" size={15}/></span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
