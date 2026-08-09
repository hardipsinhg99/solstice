import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { Globe, useGlobeTheme } from '../../../features/globe/index.js'
import { aboutOfficeMarkers, aboutOfficeArcs } from '../../../data/globe.js'
import { globalPresence } from '../../../data/about-content.js'
import { useTheme } from '../../../app/ThemeProvider.jsx'

// Wraps the existing WebGL globe with the About page's office data. It does not
// fork the component - same features/globe module the Home page uses, different
// dataset from data/globe.js.
//
// On the second-mount question: the router renders exactly one page at a time,
// so the Home instance and this one can never be alive together and cannot
// contend for a WebGL context. useGlobeTheme is still what keeps this instance
// stable on its own - its memo gives the colour arrays a fixed identity across
// re-renders, and the marker/arc arrays are module constants, so every value in
// Globe's effect dependency list is referentially stable and the context is
// created once per mount.
//
// theme comes from useTheme() rather than a prop: App.jsx renders <AboutPage/>
// with no props, and reaching for the context here avoids editing the shell.
//
// The office list is real DOM, not canvas labels. The globe is a decorative
// supplement - every office it plots is readable, and screen-reader accessible,
// in the list beside it.
export function GlobalPresence() {
  const { theme } = useTheme()
  const globeTheme = useGlobeTheme(theme)

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
              <Globe markers={aboutOfficeMarkers} arcs={aboutOfficeArcs} {...globeTheme}/>
            </div>
          </Reveal>

          <Reveal as="div" delay={120} className="about-presence-list">
            <h3 className="about-presence-list-title">Operational offices</h3>
            <ul>
              {globalPresence.offices.map(office => (
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
