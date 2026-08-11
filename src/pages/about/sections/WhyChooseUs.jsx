import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'

// A checklist, not a bullet list: the check glyph comes from the existing Icon
// sprite and the marker is suppressed in CSS, so the list keeps real <ul>/<li>
// semantics for assistive tech while reading as a set of confirmations.
export function WhyChooseUs({ data }) {
  const whyChooseUs = data ?? {}
  return (
    <section className="about-why section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>WHY SOLSTICE</Eyebrow>
          <h2>{whyChooseUs.heading}</h2>
        </Reveal>

        <ul className="about-check-list">
          {(whyChooseUs.points ?? []).map((point, index) => (
            <Reveal as="li" key={point.text} delay={Math.min(index, 2) * 60}>
              <span className="about-check" aria-hidden="true"><Icon name="check" size={14}/></span>
              {point.text}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
