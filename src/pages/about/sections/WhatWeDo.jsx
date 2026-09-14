import { useId, useLayoutEffect, useRef, useState } from 'react'
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
 * Grid: 2 columns on phones, 3 from 768px, 4 from 992px, 5 from 1200px - see
 * pages.css. Adding a card in the admin simply adds a cell.
 */

// The label that has always shown here, used only until the CMS row carries
// its own `eyebrow` (rows saved before the field existed have none). An editor
// who clears the field on purpose gets no label - '' is a value, not a gap.
const LEGACY_EYEBROW = 'CAPABILITY'

/**
 * One card. On narrow cards a long description is clamped to three lines by
 * CSS; the More/Less control appears only when the clamp actually hides text,
 * measured rather than guessed - a short description never gets a button that
 * reveals nothing. The name is never clamped.
 */
function IndustryCard({ area, index }) {
  const descRef = useRef(null)
  const descId = useId()
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    const check = () => {
      // Measured in the clamped state; once expanded the answer is kept.
      if (!el.classList.contains('is-open')) setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [area.description])

  return (
    <article className="about-industry-card">
      <div className="about-industry-top">
        <span className="about-industry-icon" aria-hidden="true"><Icon name={area.icon} size={22}/></span>
        <span className="about-industry-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>{area.name}</h3>
      {area.description && (
        <>
          <p ref={descRef} id={descId} className={expanded ? 'about-industry-desc is-open' : 'about-industry-desc'}>
            {area.description}
          </p>
          {(overflows || expanded) && (
            <button type="button" className="about-industry-more" aria-expanded={expanded} aria-controls={descId}
                    onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Less' : 'More'}
              <span className="visually-hidden"> about {area.name}</span>
              <Icon name="chevron" size={14}/>
            </button>
          )}
        </>
      )}
    </article>
  )
}

export function WhatWeDo({ data }) {
  const whatWeDo = data ?? {}
  // Undefined counts as shown: cards saved before the toggle existed must not
  // vanish from a live page.
  const areas = (whatWeDo.industries ?? []).filter((a) => a?.name && a.published !== false)
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
            <Reveal as="li" key={`${area.name}-${index}`} delay={Math.min(index % 5, 4) * 50} className="about-industry-item">
              <IndustryCard area={area} index={index}/>
            </Reveal>
          ))}
        </ul>

        {whatWeDo.footnote && <Reveal as="p" delay={60} className="about-industry-footnote">{whatWeDo.footnote}</Reveal>}
      </div>
    </section>
  )
}
