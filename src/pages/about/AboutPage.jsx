import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'

export default function AboutPage() {
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