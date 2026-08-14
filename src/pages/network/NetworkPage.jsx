import { useMemo } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { visibleImage } from '../../features/pages/index.js'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageUnavailable } from '../../components/layout/PageUnavailable.jsx'
import { useNavigate } from '../../app/navigation.js'
import { usePage } from '../../features/pages/index.js'
import { useProductCatalogue } from '../../features/products/index.js'
import { NETWORK_FALLBACK } from './networkFallback.js'

/**
 * Global Trade Network.
 *
 * Added as a config entry plus a seed row, exactly as Services was - no new
 * content mechanism. Every string a buyer reads here comes from
 * usePage('network'); there is no copy in this file. The only content NOT from
 * the page record is the category grid, which is derived from the live product
 * catalogue on purpose, so renaming a product type in the admin moves the tiles
 * without a deploy.
 */
export default function NetworkPage() {
  const navigate = useNavigate()
  const { section, shows, missing } = usePage('network', NETWORK_FALLBACK)
  const [products] = useProductCatalogue()

  const hero = section('hero')
  const stats = section('stats')
  const process = section('process')
  const services = section('services')
  const categories = section('categories')
  const voices = section('voices')
  const why = section('why')

  // Resolved through visibleImage so an unpublished or removed asset degrades to
  // null here, once, rather than each render site testing a different condition.
  const heroImage = visibleImage(hero.image)
  const whyImage = visibleImage(why.image)
  const cta = section('cta')

  // Tiles from the catalogue, not a hardcoded list. Grouped by the product's
  // own `type`, counted, and with the placeholder rows excluded - an import slot
  // typed "To be confirmed" is not a category a buyer can browse.
  const tiles = useMemo(() => {
    const groups = new Map()
    for (const p of products ?? []) {
      const type = (p.type ?? '').trim()
      if (!type || /^to be confirmed$/i.test(type)) continue
      const row = groups.get(type) ?? { type, count: 0, image: null, trade: p.trade }
      row.count += 1
      row.image = row.image ?? p.image?.url ?? p.gallery?.[0]?.url ?? null
      groups.set(type, row)
    }
    return [...groups.values()].sort((a, b) => b.count - a.count)
  }, [products])

  if (missing) return <PageUnavailable/>

  return <>
    {shows('hero') && (
      <section className="network-hero">
        {/* The artwork ships with the page but is replaceable from the admin.
            Two sources: the browser takes the 960px file on small screens, so a
            phone never downloads the 1536px one. No baked-in text - every word
            below is real HTML, which is what keeps the hero readable at 390px,
            indexable, translatable and reachable by a screen reader. */}
        <picture className="network-hero-art">
          {/* The phone-sized <source> may only be offered for the BUILT-IN artwork.
              It used to be unconditional, and <source> beats <img src>, so on a
              phone an uploaded hero was silently ignored and the bundled file
              rendered instead - an upload that appeared to do nothing below
              780px. An uploaded asset is already capped at 1600px by the media
              pipeline, so it needs no second source. */}
          {!heroImage && <source media="(max-width: 780px)" srcSet="/trade-network-hero-960.webp"/>}
          <img src={heroImage?.url || '/trade-network-hero.webp'}
               alt="" aria-hidden="true" fetchPriority="high" decoding="async"/>
        </picture>

        <div className="container network-hero-inner">
          <Reveal as="div" className="network-hero-copy">
            <p className="network-hero-eyebrow">{hero.eyebrow}</p>
            {/* line 1 sans, line 2 serif. The <em> is not emphasis for its own
                sake - base.css already renders h1 em as upright Playfair, so the
                split typeface the design asks for is the site's existing rule
                rather than a new one invented here. */}
            <h1>{hero.headingLine1}<br/><em>{hero.headingAccent}</em></h1>
            <p className="network-lede">{hero.lede}</p>
            <div className="network-hero-actions">
              {hero.primaryCtaLabel &&
                <Button onClick={() => navigate(hero.primaryCtaRoute)}>{hero.primaryCtaLabel}</Button>}
              {hero.secondaryCtaLabel &&
                <Button variant="glass" onClick={() => navigate(hero.secondaryCtaRoute)}>
                  {hero.secondaryCtaLabel}
                </Button>}
            </div>
          </Reveal>

          {((hero.steps ?? []).length > 0 || hero.trustTitle) && (
            <Reveal as="div" delay={120} className="network-hero-foot">
              {(hero.steps ?? []).length > 0 && (
                /* An ordered list, because it is a sequence. The connectors are
                   CSS pseudo-elements rather than markup, so a screen reader
                   hears five steps and not five arrows. */
                <ol className="network-flow">
                  {hero.steps.map((step, i) => (
                    <li className="network-flow-step" key={step.label ?? i}>
                      <span className="network-flow-icon" aria-hidden="true">
                        <Icon name={step.icon || 'check'} size={22}/>
                      </span>
                      <span className="network-flow-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="network-flow-label">{step.label}</span>
                      <span className="network-flow-body">{step.body}</span>
                    </li>
                  ))}
                </ol>
              )}
              {hero.trustTitle && (
                <aside className="network-trust">
                  <span className="network-trust-mark" aria-hidden="true"><Icon name="check" size={26}/></span>
                  <div>
                    <strong>{hero.trustTitle}<br/>{hero.trustTitle2}</strong>
                    <p>{hero.trustBody}</p>
                  </div>
                </aside>
              )}
            </Reveal>
          )}
        </div>
      </section>
    )}

    {/* Omitted entirely when empty rather than rendered as a hollow band - the
        section exists to carry evidence, and no evidence means no section. */}
    {shows('stats') && (stats.items ?? []).length > 0 && (
      <section className="section network-stats">
        <div className="container">
          <Reveal as="h2" className="network-stats-heading">{stats.heading}</Reveal>
          <div className="network-stat-grid">
            {stats.items.map((s, i) => (
              <Reveal as="div" key={s.label ?? i} delay={i * 70}
                      className={s.unresolvedScope ? 'network-stat is-unresolved' : 'network-stat'}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )}

    {shows('process') && (process.steps ?? []).length > 0 && (
      <section className="section network-process">
        <div className="container">
          <Reveal as="div" className="section-head">
            <Eyebrow>{process.eyebrow}</Eyebrow>
            <h2>{process.heading}</h2>
            {process.intro && <p className="network-lede">{process.intro}</p>}
          </Reveal>
          <ol className="network-step-list">
            {process.steps.map((step, i) => (
              <Reveal as="li" key={step.title ?? i} delay={i * 70} className="network-step">
                <span className="network-step-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {step.icon && <Icon name={step.icon} size={20}/>}
                <h3>{step.title}</h3>
                {/* Sanitized server-side against the allowlist in
                    common/sanitize.ts - not trusted at render. */}
                {step.body && <div className="about-rich"
                                   dangerouslySetInnerHTML={{ __html: step.body }}/>}
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    )}

    {shows('services') && (services.items ?? []).length > 0 && (
      <section className="section network-services">
        <div className="container">
          <Reveal as="div" className="section-head">
            <Eyebrow>{services.eyebrow}</Eyebrow>
            <h2>{services.heading}</h2>
            {services.intro && <p className="network-lede">{services.intro}</p>}
          </Reveal>
          <div className="network-service-grid">
            {services.items.map((item, i) => (
              <Reveal as="article" key={item.title ?? i} delay={i * 70}
                      className={item.unresolvedCopy ? 'network-service is-unresolved' : 'network-service'}>
                {item.icon && <Icon name={item.icon} size={22}/>}
                <h3>{item.title}</h3>
                {item.body && <div className="about-rich"
                                   dangerouslySetInnerHTML={{ __html: item.body }}/>}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )}

    {shows('categories') && tiles.length > 0 && (
      <section className="section network-categories">
        <div className="container">
          <Reveal as="div" className="section-head">
            <Eyebrow>{categories.eyebrow}</Eyebrow>
            <h2>{categories.heading}</h2>
            {categories.intro && <p className="network-lede">{categories.intro}</p>}
          </Reveal>
          <div className="network-category-grid">
            {tiles.map((tile, i) => (
              <Reveal as="div" key={tile.type} delay={i * 70}>
                <button className="network-category" onClick={() => navigate('products')}>
                  {tile.image
                    ? <img src={tile.image} alt="" loading="lazy" decoding="async"/>
                    : <span className="network-category-plate" aria-hidden="true"/>}
                  <span className="network-category-meta">
                    <strong>{tile.type}</strong>
                    <span>{tile.count} {tile.count === 1 ? 'product' : 'products'}</span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )}

    {/* Marquee. Duplicated track, translated by exactly -50% so the second
        copy lands where the first began and the loop has no seam. The copy is
        aria-hidden so a screen reader hears each quote once, not twice. */}
    {shows('voices') && (voices.items ?? []).length > 0 && (
      <section className="section network-voices">
        <div className="container">
          <Reveal as="div" className="section-head">
            <Eyebrow>{voices.eyebrow}</Eyebrow>
            <h2>{voices.heading}</h2>
          </Reveal>
        </div>
        <div className="network-marquee" data-count={voices.items.length}>
          <div className="network-marquee-track">
            {[0, 1].map((copy) => (
              <div className="network-marquee-run" key={copy} aria-hidden={copy === 1 || undefined}>
                {voices.items.map((v, i) => (
                  <figure className="network-voice" key={`${copy}-${i}`}>
                    <blockquote>{v.quote}</blockquote>
                    <figcaption>
                      {v.photo?.url && <img src={v.photo.url} alt="" loading="lazy" decoding="async"/>}
                      <span><strong>{v.name}</strong>{v.role && <em>{v.role}</em>}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    )}

    {shows('why') && (why.points ?? []).length > 0 && (
      <section className="section network-why">
        <div className="container">
          <Reveal as="div" className="section-head">
            <h2>{why.heading}</h2>
            {why.intro && <p className="network-lede">{why.intro}</p>}
          </Reveal>
          {/* data-has-image drives the columns from CSS rather than swapping
              class names in JS, so with no image - never set, unpublished, or
              removed - this collapses to the single-column layout that existed
              before the image did. No empty cell, no reserved gap. */}
          <div className="network-why-body" data-has-image={whyImage ? '' : undefined}>
            {whyImage && (
              <Reveal as="figure" className="network-why-figure">
                {/* width/height are the asset's real intrinsic size, so the box
                    is reserved before the file arrives and nothing jumps. */}
                <img src={whyImage.url} alt={whyImage.alt || ''}
                     width={whyImage.width || undefined} height={whyImage.height || undefined}
                     loading="lazy" decoding="async"/>
              </Reveal>
            )}
            <ul className="network-why-list">
              {why.points.map((p, i) => (
                <Reveal as="li" key={p.text ?? i} delay={i * 50}>
                  <Icon name="check" size={16}/> {p.text}
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>
    )}

    {/* Guarded like every other section. It was the one band that rendered
        unconditionally, so a page with no data still painted an empty dark
        slab under the hero - which is exactly what the fallback-only render
        looked like before the seed row existed. */}
    {shows('cta') && cta.headingLine1 && (
    <section className="network-cta">
      <Reveal as="div" className="container">
        <Eyebrow>{cta.eyebrow}</Eyebrow>
        <h2>{cta.headingLine1}<br/><em>{cta.headingAccent}</em></h2>
        {cta.body && <p>{cta.body}</p>}
        {cta.ctaLabel &&
          <Button variant="lime" onClick={() => navigate(cta.ctaRoute)}>{cta.ctaLabel}</Button>}
      </Reveal>
    </section>
    )}
  </>
}
