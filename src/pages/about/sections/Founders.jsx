import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useTilt3d } from '../../../features/tilt/index.js'
import { FounderPhoto } from './FounderPhoto.jsx'

// One card per founder, with the shared pointer tilt. The card is a plain
// <article>, not a button or a link: it goes nowhere, so it takes no tab stop
// and cannot become a keyboard dead end. The tilt is decoration on static
// content, which is why it is safe for it to be pointer-only.
function FounderCard({ person, delay }) {
  const ref = useTilt3d()
  return (
    <Reveal as="article" delay={delay} className="about-founder-card">
      <div className="about-tilt" ref={ref}>
        <div className="about-tilt-inner">
          <FounderPhoto name={person.name} photo={person.photo}/>
          <div className="about-founder-meta">
            <h3>{person.name}</h3>
            <span>{person.role}</span>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export function Founders({ data }) {
  const founders = data ?? {}
  const people = founders.people ?? []
  return (
    <section className="about-founders section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>THE FOUNDERS</Eyebrow>
          <h2>{founders.heading}</h2>
          <p className="about-lede">{founders.intro}</p>
        </Reveal>

        {/* Positional by design - the principle sits BETWEEN the two cards as
            the pivot of the section. Guarded because the admin can now remove a
            founder, and people[1] on a one-person list would otherwise crash
            the page rather than render one card. */}
        <div className="about-founder-grid">
          {people[0] && <FounderCard person={people[0]} delay={0}/>}

          {/* The principle sits between the two cards, as the pivot of the
              section rather than a caption under it. */}
          <Reveal as="div" delay={60} className="about-principle">
            <blockquote>{founders.principle}</blockquote>
          </Reveal>

          {people[1] && <FounderCard person={people[1]} delay={120}/>}
        </div>

        <Reveal as="p" delay={60} className="about-founder-mission">{founders.mission}</Reveal>
      </div>
    </section>
  )
}
