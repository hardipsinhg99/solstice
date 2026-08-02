import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Globe } from './Globe.jsx'
import './styles.css'

const globeMarkers = [
  { id: 'india', location: [19.0760, 72.8777], label: 'Mumbai, India — HQ' },
  { id: 'uae', location: [25.2048, 55.2708], label: 'Dubai, UAE' },
  { id: 'vietnam', location: [10.8231, 106.6297], label: 'Ho Chi Minh City, Vietnam' },
  { id: 'china', location: [31.2304, 121.4737], label: 'Shanghai, China' }
]
const globeArcs = [
  { id: 'india-uae', from: [19.0760, 72.8777], to: [25.2048, 55.2708] },
  { id: 'india-vietnam', from: [19.0760, 72.8777], to: [10.8231, 106.6297] },
  { id: 'india-china', from: [19.0760, 72.8777], to: [31.2304, 121.4737] }
]

const Icon = ({ name, size = 20 }) => {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.6 3 14.4 0 18M12 3c-3 3.6-3 14.4 0-18"/></>,
    leaf: <><path d="M20 4C10 4 4 9 4 18c8 0 15-5 16-14Z"/><path d="M4 18c3-4 7-7 12-9"/></>,
    box: <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
    check: <path d="m5 12 4.2 4L19 6.5"/>,
    ship: <><path d="M3 17h18l-3 4H6l-3-4Z"/><path d="M6 17V9h12v8M9 9V5h6v4M2 21c2 .9 4 .9 6 0 2 .9 4 .9 6 0"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.7-.85L4 20l1.35-3.65A7.2 7.2 0 0 1 4 12a7.5 7.5 0 0 1 8-7.5 7.5 7.5 0 0 1 8 7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-1.5 7 5-2.5 5 2.5-1.5-7"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const products = [
  { slug: 'mangoes', name: 'Mangoes', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=88', description: 'Seasonal Indian mangoes selected for colour, maturity and eating quality.', varieties: ['Kesar', 'Alphonso', 'Banganapalli'], season: 'April – July (peak season)', origin: 'Gujarat, Maharashtra, Andhra Pradesh', packaging: '4kg, 5kg & 10kg export cartons', certification: 'Phytosanitary certificate on every shipment' },
  { slug: 'pomegranates', name: 'Pomegranates', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&w=1000&q=88', description: 'Fresh pomegranates carefully selected for vibrant appearance and condition.', varieties: ['Bhagwa'], season: 'September – February', origin: 'Maharashtra, Karnataka', packaging: '4kg & 5kg telescopic cartons', certification: 'Phytosanitary certificate on every shipment' },
  { slug: 'grapes', name: 'Table Grapes', type: 'Fresh fruit', image: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=1000&q=88', description: 'Fresh table grapes sourced during the Indian season for export enquiries.', varieties: ['Green grapes', 'Black grapes'], season: 'January – April', origin: 'Nashik (Maharashtra), Karnataka', packaging: '4.5kg vented export cartons', certification: 'Phytosanitary certificate on every shipment' },
  { slug: 'onions', name: 'Onions', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=1000&q=88', description: 'Export-oriented onions selected and packed according to buyer requirements.', varieties: ['Red onion'], season: 'Year-round, peak Nov – Mar', origin: 'Maharashtra, Gujarat, Madhya Pradesh', packaging: '10kg, 20kg & 25kg mesh bags', certification: 'Phytosanitary certificate on every shipment' },
  { slug: 'okra', name: 'Okra', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=1000&q=88', description: 'Fresh okra for buyers seeking Indian vegetables in seasonal programmes.', varieties: ['Fresh okra'], season: 'March – November', origin: 'Gujarat, Karnataka', packaging: '4kg & 5kg vented cartons', certification: 'Phytosanitary certificate on every shipment' },
  { slug: 'mixed-vegetables', name: 'Seasonal Vegetables', type: 'Fresh vegetable', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=88', description: 'A selection of seasonal Indian vegetables, subject to market and availability.', varieties: ['Enquire with requirements'], season: 'Seasonal, subject to availability', origin: 'Multiple growing regions across India', packaging: 'Pack format confirmed per requirement', certification: 'Phytosanitary certificate on every shipment' }
]

const navItems = [['home', 'Home'], ['about', 'About us'], ['services', 'Services'], ['products', 'Products'], ['team', 'Team'], ['gallery', 'Gallery'], ['contact', 'Contact us']]

const goTo = (route) => { window.location.hash = route === 'home' ? '' : route }

// Scroll-reveal: fades sections in as they enter the viewport, skipped entirely for reduced-motion users.
function useInView(options) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.unobserve(el) }
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px', ...options })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}

function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return <Tag ref={ref} className={['reveal', inView && 'in', className].filter(Boolean).join(' ')} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>{children}</Tag>
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

function Eyebrow({ children }) { return <p className="eyebrow">{children}</p> }

function Button({ children, onClick, variant = 'primary' }) {
  return <button onClick={onClick} className={`button ${variant}`}>{children}<Icon name="arrow" size={17}/></button>
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
      <div className="hero-media" aria-hidden="true"/>
      <div className="hero-scroll-cue" aria-hidden="true"><span>SCROLL</span><i/></div>
      <div className="container home-hero-inner">
        <div className="hero-copy">
          <Eyebrow>GLOBAL SOURCING · IMPORT &amp; EXPORT</Eyebrow>
          <h1>From nature to<br/>your <em>table.</em></h1>
          <p>Solstice Trading International LLP is a global import-export and sourcing company delivering premium fruits, vegetables, spices and essential food products — headquartered in India, with operational footprints across the UAE, Vietnam and China.</p>
          <div className="hero-buttons">
            <Button onClick={() => goTo('products')}>Explore our produce</Button>
            <button className="quiet-link" onClick={() => goTo('contact')}>Request product details <Icon name="arrow" size={16}/></button>
          </div>
          <div className="hero-meta"><span>FRESH PRODUCE</span><i/><span>SPICES &amp; STAPLES</span><i/><span>GLOBAL TRADE</span></div>
        </div>
      </div>
      <div className="hero-footer container"><span>GLOBAL IMPORT &amp; EXPORT · INDIA</span><div/><b>01 — 07</b></div>
    </section>

    <section className="intro-block section">
      <div className="container intro-block-grid">
        <Reveal as="div">
          <Eyebrow>SOLSTICE TRADING INTERNATIONAL LLP</Eyebrow>
          <h2>Your global<br/><em>growth partner.</em></h2>
        </Reveal>
        <Reveal as="div" delay={90}>
          <p>Solstice Trading International LLP is committed to delivering premium quality food and agricultural products across international markets. Headquartered in India, with operational footprints in the UAE, Vietnam and China, we specialise in the trade of fresh fruits, vegetables, spices and essential food products — built on high-margin, sustainable business practices.</p>
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
              <li><i/> India — Headquarters</li>
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
            <Reveal as="article" key={product.slug} delay={index * 90} className={`product-feature product-feature-${index}`} onClick={() => selectProduct(product.slug)}>
              <div className="product-feature-image" style={{ backgroundImage: `url('${product.image}')` }}/>
              <div className="product-feature-overlay"/>
              <span>{product.type.toUpperCase()}</span>
              <h3>{product.name}</h3>
              <p className="product-feature-desc">{product.description}</p>
              <button aria-label={`View ${product.name}`}><Icon name="arrow"/></button>
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
          <p>Solstice Trading was built on a simple idea: fresh produce trade should be direct, transparent and easy to work with. Every enquiry we receive is handled with the same care we would want as a buyer ourselves — clear communication, honest availability and a genuine partnership mindset.</p>
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
            <Reveal as="article" key={product.slug} delay={(index % 3) * 80} className="product-list-card" onClick={() => selectProduct(product.slug)}>
              <div className="product-list-image" style={{ backgroundImage: `url('${product.image}')` }}/>
              <div className="product-list-info">
                <span>{product.type}</span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <button>View product <Icon name="arrow" size={16}/></button>
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
              <Reveal as="article" key={p.slug} delay={i * 90} className="related-card" onClick={() => selectProduct(p.slug)}>
                <div className="related-image" style={{ backgroundImage: `url('${p.image}')` }}/>
                <span>{p.type}</span>
                <h3>{p.name}</h3>
                <button aria-label={`View ${p.name}`}><Icon name="arrow" size={15}/></button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )}
    <section className="detail-note">
      <div className="container">
        <Icon name="leaf"/>
        <p>Fresh produce is naturally seasonal. Final details—including variety, size, packing and availability—are confirmed with our team for each enquiry.</p>
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

const contactFaq = [
  { q: 'What products do you export?', a: 'Fresh fruits and vegetables, spices and select essential food products, sourced from growing regions across India.' },
  { q: 'Which countries do you operate in?', a: 'We are headquartered in India with operational footprints across the UAE, Vietnam and China, and work with buyers in other markets on enquiry.' },
  { q: 'What certifications do you have?', a: 'We hold an Import Export Code (IEC) and provide phytosanitary certification with every shipment; further certifications are confirmed per product and destination.' },
  { q: 'What is your minimum order quantity?', a: 'MOQ depends on the product, pack format and destination — share your requirement and we will confirm what is possible.' },
  { q: 'How do you ensure quality?', a: 'Every shipment is visually graded and quality-checked at origin before packing and dispatch.' },
  { q: 'What is your typical shipping time?', a: 'Shipping time depends on the destination port and mode of transport — we will confirm an estimated timeline as part of your enquiry.' }
]

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

function Contact() {
  const [sent, setSent] = useState(false)
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
        <Reveal as="form" delay={100} onSubmit={event => { event.preventDefault(); setSent(true) }}>
          <label>Name<input required placeholder="Your name"/></label>
          <label>Business email<input required type="email" placeholder="you@company.com"/></label>
          <label>Phone<input type="tel" placeholder="+1 234 567 8900"/></label>
          <label>Company / market<input placeholder="Company name and country"/></label>
          <label>What are you looking for?
            <select defaultValue="">
              <option value="" disabled>Select a product category</option>
              <option>Fresh fruits</option>
              <option>Fresh vegetables</option>
              <option>Seasonal produce enquiry</option>
              <option>Other product enquiry</option>
            </select>
          </label>
          <label>Message<textarea placeholder="Product, variety, pack, estimated quantity or any relevant detail"/></label>
          <button className={sent ? 'button primary sent' : 'button primary'} type="submit">
            {sent ? <><Icon name="check" size={16}/> Enquiry received</> : <>Send enquiry <Icon name="arrow" size={17}/></>}
          </button>
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
        <span>© 2026 Solstice Trading International LLP</span>
        <span>Fresh produce export, from India to your market.</span>
      </div>
    </footer>
  )
}

const chatFaq = [
  { q: 'What products do you export?', a: 'Fresh Indian fruits such as mangoes, pomegranates and table grapes, plus vegetables like onions and okra.', cta: ['Browse products', 'products'] },
  { q: 'How do I start an enquiry?', a: 'Share your product, destination and preferred pack — we will get back to you with seasonal availability.', cta: ['Start an enquiry', 'contact'] },
  { q: 'Is produce available year-round?', a: 'Availability is seasonal and varies by product. Each product page lists its current window.', cta: ['See seasonality', 'products'] },
  { q: 'Where do you source from?', a: 'We source across growing regions in India and work with buyers, distributors and foodservice teams worldwide.', cta: ['Meet the team', 'team'] }
]

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
