import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'

/**
 * "What we do" - the business areas, as numbered cards.
 *
 * Everything on screen comes from the About page's `whatWeDo` section in the
 * CMS: label, heading (+ optional highlighted part), description, each card's
 * name / description / icon, their order, and whether each is shown. Numbers
 * are generated from the visible order, so hiding or reordering a card in the
 * admin renumbers the rest - no stale "04" left behind a removed "03".
 *
 * The cards are information, not links, so they are not focusable and carry no
 * pointer cursor; the hover lift is decoration and nothing depends on it.
 */

// The label that has always shown here, used only until the CMS row carries
// its own `eyebrow` (rows saved before the field existed have none). An editor
// who clears the field on purpose gets no label - '' is a value, not a gap.
const LEGACY_EYEBROW = 'CAPABILITY'

export function WhatWeDo({ data }) {
  const whatWeDo = data ?? {}
  // Undefined counts as shown: cards saved before the toggle existed must not
  // vanish from a live page.
  const areas = (whatWeDo.industries ?? []).filter((a) => a && a.name && a.published !== false)
  const eyebrow = whatWeDo.eyebrow ?? LEGACY_EYEBROW

  return (
    <section className="about-industries section">
      <div className="container">
        <Reveal as="div" className="about-industries-head">
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2>
              {whatWeDo.heading}
              {whatWeDo.headingAccent && <>{' '}<span className="about-industries-accent">{whatWeDo.headingAccent}</span></>}
            </h2>
          </div>
          {whatWeDo.intro && <p className="about-industries-intro">{whatWeDo.intro}</p>}
        </Reveal>

        {/* A list: the areas are a set a screen reader should hear counted. */}
        <ul className="about-industry-grid">
          {areas.map((area, index) => (
            // The reveal (opacity/transform over .8s) and the hover lift are on
            // different elements: one transition list per element, or the hover
            // rule would replace the reveal's and the cards would snap in.
            <Reveal as="li" key={`${area.name}-${index}`} delay={Math.min(index % 3, 2) * 70} className="about-industry-item">
              <article className="about-industry-card">
                <span className="about-industry-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="about-industry-icon" aria-hidden="true"><Icon name={area.icon} size={22}/></span>
                <h3>{area.name}</h3>
                {area.description && <p>{area.description}</p>}
              </article>
            </Reveal>
          ))}
        </ul>

        {whatWeDo.footnote && <Reveal as="p" delay={60} className="about-industry-footnote">{whatWeDo.footnote}</Reveal>}
      </div>
    </section>
  )
}
