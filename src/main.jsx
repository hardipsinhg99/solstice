import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Globe } from './Globe.jsx'
import { globeMarkers, globeArcs } from './data/globe.js'
import { products } from './data/products.js'
import { navItems } from './data/navigation.js'
import { contactFaq, chatFaq } from './data/faqs.js'
import { Icon } from './components/ui/Icon.jsx'
import { Button } from './components/ui/Button.jsx'
import { Eyebrow } from './components/ui/Eyebrow.jsx'
import { cardProps } from './components/ui/Card.jsx'
import { Reveal } from './components/motion/Reveal.jsx'
import { HERO_VIDEO_SRC, ENQUIRY_EMAIL, FORM_ENDPOINT, FORM_ACCESS_KEY } from './lib/constants.js'
import './styles/index.css'

const goTo = (route) => { window.location.hash = route === 'home' ? '' : route }

// Decides whether the hero video may exist at all. Gating happens here rather than
// in CSS because display:none still downloads the file - a component that never
// renders never requests it. Starts false so the first paint is always the poster.
function useHeroVideoAllowed() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    // 781px complements the 780px mobile breakpoint in styles.css exactly.
    const wide = window.matchMedia('(min-width: 781px)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection
    const evaluate = () => {
      const thin = connection && (connection.saveData === true ||
        connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')
      setAllowed(wide.matches && !still.matches && !thin)
    }
    evaluate()
    wide.addEventListener('change', evaluate)
    still.addEventListener('change', evaluate)
    connection?.addEventListener?.('change', evaluate)
    return () => {
      wide.removeEventListener('change', evaluate)
      still.removeEventListener('change', evaluate)
      connection?.removeEventListener?.('change', evaluate)
    }
  }, [])
  return allowed
}

// Decorative only: aria-hidden and tabIndex -1 keep it out of the a11y tree and
// off the tab order. Every failure path (404, bad codec, blocked autoplay) simply
// leaves opacity at 0, which is the existing hero.
function HeroVideo() {
  const ref = useRef(null)
  const onScreen = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const resume = () => { if (onScreen.current && !document.hidden) video.play().catch(() => {}) }

    // A dedicated observer, not useInView: that hook calls unobserve() on first
    // intersection by design, so it can report "seen" but never "left" - it cannot
    // drive pause/resume. Left as-is rather than changing its semantics site-wide.
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      if (entry.isIntersecting) resume()
      else video.pause()
    }, { threshold: 0.01 })
    io.observe(video)

    const onVisibility = () => { if (document.hidden) video.pause(); else resume() }
    const onCanPlay = () => setReady(true)
    document.addEventListener('visibilitychange', onVisibility)
    video.addEventListener('canplay', onCanPlay)
    if (video.readyState >= 3) setReady(true) // already buffered before we attached

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      video.removeEventListener('canplay', onCanPlay)
      video.pause()
    }
  }, [])

  return (
    <video
      ref={ref}
      className={ready ? 'hero-video ready' : 'hero-video'}
      src={HERO_VIDEO_SRC}
      muted loop playsInline autoPlay
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}

// The gate's state lives here, not in Home. If Home re-rendered when the gate
// resolves, its inline globeTheme object literals would be rebuilt, changing the
// Globe effect's dependencies and forcing a second WebGL init (measured: +857ms
// of script evaluation). Isolating the state keeps Home's render count at one.
function HeroMedia() {
  const allowed = useHeroVideoAllowed()
  return <div className="hero-media" aria-hidden="true">{allowed && <HeroVideo/>}</div>
}

function Header({ route, theme, setTheme }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : '' }, [menuOpen])
  const navigate = (target) => { goTo(target); setMenuOpen(false) }
  return (
    <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
      <div className="container nav">
        <button className="brand brand-logo" onClick={() => navigate('home')} aria-label="Solstice home">
          <img src="/solstice-logo.png" alt="Solstice Trading International LLP"/>
        </button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {navItems.map(([target, label]) => (
            <button className={route === target ? 'active' : ''} key={target} onClick={() => navigate(target)}>{label}</button>
          ))}
          <button className="nav-cta" onClick={() => navigate('contact')}>Send enquiry <Icon name="arrow" size={14}/></button>
        </nav>
        <div className="nav-tools">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17}/>
          </button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <Icon name={menuOpen ? 'close' : 'menu'}/>
          </button>
        </div>
      </div>
      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"/>}
    </header>
  )
}

function PageTitle({ eyebrow, title, accent, copy, mark }) {
  return (
    <section className="page-title">
      {mark && <span className="title-mark" aria-hidden="true">{mark}</span>}
      <div className="container">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title} <em>{accent}</em></h1>
        {copy && <p>{copy}</p>}
      </div>
    </section>
  )
}

