import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useCountUp } from '../../../features/counters/index.js'

// Two tile types, chosen by the parent rather than branched inside one
// component: a static tile mounts no observer at all, so the year and the
// non-numeric "Industries Served" value cost nothing.
//
// No layout shift by construction: .about-stat-grid sizes its columns from the
// grid template and each tile has a reserved min-height, so a value counting
// from "0" to "350" changes glyphs inside a box whose dimensions were already
// settled at first paint. The numerals are tabular so the width does not even
// twitch between frames.

function CounterTile({ stat, delay }) {
  const [ref, value] = useCountUp(stat.value)
  return (
    <Reveal as="div" delay={delay} className="about-stat" data-unresolved={stat.unresolvedScope || undefined}>
      {/* useCountUp rewrites this text on every animation frame while the
          tile is in view. A <font> wrapper around a node React is re-rendering
          that fast is the highest-risk removeChild site on the site. */}
      <b ref={ref} className="notranslate" translate="no">
        {value}{stat.suffix || ''}
      </b>
      <span className="about-stat-label">{stat.label}</span>
      {stat.unit && <span className="about-stat-unit">{stat.unit}</span>}
    </Reveal>
  )
}

function StaticTile({ stat, delay }) {
  return (
    <Reveal as="div" delay={delay} className="about-stat about-stat-static" data-unresolved={stat.unresolvedScope || undefined}>
      <b className="notranslate" translate="no">{stat.text}</b>
      <span className="about-stat-label">{stat.label}</span>
    </Reveal>
  )
}

export function JourneyStats({ data }) {
  const journeyStats = data ?? {}
  return (
    <section className="about-stats section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>THE RECORD SO FAR</Eyebrow>
          <h2>{journeyStats.heading}</h2>
        </Reveal>

        <div className={`about-stat-grid${import.meta.env.DEV ? ' about-dev-flags' : ''}`}>
          {(journeyStats.stats ?? []).map((stat, index) => {
            const delay = Math.min(index, 2) * 60
            return typeof stat.value === 'number'
              ? <CounterTile key={stat.label} stat={stat} delay={delay}/>
              : <StaticTile key={stat.label} stat={stat} delay={delay}/>
          })}
        </div>

        {/* "Founded 2023" and "7 Group Companies" are marked [CONFIRM SCOPE] in
            docs/about-us-content.md - it is not established whether they
            describe this LLP or a wider Solstice Group. They render, but carry
            data-unresolved so the ambiguity is visible in the DOM and outlined
            during development rather than silently reading as fact. */}
      </div>
    </section>
  )
}
