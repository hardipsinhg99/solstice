import { useMemo } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { visibleImage } from '../../features/pages/index.js'
import { EnquiryForm } from '../../features/enquiry/index.js'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageUnavailable } from '../../components/layout/PageUnavailable.jsx'
import { useNavigate } from '../../app/navigation.js'
import { usePage, HeroPicture } from '../../features/pages/index.js'
import { useProductCatalogue } from '../../features/products/index.js'
import { NETWORK_FALLBACK } from './networkFallback.js'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

/* Category tile columns from the number of tiles, so the last row is as full
   as the allowed counts permit - nine tiles are 3 x 3 on a tablet and 5 + 4 on
   a desktop, not 4 + 4 + 1. Ties go to the wider count. Phones are always 2,
   set in CSS. */
function balancedCols(n, options) {
  if (n <= options[0]) return Math.max(n, 1)
  let best = options[0]
  for (const c of options) if ((Math.ceil(n / c) * c - n) <= (Math.ceil(n / best) * best - n)) best = c
  return best
}
const TILE_SIZES = '(max-width: 699px) 50vw, (max-width: 1199px) 33vw, 260px'

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
      const row = groups.get(type) ?? { type, count: 0, image: null, cover: null, trade: p.trade }
      row.count += 1
      // A category's picture is the first gallery image found among its
      // products - in practice the wider category shot an editor adds there.
      // Only when no product in the category has one does a primary product
      // photograph stand in, so a tile is never blank while a picture exists.
      // (The catalogue's `image` is a URL string, not an object.)
      const g = p.gallery?.[0]
      if (!row.image && g?.url) row.image = { url: g.url, width: g.width, height: g.height }
      if (!row.cover && p.image) row.cover = { url: p.image, width: p.imageWidth, height: p.imageHeight }
      groups.set(type, row)
    }
    return [...groups.values()]
      .map((row) => ({ ...row, image: row.image ?? row.cover }))
      .sort((a, b) => b.count - a.count)
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
        {/* Decorative: alt="" keeps it out of the accessibility tree, and it
            stays out of flow (.network-hero-art is absolutely positioned), so
            no wrapper - an extra in-flow element would take a cell in the
            hero's layout. */}
        <HeroPicture
          image={hero.image}
          imageMobile={hero.imageMobile}
          focus={hero.imageFocus}
          fallback="/trade-network-hero.webp"
          fallbackPhone="/trade-network-hero-960.webp"
          className="network-hero-art"
        />

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
          {/* A list, so a screen reader hears how many categories there are.
              The reveal is on the cell, the hover on the button inside it. */}
          <ul className="network-category-grid" style={{
            '--cat-cols-tab': balancedCols(tiles.length, [2, 3]),
            '--cat-cols-lap': balancedCols(tiles.length, [3, 4]),
            '--cat-cols-desk': balancedCols(tiles.length, [4, 5])
          }}>
            {tiles.map((tile, i) => (
              <Reveal as="li" key={tile.type} delay={Math.min(i % 5, 4) * 60} className="network-category-item">
                <button type="button" className="network-category" onClick={() => navigate('products')}>
                  <span className="network-category-media">
                    {tile.image
                      ? <img
                          src={unsplashAt(tile.image.url, 480)}
                          srcSet={unsplashSrcSet(tile.image.url, [320, 480, 800])}
                          sizes={TILE_SIZES}
                          {...(tile.image.width ? { width: tile.image.width, height: tile.image.height } : {})}
                          alt="" loading="lazy" decoding="async"/>
                      : <span className="network-category-plate" aria-hidden="true"/>}
                  </span>
                  <span className="network-category-meta">
                    <span className="network-category-text">
                      <strong>{tile.type}</strong>
                      <span className="network-category-count">{tile.count} {tile.count === 1 ? 'product' : 'products'}</span>
                    </span>
                    <span className="network-category-go" aria-hidden="true"><Icon name="arrow" size={14}/></span>
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
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
        {/* The form itself, not a button to the form. This section's whole job is
            to collect an enquiry, and a buyer who has read this far should not
            have to make one more click and lose the thread. The button that used
            to sit here is gone rather than kept beside it: two enquiry CTAs
            stacked compete with each other, and the house rule is one primary
            action per viewport.
            Same component and same white card as the contact page - reused, not
            restyled - so the contrast is the pairing that was already measured
            rather than a new one invented for a green band. */}
        <div className="network-cta-form">
          <EnquiryForm/>
        </div>
      </Reveal>
    </section>
    )}
  </>
}
