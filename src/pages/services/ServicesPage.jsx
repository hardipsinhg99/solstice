import { Button } from '../../components/ui/Button.jsx'
import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { useNavigate } from '../../app/navigation.js'
import { usePage } from '../../features/pages/index.js'
import { SERVICES_FALLBACK } from './servicesFallback.js'

// Published section content, edited at #admin/page-services. The three arrays
// that used to be declared inside this component are now repeaters in the page
// editor; nothing else about the page changed.
export default function ServicesPage() {
  const navigate = useNavigate()
  const { section } = usePage('services', SERVICES_FALLBACK)
  const intro = section('intro')
  const services = section('services')
  const supply = section('supply')
  const process = section('process')
  const trust = section('trust')
  const callout = section('callout')

  return <>
    <PageTitle mark={intro.mark} eyebrow={intro.eyebrow} title={intro.title} accent={intro.accent} copy={intro.copy}/>
    <section className="service-list section">
      <div className="container">
        {(services.items ?? []).map((item, index) => (
          <Reveal as="article" key={item.title} delay={index * 70}>
            <span>0{index + 1}</span>
            <Icon name={item.icon} size={29}/>
            <div><h3>{item.title}</h3><p>{item.body}</p></div>
            <button onClick={() => navigate(services.ctaRoute)} aria-label={`Enquire about ${item.title}`}><Icon name="arrow"/></button>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="supply-cta section">
      <Reveal as="div" className="container supply-cta-grid">
        <div>
          <Eyebrow>{supply.eyebrow}</Eyebrow>
          <h2>{supply.headingLine1}<br/><em>{supply.headingAccent}</em></h2>
          <p>{supply.body}</p>
          <Button onClick={() => navigate(supply.ctaRoute)} variant="lime">{supply.ctaLabel}</Button>
        </div>
        <ul className="supply-cta-list">
          {(supply.points ?? []).map((point) => (
            <li key={point.text}><Icon name="check" size={16}/> {point.text}</li>
          ))}
        </ul>
      </Reveal>
    </section>

    <section className="process section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>{process.eyebrow}</Eyebrow><h2>{process.headingLine1}<br/><em>{process.headingAccent}</em></h2></div>
        </Reveal>
        <div className="process-list">
          {(process.items ?? []).map((step, index) => (
            <Reveal as="div" key={step.title} delay={index * 70} className="process-step">
              <div className="process-icon"><Icon name={step.icon} size={18}/></div>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="trust section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>{trust.eyebrow}</Eyebrow><h2>{trust.headingLine1}<br/>{trust.headingLine2} <em>{trust.headingAccent}</em></h2></div>
        </Reveal>
        <div className="trust-grid">
          {(trust.items ?? []).map((card, index) => (
            <Reveal as="article" key={card.title} delay={index * 70} className="trust-card">
              <Icon name={card.icon} size={20}/><h3>{card.title}</h3><p>{card.body}</p>
            </Reveal>
          ))}
        </div>
        {/* Rendered only when there is something to list. An empty strip with a
            "CERTIFICATIONS" label and nothing after it reads as a claim the page
            failed to load, which is worse than no strip. */}
        {(trust.certifications ?? []).length > 0 && (
          <Reveal as="div" className="cert-strip">
            <span className="cert-label">{trust.certLabel}</span>
            {trust.certifications.map((cert) => (
              <span className="cert-item" key={cert.text}><Icon name="award" size={15}/> {cert.text}</span>
            ))}
          </Reveal>
        )}
      </div>
    </section>

    <section className="service-callout">
      <Reveal as="div" className="container">
        <Eyebrow>{callout.eyebrow}</Eyebrow>
        <h2>{callout.headingLine1}<br/>{callout.headingLine2} <em>{callout.headingAccent}</em></h2>
        <Button onClick={() => navigate(callout.ctaRoute)} variant="lime">{callout.ctaLabel}</Button>
      </Reveal>
    </section>
  </>
}
