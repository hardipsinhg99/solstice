import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'

// The intro line has not been written. Three independent safeguards stop it
// shipping unnoticed, because a dev-only outline alone disappears in a
// production build:
//   1. The rendered text is the literal marker from the content file -
//      "[REWRITE - ...]" - so it is unmistakable in any environment.
//   2. data-unresolved="copy" is in the DOM everywhere, and is greppable.
//   3. A dashed outline and a corner tag, in development only.
// Writing the copy is explicitly out of scope; this section presents the gap
// rather than papering over it.
export function IndustryRecognition({ data }) {
  const industryRecognition = data ?? {}
  const devFlag = import.meta.env.DEV ? ' about-unresolved' : ''

  return (
    <section className="about-recognition section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>RECOGNITION</Eyebrow>
          <h2>{industryRecognition.heading}</h2>
        </Reveal>

        <Reveal as="p" delay={60} className={`about-recognition-intro${devFlag}`} data-unresolved="copy">
          {industryRecognition.intro}
        </Reveal>

        <ul className="about-recognition-list">
          {(industryRecognition.points ?? []).map((point, index) => (
            <Reveal
              as="li"
              key={point.text}
              delay={Math.min(index, 2) * 60}
              className={point.unresolvedScope ? `about-recognition-point${devFlag}` : 'about-recognition-point'}
              data-unresolved={point.unresolvedScope ? 'scope' : undefined}
            >
              <span className="about-recognition-mark" aria-hidden="true"><Icon name="award" size={15}/></span>
              {point.text}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
