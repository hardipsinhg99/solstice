import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { cardProps } from '../../components/ui/Card.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { Globe } from '../../features/globe/index.js'
import { products } from '../../data/products.js'
import { globeMarkers, globeArcs } from '../../data/globe.js'
import { useNavigate } from '../../app/navigation.js'
import { HeroMedia } from './sections/HeroMedia.jsx'

export default function HomePage({ selectProduct, theme }) {
  const navigate = useNavigate()
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
            <Button onClick={() => navigate('products')}>Explore our produce</Button>
            <button className="quiet-link" onClick={() => navigate('contact')}>Request product details <Icon name="arrow" size={16}/></button>
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
          <Button variant="outline" onClick={() => navigate('contact')}>Send your requirement</Button>
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
          <button className="quiet-link" onClick={() => navigate('products')}>Browse product range <Icon name="arrow" size={16}/></button>
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
          <button className="quiet-link" onClick={() => navigate('services')}>Explore our services <Icon name="arrow" size={16}/></button>
        </Reveal>
      </div>
    </section>

    <section className="home-cta">
      <Reveal as="div" className="container">
        <Eyebrow>FOR BUYERS OF FRESH PRODUCE</Eyebrow>
        <h2>Looking for your next<br/><em>produce partner?</em></h2>
        <Button onClick={() => navigate('contact')} variant="lime">Start an enquiry</Button>
      </Reveal>
    </section>
  </>
}