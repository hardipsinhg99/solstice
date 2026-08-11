import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useTilt3d } from '../../../features/tilt/index.js'

// Industry cards. Same tilt hook and the same .about-tilt wrapper as the
// founder cards and the mission panels, so all three sections share one 3D
// language rather than three separate effects - the lift and shadow growth are
// CSS on the shared class, the rotation is the shared hook.
function IndustryCard({ industry, delay }) {
  const ref = useTilt3d({ max: 6 })
  return (
    <Reveal as="article" delay={delay} className="about-industry-card">
      <div className="about-tilt" ref={ref}>
        <div className="about-tilt-inner">
          <span className="about-industry-icon" aria-hidden="true"><Icon name={industry.icon} size={22}/></span>
          <h3>{industry.name}</h3>
        </div>
      </div>
    </Reveal>
  )
}

export function WhatWeDo({ data }) {
  const whatWeDo = data ?? {}
  return (
    <section className="about-industries section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>CAPABILITY</Eyebrow>
          <h2>{whatWeDo.heading}</h2>
          <p className="about-lede">{whatWeDo.intro}</p>
        </Reveal>

        <div className="about-industry-grid">
          {(whatWeDo.industries ?? []).map((industry, index) => (
            <IndustryCard key={industry.name} industry={industry} delay={Math.min(index, 2) * 60}/>
          ))}
        </div>

        <Reveal as="p" delay={60} className="about-industry-footnote">{whatWeDo.footnote}</Reveal>
      </div>
    </section>
  )
}
