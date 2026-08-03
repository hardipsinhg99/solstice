import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { useNavigate } from '../../app/navigation.js'

export default function ServicesPage() {
  const navigate = useNavigate()
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
            <button onClick={() => navigate('contact')} aria-label={`Enquire about ${title}`}><Icon name="arrow"/></button>
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
          <Button onClick={() => navigate('contact')} variant="lime">Discuss your requirement</Button>
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
        <Button onClick={() => navigate('contact')} variant="lime">Send an enquiry</Button>
      </Reveal>
    </section>
  </>
}