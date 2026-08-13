import { Fragment, useMemo } from 'react'
import { PageUnavailable } from '../../components/layout/PageUnavailable.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { cardProps } from '../../components/ui/Card.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { WorldMap, mapFromLocations } from '../../features/worldmap/index.js'
import { useProductCatalogue } from '../../features/products/index.js'
import { HOME_MAP_FALLBACK } from '../../data/globe.js'
import { useNavigate } from '../../app/navigation.js'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'
import { usePage } from '../../features/pages/index.js'
import { HeroMedia } from './sections/HeroMedia.jsx'
import { JourneyScroll } from './sections/JourneyScroll.jsx'
import { HOME_FALLBACK } from './homeFallback.js'

export default function HomePage({ selectProduct, theme }) {
  const [products] = useProductCatalogue()
  const navigate = useNavigate()
  // Published section data, edited at #admin/page-home. HOME_FALLBACK is the
  // wording that was hardcoded here before, kept as the pre-fetch and
  // API-unreachable render so the page is never a blank frame.
  const { section, shows, missing } = usePage('home', HOME_FALLBACK)
  const hero = section('hero')
  const intro = section('intro')
  const cards = section('differentiators')
  const stats = section('missionStats')
  const footprint = section('footprint')
  const productsIntro = section('productsIntro')
  const buyerPath = section('buyerPath')
  const manifesto = section('manifesto')
  const cta = section('cta')
  // The three featured slots are positional. While the catalogue is still in
  // flight the array is empty, so filter the holes out rather than render
  // undefined into ProductCard - the section simply has nothing in it for a
  // moment, which is the honest state.
  const homeProducts = [products[0], products[3], products[1]].filter(Boolean)
  // Same rule as About: the legend beside the globe is what plots it.
  const legend = footprint.legend
  const plot = useMemo(
    () => mapFromLocations(legend, (row) => row.text, HOME_MAP_FALLBACK),
    [legend]
  )

  // Unpublished in the admin - see usePage's three-state result.
  if (missing) return <PageUnavailable/>

  return <>
    <section className="home-hero">
      <HeroMedia/>
      <div className="hero-scroll-cue" aria-hidden="true"><span>SCROLL</span><i/></div>
      <div className="container home-hero-inner">
        <div className="hero-copy">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1>{hero.headingLine1}<br/>{hero.headingLine2} <em>{hero.headingAccent}</em></h1>
          <p>{hero.lede}</p>
          <div className="hero-buttons">
            <Button onClick={() => navigate(hero.primaryCtaRoute)}>{hero.primaryCtaLabel}</Button>
            <button className="quiet-link" onClick={() => navigate(hero.secondaryCtaRoute)}>{hero.secondaryCtaLabel} <Icon name="arrow" size={16}/></button>
          </div>
          <div className="hero-meta notranslate" translate="no">
            {(hero.metaItems ?? []).map((item, i) => (
              <Fragment key={item.text}>{i > 0 && <i/>}<span>{item.text}</span></Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-footer container"><span>GLOBAL IMPORT &amp; EXPORT · INDIA</span><div/><b>01 - 07</b></div>
    </section>

    <section className="intro-block section">
      <div className="container intro-block-grid">
        <Reveal as="div">
          <Eyebrow>{intro.eyebrow}</Eyebrow>
          <h2>{intro.headingLine1}<br/><em>{intro.headingAccent}</em></h2>
        </Reveal>
        <Reveal as="div" delay={90}>
          <p>{intro.body}</p>
          <Button variant="outline" onClick={() => navigate(intro.ctaRoute)}>{intro.ctaLabel}</Button>
        </Reveal>
      </div>
    </section>

    <section className="differentiators section">
      <div className="container">
        <div className="differentiator-grid">
          {(cards.items ?? []).map((card, index) => (
            <Reveal as="article" key={card.title} delay={index * 80} className="differentiator-card">
              <Icon name={card.icon} size={22}/>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="mission-stats section">
      <div className="container mission-stats-grid">
        <Reveal as="div">
          <Eyebrow>{stats.eyebrow}</Eyebrow>
          <h2>{stats.headingLine1}<br/><em>{stats.headingAccent}</em></h2>
        </Reveal>
        <div className="stats-grid">
          {(stats.items ?? []).map((stat, index) => (
            <Reveal as="div" key={stat.label} delay={index * 70} className="stat-card">
              <b>{stat.value}</b><span>{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="global-footprint section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>{footprint.eyebrow}</Eyebrow><h2>{footprint.headingLine1}<br/><em>{footprint.headingAccent}</em></h2></div>
        </Reveal>
        <div className="globe-layout">
          <Reveal as="div" delay={100} className="globe-stage">
            <WorldMap markers={plot.markers} arcs={plot.arcs}/>
          </Reveal>
          <Reveal as="div" delay={160} className="globe-legend">
            <ul>
              {(footprint.legend ?? []).map((row) => <li key={row.text}><i/> {row.text}</li>)}
            </ul>
            <p>{footprint.body}</p>
          </Reveal>
        </div>
      </div>
    </section>

    <section className="home-products section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>{productsIntro.eyebrow}</Eyebrow><h2>{productsIntro.headingLine1}<br/><em>{productsIntro.headingAccent}</em></h2></div>
          <button className="quiet-link" onClick={() => navigate('products')}>{productsIntro.linkLabel} <Icon name="arrow" size={16}/></button>
        </Reveal>
        <div className="product-feature-grid">
          {homeProducts.map((product, index) => (
            <Reveal as="article" key={product.slug} delay={index * 90} className={`product-feature product-feature-${index}`} {...cardProps(() => selectProduct(product.slug), `View ${product.name}`)}>
              <div className="product-feature-image">
                <img
                  src={unsplashAt(product.image, 800)}
                  srcSet={unsplashSrcSet(product.image)}
                  sizes="(max-width: 780px) 100vw, 33vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="product-feature-overlay"/>
              <span>{product.type.toUpperCase()}</span>
              <h3>{product.name}</h3>
              <p className="product-feature-desc">{product.description}</p>
              <span className="card-cue" aria-hidden="true"><Icon name="arrow"/></span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Not display:none. A hidden section is absent from the API payload, so
        the component never mounts, no ScrollTrigger is created and none of the
        fourteen /journey/*.webp files are requested. */}
    {shows('journey') && <JourneyScroll/>}

    <section className="buyer-path">
      <div className="container">
        <Reveal as="div" className="buyer-path-head">
          <div><Eyebrow>{buyerPath.eyebrow}</Eyebrow><h2>{buyerPath.headingLine1}<br/>to <em>{buyerPath.headingAccent}</em></h2></div>
          <p>{buyerPath.lede}</p>
        </Reveal>
        <div className="buyer-path-grid">
          {(buyerPath.items ?? []).map((step, index) => (
            <Reveal as="article" key={step.number} delay={index * 90}>
              <span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="home-manifesto">
      <div className="container manifesto-grid">
        <Reveal as="div" className="manifesto-visual">
          {/* An uploaded image replaces the CSS plate; with none set the plate
              stays, which is what the page has always shown. */}
          {manifesto.image?.url
            ? <img className="manifesto-image" src={manifesto.image.url} alt={manifesto.image.alt || ''} loading="lazy" decoding="async"/>
            : <div className="manifesto-image"/>}
          <div className="manifesto-stats">
            {(manifesto.stats ?? []).map((stat) => (
              <div className="manifesto-stat" key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>
            ))}
          </div>
        </Reveal>
        <Reveal as="div" delay={110}>
          <Eyebrow>{manifesto.eyebrow}</Eyebrow>
          <h2>{manifesto.headingLine1}<br/>{manifesto.headingLine2} <em>{manifesto.headingAccent}</em></h2>
          <p>{manifesto.body}</p>
          <button className="quiet-link" onClick={() => navigate(manifesto.linkRoute)}>{manifesto.linkLabel} <Icon name="arrow" size={16}/></button>
        </Reveal>
      </div>
    </section>

    <section className="home-cta">
      <Reveal as="div" className="container">
        <Eyebrow>{cta.eyebrow}</Eyebrow>
        <h2>{cta.headingLine1}<br/><em>{cta.headingAccent}</em></h2>
        <Button onClick={() => navigate(cta.ctaRoute)} variant="lime">{cta.ctaLabel}</Button>
      </Reveal>
    </section>
  </>
}