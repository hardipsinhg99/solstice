import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'

/**
 * The About hero.
 *
 * Rebuilt rather than patched. The previous version was a 3D-tilted pull-quote
 * with `max-width: 15ch` on the text - a fifteen-CHARACTER measure - which is
 * exactly why the headline collapsed into a narrow vertical column on a phone.
 * Nothing of that layout survives here.
 *
 * The headline is ONE flowing sentence, not four fixed lines. The reference
 * breaks it as "Building Global / Trade Through / Trust, Quality & /
 * Execution.", but hard-coding those breaks is what makes a heading unable to
 * reflow: at 360px it would either overflow or stack a word per line. A single
 * measure lets it break where it fits at every width and land on the reference's
 * shape at desktop.
 *
 * Every string, the banner and all three value points come from the CMS. There
 * is no copy in this file.
 */
export function HeroQuote({ data }) {
  const hero = data ?? {}

  // Undefined counts as published: rows written before the toggle existed must
  // not silently vanish from a live page.
  const points = (hero.points ?? []).filter((p) => p && p.title && p.published !== false)

  return (
    <section
      className="about-hero"
      style={{ '--hero-focus': hero.imageFocus || '66% 50%' }}
    >
      {/* Two sources, so a phone never downloads the 1672px file. The artwork
          carries no headline text - only the wordmark - so the framing crops
          past it and every word below stays real HTML: readable at 360px,
          indexable, translatable, reachable by a screen reader. */}
      <picture className="about-hero-banner">
        <source media="(max-width: 780px)" srcSet="/about-hero-960.webp"/>
        <img src={hero.image?.url || '/about-hero.webp'}
             alt="" aria-hidden="true" fetchPriority="high" decoding="async"/>
      </picture>

      <div className="container about-hero-inner">
        <Reveal as="div" className="about-hero-copy">
          {hero.eyebrow && <p className="about-hero-eyebrow">{hero.eyebrow}</p>}

          {/* One heading, one sentence. The accent is a <span> continuing the
              same line rather than a separate block, so the colour change never
              forces a break of its own. */}
          <h1>
            {hero.headingLead}{' '}
            <span className="about-hero-accent">{hero.headingAccent}</span>
          </h1>

          <span className="about-hero-rule" aria-hidden="true"/>

          {hero.description && <p className="about-hero-lede">{hero.description}</p>}
        </Reveal>

        {points.length > 0 && (
          <Reveal as="ul" delay={120} className="about-hero-points" data-count={points.length}>
            {points.map((p, i) => (
              <li className="about-hero-point" key={p.title ?? i}>
                <span className="about-hero-point-icon" aria-hidden="true">
                  <Icon name={p.icon || 'check'} size={22}/>
                </span>
                <strong>{p.title}</strong>
                {p.body && <span>{p.body}</span>}
              </li>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  )
}