function Home({ selectProduct, theme }) {
  const homeProducts = [products[0], products[3], products[1]]
  const globeTheme = theme === 'dark'
    ? { dark: 1, baseColor: [0.07, 0.21, 0.15], markerColor: [0.86, 0.93, 0.42], arcColor: [0.86, 0.93, 0.42], glowColor: [0.04, 0.09, 0.07], mapBrightness: 6 }
    : { dark: 0, baseColor: [1, 1, 1], markerColor: [0.04, 0.48, 0.29], arcColor: [0.04, 0.48, 0.29], glowColor: [0.94, 0.95, 0.91], mapBrightness: 10 }
  return <>
    <section className="home-hero">
      <HeroMedia/>
      <div className="hero-scroll-cue" aria-hidden="true"><span>SCROLL</span><i/></div>
      <div className="container home-hero-inner">
        <div className="hero-copy">
          <Eyebrow>GLOBAL SOURCING · IMPORT &amp; EXPORT</Eyebrow>
          <h1>From nature to<br/>your <em>table.</em></h1>
          <p>Solstice Trading International LLP is a global import-export and sourcing company delivering premium fruits, vegetables, spices and essential food products - headquartered in India, with operational footprints across the UAE, Vietnam and China.</p>
          <div className="hero-buttons">
            <Button onClick={() => goTo('products')}>Explore our produce</Button>
            <button className="quiet-link" onClick={() => goTo('contact')}>Request product details <Icon name="arrow" size={16}/></button>
          </div>
          <div className="hero-meta"><span>FRESH PRODUCE</span><i/><span>SPICES &amp; STAPLES</span><i/><span>GLOBAL TRADE</span></div>
        </div>
      </div>
      <div className="hero-footer container"><span>GLOBAL IMPORT &amp; EXPORT · INDIA</span><div/><b>01 - 07</b></div>
    </section>

    <section className="intro-block section">
      <div className="container intro-block-grid">
        <Reveal as="div">
          <Eyebrow>SOLSTICE TRADING INTERNATIONAL LLP</Eyebrow>
          <h2>Your global<br/><em>growth partner.</em></h2>
        </Reveal>
        <Reveal as="div" delay={90}>
          <p>Solstice Trading International LLP is committed to delivering premium quality food and agricultural products across international markets. Headquartered in India, with operational footprints in the UAE, Vietnam and China, we specialise in the trade of fresh fruits, vegetables, spices and essential food products - built on high-margin, sustainable business practices.</p>
          <Button variant="outline" onClick={() => goTo('contact')}>Send your requirement</Button>
        </Reveal>
      </div>
    </section>

    <section className="differentiators section">
      <div className="container">
        <div className="differentiator-grid">
          {[['globe', 'Global Reach', 'Serving buyers across international markets with dependable sourcing and delivery.'],
            ['check', 'Market Leader', 'A trusted trading partner known for consistency, quality and fair dealing.'],
            ['chat', 'Customer Focus', 'Responsive communication built around each buyer’s exact requirement.'],
            ['ship', 'Supply Chain Excellence', 'Streamlined sourcing, packaging and logistics from origin to destination.']]
            .map(([icon, title, copy], index) => (
              <Reveal as="article" key={title} delay={index * 80} className="differentiator-card">
                <Icon name={icon} size={22}/>
                <h3>{title}</h3>
                <p>{copy}</p>
              </Reveal>
            ))}
        </div>
      </div>
    </section>

    <section className="mission-stats section">
      <div className="container mission-stats-grid">
        <Reveal as="div">
          <Eyebrow>OUR MISSION</Eyebrow>
          <h2>Helping you grow<br/><em>your business.</em></h2>
        </Reveal>
        <div className="stats-grid">
          {[['3+', 'Years of experience'], ['50+', 'Global partners'], ['10+', 'Countries served'], ['2410', 'Products delivered']]
            .map(([value, label], index) => (
              <Reveal as="div" key={label} delay={index * 70} className="stat-card">
                <b>{value}</b><span>{label}</span>
              </Reveal>
            ))}
        </div>
      </div>
    </section>

    <section className="global-footprint section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>WHERE WE OPERATE</Eyebrow><h2>A truly global<br/><em>footprint.</em></h2></div>
        </Reveal>
        <div className="globe-layout">
          <Reveal as="div" delay={100} className="globe-stage">
            <Globe markers={globeMarkers} arcs={globeArcs} {...globeTheme}/>
          </Reveal>
          <Reveal as="div" delay={160} className="globe-legend">
            <ul>
              <li><i/> India - Headquarters</li>
              <li><i/> United Arab Emirates</li>
              <li><i/> Vietnam</li>
              <li><i/> China</li>
            </ul>
            <p>Sourcing, quality control and logistics are coordinated from our India headquarters, with operational footprints across the UAE, Vietnam and China.</p>
          </Reveal>
        </div>
      </div>
    </section>

    <section className="home-products section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>WHAT WE EXPORT</Eyebrow><h2>Fresh products,<br/><em>clearly presented.</em></h2></div>
          <button className="quiet-link" onClick={() => goTo('products')}>Browse product range <Icon name="arrow" size={16}/></button>
        </Reveal>
        <div className="product-feature-grid">
          {homeProducts.map((product, index) => (
            <Reveal as="article" key={product.slug} delay={index * 90} className={`product-feature product-feature-${index}`} {...cardProps(() => selectProduct(product.slug), `View ${product.name}`)}>
              <div className="product-feature-image" style={{ backgroundImage: `url('${product.image}')` }}/>
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

    <section className="buyer-path">
      <div className="container">
        <Reveal as="div" className="buyer-path-head">
          <div><Eyebrow>HOW TO START</Eyebrow><h2>From product enquiry<br/>to <em>next step.</em></h2></div>
          <p>Fresh produce is seasonal and requirements differ by market. We keep the initial discussion focused on the information that matters.</p>
        </Reveal>
        <div className="buyer-path-grid">
          {[['01', 'Choose a product', 'Browse our current produce categories and identify the fruit or vegetable you want to explore.'],
            ['02', 'Share your market', 'Send the destination, preferred pack and an indicative quantity for your enquiry.'],
            ['03', 'Discuss the fit', 'We will discuss seasonal availability and the practical next steps for your requirement.']]
            .map(([number, title, copy], index) => (
              <Reveal as="article" key={number} delay={index * 90}>
                <span>{number}</span><h3>{title}</h3><p>{copy}</p>
              </Reveal>
            ))}
        </div>
      </div>
    </section>

    <section className="home-manifesto">
      <div className="container manifesto-grid">
        <Reveal as="div" className="manifesto-visual">
          <div className="manifesto-image"/>
          <div className="manifesto-stats">
            <div className="manifesto-stat"><b>25+</b><span>Sourcing regions across India</span></div>
            <div className="manifesto-stat"><b>100%</b><span>Checked for quality at origin</span></div>
          </div>
        </Reveal>
        <Reveal as="div" delay={110}>
          <Eyebrow>THE SOLSTICE APPROACH</Eyebrow>
          <h2>Keep the product<br/>at the <em>centre.</em></h2>
          <p>Freshness, seasonality and buyer needs are at the heart of every conversation. We make it easy to begin with what you want to source.</p>
          <button className="quiet-link" onClick={() => goTo('services')}>Explore our services <Icon name="arrow" size={16}/></button>
        </Reveal>
      </div>
    </section>

    <section className="home-cta">
      <Reveal as="div" className="container">
        <Eyebrow>FOR BUYERS OF FRESH PRODUCE</Eyebrow>
        <h2>Looking for your next<br/><em>produce partner?</em></h2>
        <Button onClick={() => goTo('contact')} variant="lime">Start an enquiry</Button>
      </Reveal>
    </section>
  </>
}

function About() {
  return <>
    <PageTitle mark="02" eyebrow="ABOUT SOLSTICE" title="A considered approach to" accent="global trade." copy="We are a team focused on connecting global buyers with fresh produce, spices and essential food products from India."/>
    <section className="about-story section">
      <div className="container about-story-grid">
        <Reveal as="div" className="about-large-image"/>
        <Reveal as="div" delay={100}>
          <Eyebrow>OUR POINT OF VIEW</Eyebrow>
          <h2>Keep it fresh.<br/>Keep it <em>clear.</em></h2>
          <p>Fresh produce moves fast. That is why we believe in direct communication, practical planning and a product-first approach.</p>
          <p>Solstice is here to make product enquiries easier for the people buying, selling and serving fresh fruits and vegetables.</p>
        </Reveal>
      </div>
    </section>
    <section className="values section">
      <div className="container">
        <Reveal as="div"><Eyebrow>WHAT GUIDES US</Eyebrow></Reveal>
        <div className="value-grid">
          {[['01', 'Product first', 'The produce and its condition stay at the centre of every conversation.'],
            ['02', 'Clear communication', 'We keep product, availability and requirements easy to understand.'],
            ['03', 'Long-term thinking', 'We value relationships built through consistency and straightforward work.']]
            .map(([number, title, copy], index) => (
              <Reveal as="article" key={number} delay={index * 90}><b>{number}</b><h3>{title}</h3><p>{copy}</p></Reveal>
            ))}
        </div>
      </div>
    </section>
    <section className="founder section">
      <div className="container founder-grid">
        <Reveal as="div">
          <Eyebrow>FROM THE FOUNDER</Eyebrow>
          <h2>A message from<br/>our <em>founder.</em></h2>
          <p>Solstice Trading was built on a simple idea: fresh produce trade should be direct, transparent and easy to work with. Every enquiry we receive is handled with the same care we would want as a buyer ourselves - clear communication, honest availability and a genuine partnership mindset.</p>
          <p>We are grateful to the buyers, growers and partners who have trusted us so far, and we look forward to growing with you.</p>
          <div className="founder-sign"><b>[Founder Name]</b><span>Founder &amp; Director, Solstice Trading International LLP</span></div>
        </Reveal>
        <Reveal as="div" delay={120} className="founder-photo">
          <Icon name="user" size={28}/>
          <span>Founder photo coming soon</span>
        </Reveal>
      </div>
    </section>
  </>
}

function Services() {
  const services = [
    ['box', 'Import & Export of FMCG Products', 'End-to-end handling for fast-moving consumer goods, from fresh produce to packaged staples.'],
    ['globe', 'Global Sourcing & Procurement', 'Sourcing partners across India and international markets, matched to your specification and volume.'],
    ['check', 'International Trade Compliance', 'Documentation, customs and regulatory compliance managed for every cross-border shipment.'],
    ['leaf', 'Private Label & Packaging Solutions', 'Custom packaging and private-label programmes tailored to your brand and market.']
  ]
  const process = [
    ['leaf', 'Sourcing', 'Identifying and partnering with certified and qualified suppliers.'],
    ['check', 'Quality Check', 'Rigorous inspection and testing before produce moves onward.'],
    ['box', 'Packaging', 'Protective packaging matched to product and destination requirements.'],
    ['ship', 'Logistics', 'Efficient, well-coordinated freight from origin to arrival port.'],
    ['globe', 'Customs', 'Complete documentation and compliance for smooth customs clearance.'],
    ['arrow', 'Delivery', 'On-time delivery with full shipment visibility, door to door.']
  ]
  const trust = [
    ['award', 'Certified & Compliant', 'All operations are backed by the certifications and registrations international trade requires.'],
    ['globe', 'Global Sourcing Network', 'Established supplier relationships across growing regions and markets.'],
    ['ship', 'End-to-End Solutions', 'From sourcing to delivery, every stage is managed under one roof.'],
    ['check', 'Quality Assurance', 'Rigorous grading and inspection at every step of the supply chain.'],
    ['box', 'Competitive Pricing', 'Direct sourcing relationships that keep pricing fair and transparent.'],
    ['chat', 'Customer-Centric Approach', 'Dedicated support and clear communication throughout every enquiry.']
  ]
  return <>
    <PageTitle mark="03" eyebrow="HOW WE SUPPORT BUYERS" title="A simpler route to" accent="global trade." copy="Focused support around sourcing, compliance, packaging and export coordination."/>
    <section className="service-list section">
      <div className="container">
        {services.map(([icon, title, copy], index) => (
          <Reveal as="article" key={title} delay={index * 70}>
            <span>0{index + 1}</span>
            <Icon name={icon} size={29}/>
            <div><h3>{title}</h3><p>{copy}</p></div>
            <button onClick={() => goTo('contact')} aria-label={`Enquire about ${title}`}><Icon name="arrow"/></button>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="supply-cta section">
      <Reveal as="div" className="container supply-cta-grid">
        <div>
          <Eyebrow>TAILORED PROGRAMMES</Eyebrow>
          <h2>Custom supply chain<br/><em>solutions.</em></h2>
          <p>Need a tailored supply programme? Our team can build a custom solution that addresses your specific requirements for volume, quality, packaging and delivery timeline.</p>
          <Button onClick={() => goTo('contact')} variant="lime">Discuss your requirement</Button>
        </div>
        <ul className="supply-cta-list">
          <li><Icon name="check" size={16}/> Volume planning</li>
          <li><Icon name="check" size={16}/> Custom packaging</li>
          <li><Icon name="check" size={16}/> Quality control</li>
          <li><Icon name="check" size={16}/> Logistics management</li>
        </ul>
      </Reveal>
    </section>

    <section className="process section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>OUR WORKFLOW</Eyebrow><h2>From source to<br/><em>destination.</em></h2></div>
        </Reveal>
        <div className="process-list">
          {process.map(([icon, title, copy], index) => (
            <Reveal as="div" key={title} delay={index * 70} className="process-step">
              <div className="process-icon"><Icon name={icon} size={18}/></div>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="trust section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>WHY BUYERS CHOOSE US</Eyebrow><h2>Built on trust<br/>&amp; <em>excellence.</em></h2></div>
        </Reveal>
        <div className="trust-grid">
          {trust.map(([icon, title, copy], index) => (
            <Reveal as="article" key={title} delay={index * 70} className="trust-card">
              <Icon name={icon} size={20}/><h3>{title}</h3><p>{copy}</p>
            </Reveal>
          ))}
        </div>
        <Reveal as="div" className="cert-strip">
          <span className="cert-label">CERTIFICATIONS</span>
          <span className="cert-item"><Icon name="award" size={15}/> IEC (Import Export Code)</span>
          <span className="cert-item"><Icon name="award" size={15}/> Phytosanitary Certification</span>
        </Reveal>
      </div>
    </section>

    <section className="service-callout">
      <Reveal as="div" className="container">
        <Eyebrow>START WITH THE PRODUCT</Eyebrow>
        <h2>Tell us what your market<br/>is looking <em>for.</em></h2>
        <Button onClick={() => goTo('contact')} variant="lime">Send an enquiry</Button>
      </Reveal>
    </section>
  </>
}

function Products({ selectProduct }) {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? products : products.filter(p => p.type === filter)
  return <>
    <PageTitle mark="04" eyebrow="FRESH FROM INDIA" title="Our seasonal" accent="selection." copy="A concise collection of fresh fruits and vegetables. Availability depends on season and requirements."/>
    <section className="products-page section">
      <div className="container">
        <div className="product-filters">
          {['All', 'Fresh fruit', 'Fresh vegetable'].map(item => (
            <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item}</button>
          ))}
        </div>
        <div className="products-list">
          {filtered.map((product, index) => (
            <Reveal as="article" key={product.slug} delay={(index % 3) * 80} className="product-list-card" {...cardProps(() => selectProduct(product.slug), `View ${product.name}`)}>
              <div className="product-list-image" style={{ backgroundImage: `url('${product.image}')` }}/>
              <div className="product-list-info">
                <span>{product.type}</span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <span className="card-cue" aria-hidden="true">View product <Icon name="arrow" size={16}/></span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  </>
}

function ProductDetail({ product, selectProduct }) {
  if (!product) return <Products selectProduct={selectProduct}/>
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
            <button className="back-link" onClick={() => goTo('products')}>← All products</button>
            <span className="detail-index">0{index + 1} / 0{products.length}</span>
          </div>
          <span className="detail-type">{product.type.toUpperCase()}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="variety-pills">{product.varieties.map(v => <span key={v}>{v}</span>)}</div>
          <Button onClick={() => goTo('contact')}>Enquire about {product.name}</Button>
        </div>
        <Reveal as="div" className="detail-image" style={{ backgroundImage: `url('${product.image}')` }}/>
      </div>
    </section>
    <section className="detail-info section">
      <div className="container">
        <Reveal as="div" className="section-head"><div><Eyebrow>PRODUCT OVERVIEW</Eyebrow><h2>Everything you<br/>need to <em>know.</em></h2></div></Reveal>
        <div className="meta-grid">
          {meta.map(([icon, title, value], i) => (
            <Reveal as="div" key={title} delay={i * 80} className="meta-card">
              <div className="meta-icon"><Icon name={icon} size={19}/></div>
              <div><b>{title}</b><span>{value}</span></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
    {related.length > 0 && (
      <section className="related-products section">
        <div className="container">
          <Reveal as="div" className="section-head">
            <div><Eyebrow>KEEP EXPLORING</Eyebrow><h2>You may also<br/><em>be looking for.</em></h2></div>
          </Reveal>
          <div className="related-grid">
            {related.map((p, i) => (
              <Reveal as="article" key={p.slug} delay={i * 90} className="related-card" {...cardProps(() => selectProduct(p.slug), `View ${p.name}`)}>
                <div className="related-image" style={{ backgroundImage: `url('${p.image}')` }}/>
                <span>{p.type}</span>
                <h3>{p.name}</h3>
                <span className="card-cue" aria-hidden="true"><Icon name="arrow" size={15}/></span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )}
    <section className="detail-note">
      <div className="container">
        <Icon name="leaf"/>
        <p>Fresh produce is naturally seasonal. Final details-including variety, size, packing and availability-are confirmed with our team for each enquiry.</p>
      </div>
    </section>
  </>
}

function Team() {
  const team = [
    ['Trade & sourcing', 'Our team works closely on fresh-produce enquiries from product selection through initial discussions.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85'],
    ['Export coordination', 'Practical, detail-oriented support for conversations around export preparation.', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=85'],
    ['Buyer relationships', 'A responsive point of contact for buyers exploring products from India.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=85']
  ]
  return <>
    <PageTitle mark="05" eyebrow="THE PEOPLE BEHIND SOLSTICE" title="A small team with a" accent="global outlook." copy="Meet the people ready to start a product conversation with your business."/>
    <section className="team section">
      <div className="container team-grid">
        {team.map(([role, copy, image], index) => (
          <Reveal as="article" key={role} delay={index * 90}>
            <div className="team-image" style={{ backgroundImage: `url('${image}')` }}/>
            <span>0{index + 1}</span><h3>{role}</h3><p>{copy}</p>
          </Reveal>
        ))}
      </div>
    </section>
    <section className="team-join">
      <Reveal as="div" className="container">
        <h2>People who care about<br/><em>what arrives.</em></h2>
        <p>Have a produce enquiry? Start by telling us what you are looking for.</p>
        <Button onClick={() => goTo('contact')} variant="lime">Contact our team</Button>
      </Reveal>
    </section>
  </>
}

function Gallery() {
  const images = [
    'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1557844352-761f2565b576?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=1000&q=85'
  ]
  const [active, setActive] = useState(null)
  useEffect(() => {
    if (active === null) return
    const onKey = (event) => {
      if (event.key === 'Escape') setActive(null)
      if (event.key === 'ArrowRight') setActive(a => (a + 1) % images.length)
      if (event.key === 'ArrowLeft') setActive(a => (a - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
  return <>
    <PageTitle mark="06" eyebrow="A LOOK AT THE PRODUCE" title="Freshness, in" accent="focus." copy="A glimpse into the colour, texture and care behind our fresh-produce conversations."/>
    <section className="gallery section">
      <div className="container gallery-grid">
        {images.map((image, index) => (
          <Reveal as="button" key={image} delay={(index % 3) * 70} className={`gallery-tile tile-${index + 1}`} style={{ backgroundImage: `url('${image}')` }} onClick={() => setActive(index)} aria-label={`Open image ${index + 1} of ${images.length}`}>
            <span>0{index + 1}</span>
          </Reveal>
        ))}
      </div>
    </section>
    {active !== null && (
      <div className="lightbox" onClick={() => setActive(null)}>
        <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close"><Icon name="close" size={20}/></button>
        <button className="lightbox-nav prev" onClick={event => { event.stopPropagation(); setActive(a => (a - 1 + images.length) % images.length) }} aria-label="Previous image"><Icon name="arrow" size={20}/></button>
        <img src={images[active]} alt={`Fresh produce gallery ${active + 1}`} onClick={event => event.stopPropagation()}/>
        <button className="lightbox-nav next" onClick={event => { event.stopPropagation(); setActive(a => (a + 1) % images.length) }} aria-label="Next image"><Icon name="arrow" size={20}/></button>
      </div>
    )}
  </>
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="faq section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>QUESTIONS &amp; ANSWERS</Eyebrow><h2>Frequently asked<br/><em>questions.</em></h2></div>
        </Reveal>
        <div className="faq-list">
          {contactFaq.map((item, index) => (
            <Reveal as="div" key={item.q} delay={index * 60} className={open === index ? 'faq-item open' : 'faq-item'}>
              <button className="faq-question" onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>
                {item.q}<Icon name="arrow" size={15}/>
              </button>
              <div className="faq-answer"><p>{item.a}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// Failure fallback: never lose a lead to a dead endpoint - hand the buyer a
// prefilled mail draft carrying everything they already typed.
function mailtoFallback(payload) {
  const lines = [
    ['Name', payload.name], ['Email', payload.email], ['Phone', payload.phone],
    ['Company / market', payload.company], ['Product', payload.product],
    ['Quantity', [payload.quantity, payload.quantity_unit].filter(Boolean).join(' ')],
    ['Destination', payload.destination], ['Incoterm', payload.incoterm],
    ['Frequency', payload.frequency], ['Message', payload.message]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)
  const subject = `Enquiry - ${payload.product || 'general'}${payload.company ? ` - ${payload.company}` : ''}`
  return `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

function Contact() {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorDetail, setErrorDetail] = useState('')
  const [fallbackHref, setFallbackHref] = useState(`mailto:${ENQUIRY_EMAIL}`)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    if (payload.company_website) return // honeypot tripped - drop silently
    delete payload.company_website
    setFallbackHref(mailtoFallback(payload))

    if (!FORM_ENDPOINT) {
      setStatus('error')
      setErrorDetail('The enquiry endpoint is not configured (VITE_FORM_ENDPOINT is unset).')
      return
    }

    setStatus('submitting')
    setErrorDetail('')
    try {
      if (FORM_ACCESS_KEY) payload.access_key = FORM_ACCESS_KEY
      payload.subject = `New enquiry: ${payload.product || 'general'}${payload.company ? ` - ${payload.company}` : ''}`
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(`The enquiry service responded ${response.status}.`)
      setStatus('success')
      form.reset()
    } catch (error) {
      setStatus('error')
      setErrorDetail(error.message === 'Failed to fetch' ? 'Could not reach the enquiry service.' : error.message)
    }
  }

  return <>
    <PageTitle mark="07" eyebrow="CONTACT SOLSTICE" title="Let’s talk" accent="produce." copy="Tell us what you are looking for and where you want it to go."/>
    <section className="contact-page section">
      <div className="container contact-page-grid">
        <Reveal as="aside">
          <Eyebrow>START AN ENQUIRY</Eyebrow>
          <h2>Your next fresh<br/>produce <em>conversation.</em></h2>
          <p>We welcome enquiries from importers, distributors, retailers and foodservice buyers.</p>
          <a href="mailto:hello@solsticetrading.com">hello@solsticetrading.com</a>
          <div className="contact-points">
            <span><Icon name="globe" size={16}/> International buyer enquiries</span>
            <span><Icon name="leaf" size={16}/> Fresh fruits &amp; vegetables</span>
          </div>
        </Reveal>
        <Reveal as="form" delay={100} onSubmit={handleSubmit} aria-busy={status === 'submitting'}>
          <label>Name<input name="name" required autoComplete="name" placeholder="Your name"/></label>
          <label>Business email<input name="email" required type="email" autoComplete="email" placeholder="you@company.com"/></label>
          <label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" placeholder="+1 234 567 8900"/></label>
          <label>Company / market<input name="company" autoComplete="organization" placeholder="Company name and country"/></label>
          <label>What are you looking for?
            <select name="product" defaultValue="">
              <option value="" disabled>Select a product category</option>
              {products.map(p => <option key={p.slug}>{p.name}</option>)}
              <option>Spices &amp; staples</option>
              <option>Other product enquiry</option>
            </select>
          </label>
          <label>Quantity
            <span className="field-row">
              <input name="quantity" type="number" min="1" inputMode="numeric" placeholder="e.g. 24"/>
              <select name="quantity_unit" defaultValue="MT" aria-label="Quantity unit">
                <option>MT</option><option>20ft reefer</option><option>40ft reefer</option><option>Cartons</option>
              </select>
            </span>
          </label>
          <label>Destination port or country<input name="destination" autoComplete="country-name" placeholder="e.g. Jebel Ali, UAE"/></label>
          <label>Incoterm
            <select name="incoterm" defaultValue="Not sure">
              <option>FOB</option><option>CFR</option><option>CIF</option><option>DAP</option><option>Not sure</option>
            </select>
          </label>
          <label>How often do you need this?
            <select name="frequency" defaultValue="">
              <option value="" disabled>Select frequency</option>
              <option>One-time</option><option>Monthly</option><option>Seasonal programme</option><option>Annual contract</option>
            </select>
          </label>
          <label>Message<textarea name="message" placeholder="Product, variety, pack, estimated quantity or any relevant detail"/></label>
          <label className="consent-field">
            <input name="consent" type="checkbox" required value="yes"/>
            <span>I agree that Solstice Trading International LLP may use these details to respond to my enquiry.</span>
          </label>
          <label className="hp-field" aria-hidden="true">Company website
            <input name="company_website" tabIndex={-1} autoComplete="off"/>
          </label>
          <button className={status === 'success' ? 'button primary sent' : 'button primary'} type="submit" disabled={status === 'submitting'}>
            {status === 'success' ? <><Icon name="check" size={16}/> Enquiry received</>
              : status === 'submitting' ? <>Sending<span className="dots" aria-hidden="true"/></>
              : <>Send enquiry <Icon name="arrow" size={17}/></>}
          </button>
          <p className="form-status" role="status" aria-live="polite">
            {status === 'success' && 'Thank you - your enquiry has reached our team. We reply within one business day (IST 09:00-18:00).'}
          </p>
          {status === 'error' && (
            <p className="form-status form-error" role="alert">
              We could not send your enquiry. {errorDetail}{' '}
              <a href={fallbackHref}>Email it to us instead</a> - your answers are already in the draft.
            </p>
          )}
        </Reveal>
      </div>
    </section>
    <Faq/>
  </>
}

function Footer() {
  return (
    <footer>
      <div className="footer-cta">
        <div className="container footer-cta-inner">
          <div><Eyebrow>NEW ENQUIRY</Eyebrow><h3>Looking to source fresh produce, spices or staples from India?</h3></div>
          <Button onClick={() => goTo('contact')} variant="lime">Start an enquiry</Button>
        </div>
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <button className="brand brand-logo footer-logo" onClick={() => goTo('home')} aria-label="Solstice home">
            <img src="/solstice-logo.png" alt="Solstice Trading International LLP"/>
          </button>
          <p>Fresh produce, spices &amp; essential foods<br/>from India, for international buyers.</p>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Explore</span>
          {navItems.slice(1, 4).map(([route, label]) => <button key={route} onClick={() => goTo(route)}>{label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Company</span>
          {navItems.slice(4).map(([route, label]) => <button key={route} onClick={() => goTo(route)}>{label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Get in touch</span>
          <a href="mailto:hello@solsticetrading.com">hello@solsticetrading.com</a>
          <span className="footer-note">International buyer enquiries welcome</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Solstice Trading International LLP</span>
        <span>Fresh produce export, from India to your market.</span>
      </div>
    </footer>
  )
}

function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi! Ask about fresh fruits, vegetables, or how to start a buyer enquiry.' }])
  const [typing, setTyping] = useState(false)
  const [asked, setAsked] = useState([])
  const listRef = useRef(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const ask = (item) => {
    setMessages(m => [...m, { from: 'user', text: item.q }])
    setAsked(a => [...a, item.q])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { from: 'bot', text: item.a, cta: item.cta }])
    }, 600)
  }

  const remaining = chatFaq.filter(f => !asked.includes(f.q))

  return <>
    <div className={open ? 'chat-panel visible' : 'chat-panel'}>
      <div className="chat-head">
        <span className="online-dot"/>
        <div><b>Solstice team</b><small>Usually replies within a day</small></div>
        <button onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={16}/></button>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((message, index) => (
          <div key={index} className={`chat-bubble ${message.from}`}>
            <p>{message.text}</p>
            {message.cta && (
              <button className="chat-bubble-cta" onClick={() => { goTo(message.cta[1]); setOpen(false) }}>
                {message.cta[0]} <Icon name="arrow" size={13}/>
              </button>
            )}
          </div>
        ))}
        {typing && <div className="chat-bubble bot chat-typing"><i/><i/><i/></div>}
      </div>
      {remaining.length > 0 ? (
        <div className="chat-quick">
          {remaining.slice(0, 3).map(item => <button key={item.q} onClick={() => ask(item)}>{item.q}</button>)}
        </div>
      ) : (
        <div className="chat-quick">
          <button className="chat-enquire" onClick={() => { goTo('contact'); setOpen(false) }}>Start an enquiry <Icon name="arrow" size={14}/></button>
        </div>
      )}
    </div>
    <button className="chat-button" onClick={() => setOpen(!open)} aria-label="Open chat">
      <Icon name={open ? 'close' : 'chat'} size={22}/>
    </button>
  </>
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('solstice-theme') || 'light')
  const [route, setRoute] = useState(location.hash.slice(1) || 'home')

  useEffect(() => {
    const sync = () => setRoute(location.hash.slice(1) || 'home')
    addEventListener('hashchange', sync)
    return () => removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('solstice-theme', theme)
  }, [theme])

  useEffect(() => { window.scrollTo(0, 0) }, [route])

  const selectProduct = (slug) => goTo(`product/${slug}`)
  const product = route.startsWith('product/') ? products.find(p => p.slug === route.split('/')[1]) : null
  const pages = {
    home: <Home selectProduct={selectProduct} theme={theme}/>,
    about: <About/>,
    services: <Services/>,
    products: <Products selectProduct={selectProduct}/>,
    team: <Team/>,
    gallery: <Gallery/>,
    contact: <Contact/>
  }

  return <>
    <Header route={route.startsWith('product/') ? 'products' : route} theme={theme} setTheme={setTheme}/>
    <main>{route.startsWith('product/') ? <ProductDetail product={product} selectProduct={selectProduct}/> : (pages[route] || pages.home)}</main>
    <Footer/>
    <ChatWidget/>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
