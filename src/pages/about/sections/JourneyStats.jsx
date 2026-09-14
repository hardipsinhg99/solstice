import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useCountUp } from '../../../features/counters/index.js'

/**
 * "Our journey in numbers". Every figure, label, icon, note, its order and
 * whether it shows come from the About page's `journeyStats` CMS section.
 *
 * Two tile types, chosen by the parent rather than branched inside one
 * component: a static tile mounts no observer at all, so the year and the
 * non-numeric "Industries Served" value cost nothing.
 *
 * No layout shift by construction: the grid sizes its columns from the
 * template and each card reserves its height, so a value counting from "0" to
 * "350" changes glyphs inside a box whose dimensions were settled at first
 * paint. The numerals are tabular so the width does not twitch between frames.
 */

// Shown only until the CMS row carries its own `eyebrow`; '' hides it.
const LEGACY_EYEBROW = 'THE RECORD SO FAR'

/* Column counts from the number of VISIBLE figures, so rows stay balanced when
   an admin adds, hides or removes one - a fixed count leaves gaps or a lone
   last card. Phones are always 2 (set in CSS). Desktop: one row up to six,
   then two even rows. Tablet: 3, or 2 for exactly four (2 + 2, not 3 + 1). */
const desktopCols = (n) => (n <= 6 ? Math.max(n, 1) : Math.ceil(n / 2))
const tabletCols = (n) => (n === 4 || n <= 2 ? 2 : 3)

function StatBody({ stat, children }) {
  return (
    <>
      <div className="about-stat-top">
        {children}
        {stat.icon && <span className="about-stat-icon" aria-hidden="true"><Icon name={stat.icon} size={16}/></span>}
      </div>
      <span className="about-stat-label">{stat.label}</span>
      {stat.unit && <span className="about-stat-unit">{stat.unit}</span>}
      {stat.note && <span className="about-stat-note">{stat.note}</span>}
    </>
  )
}

function CounterTile({ stat }) {
  const [ref, value] = useCountUp(stat.value)
  return (
    <div className="about-stat" data-unresolved={stat.unresolvedScope || undefined}>
      <StatBody stat={stat}>
        {/* useCountUp rewrites this text on every animation frame while the
            tile is in view. A <font> wrapper around a node React is re-rendering
            that fast is the highest-risk removeChild site on the site. */}
        <b ref={ref} className="notranslate" translate="no">{value}{stat.suffix || ''}</b>
      </StatBody>
    </div>
  )
}

function StaticTile({ stat }) {
  return (
    <div className="about-stat about-stat-static" data-unresolved={stat.unresolvedScope || undefined}>
      <StatBody stat={stat}>
        <b className="notranslate" translate="no">{stat.text}</b>
      </StatBody>
    </div>
  )
}

export function JourneyStats({ data }) {
  const journeyStats = data ?? {}
  // Undefined counts as shown: figures saved before the toggle existed stay up.
  const stats = (journeyStats.stats ?? []).filter((s) => s?.label && s.published !== false)
  const eyebrow = journeyStats.eyebrow ?? LEGACY_EYEBROW

  return (
    <section className="about-stats section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2>{journeyStats.heading}</h2>
        </Reveal>

        <ul className={`about-stat-grid${import.meta.env.DEV ? ' about-dev-flags' : ''}`}
            style={{ '--stat-cols-desk': desktopCols(stats.length), '--stat-cols-tab': tabletCols(stats.length) }}>
          {stats.map((stat, index) => (
            // Reveal on the cell, hover on the card: one transition list each.
            <Reveal as="li" key={`${stat.label}-${index}`} delay={Math.min(index % 6, 5) * 50} className="about-stat-item">
              {typeof stat.value === 'number' ? <CounterTile stat={stat}/> : <StaticTile stat={stat}/>}
            </Reveal>
          ))}
        </ul>

        {/* "Founded 2023" and "7 Group Companies" are marked [CONFIRM SCOPE] in
            docs/about-us-content.md - it is not established whether they
            describe this LLP or a wider Solstice Group. They render, but carry
            data-unresolved so the ambiguity is visible in the DOM and outlined
            during development rather than silently reading as fact. */}
      </div>
    </section>
  )
}
