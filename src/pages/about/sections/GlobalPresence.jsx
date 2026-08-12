import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useMemo } from 'react'
import { WorldMap, mapFromLocations } from '../../../features/worldmap/index.js'
import { ABOUT_MAP_FALLBACK } from '../../../data/globe.js'

// Wraps the dotted world map with the About page's office data. It does not
// fork the component - the same features/worldmap module the Home page uses,
// a different dataset.
//
// The office list is real DOM, not map labels. The map is aria-hidden and
// decorative: every office it plots is readable, and screen-reader accessible,
// in the list beside it. That list is the accessible source of truth, which is
// why the map itself takes no tab stop.
export function GlobalPresence({ data }) {
  const globalPresence = data ?? {}

  // The globe plots the SAME list the offices are rendered from, so editing a
  // country in the admin moves the pin. data/globe.js is the fallback for a
  // payload whose rows carry no coordinates yet - it is no longer the source.
  // Memoised because Globe's effect depends on these arrays by identity.
  const offices = globalPresence.offices
  const plot = useMemo(
    () => mapFromLocations(
      globalPresence.offices,
      (row) => row.country ?? row.text ?? '',
      ABOUT_MAP_FALLBACK
    ),
    [globalPresence.offices]
  )

  return (
    <section className="about-presence section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>WHERE WE OPERATE</Eyebrow>
          <h2>{globalPresence.heading}</h2>
          <p className="about-lede">{globalPresence.intro}</p>
        </Reveal>

        <div className="about-presence-layout">
          <Reveal as="div" delay={60} className="about-globe-stage">
            {/* aria-hidden: the canvas carries no text alternative that the
                adjacent list does not already provide in full. */}
            <div aria-hidden="true">
              <WorldMap markers={plot.markers} arcs={plot.arcs}/>
            </div>
          </Reveal>

          <Reveal as="div" delay={120} className="about-presence-list">
            <h3 className="about-presence-list-title">Operational offices</h3>
            <ul>
              {(globalPresence.offices ?? []).map(office => (
                <li key={office.id}>
                  <i aria-hidden="true"/>
                  <span className="about-office-country notranslate" translate="no">{office.country}</span>
                  {office.city && <span className="about-office-city notranslate" translate="no">{office.city}</span>}
                  {office.note && <span className="about-office-note">{office.note}</span>}
                </li>
              ))}
            </ul>
            <p className="about-presence-markets">
              Export network serving <strong>{globalPresence.exportMarkets}</strong>.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
