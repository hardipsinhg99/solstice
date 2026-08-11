import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useTilt3d } from '../../../features/tilt/index.js'

// Same .about-tilt wrapper and the same hook as the founder and industry cards,
// so the page closes in the visual language it opened with rather than
// introducing a ninth treatment.
function Panel({ panel, delay }) {
  const ref = useTilt3d({ max: 5 })
  return (
    <Reveal as="article" delay={delay} className="about-mv-panel">
      <div className="about-tilt" ref={ref}>
        <div className="about-tilt-inner">
          <h2>{panel.heading}</h2>
          <div className="about-rich" dangerouslySetInnerHTML={{ __html: panel.body ?? '' }}/>
        </div>
      </div>
    </Reveal>
  )
}

export function MissionVision({ data }) {
  const missionVision = data?.items ?? []
  return (
    <section className="about-mv section">
      <div className="container about-mv-grid">
        {missionVision.map((panel, index) => (
          <Panel key={panel.id} panel={panel} delay={index * 60}/>
        ))}
      </div>
    </section>
  )
}
