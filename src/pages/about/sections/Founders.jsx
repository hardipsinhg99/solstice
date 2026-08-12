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
            {person.role && <span>{person.role}</span>}
            {/* Sanitized server-side on write against the allowlist in
                common/sanitize.ts - not trusted at render. Same treatment the
                team members' bios get. */}
            {person.bio && <div className="about-rich about-founder-bio"
                                dangerouslySetInnerHTML={{ __html: person.bio }}/>}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export function Founders({ data }) {
  const founders = data ?? {}

  // A founder with no name is not renderable - the monogram is built from the
  // name and the heading IS the name, so a nameless card is an empty box with a
  // blank plate. The admin validates against saving one; this is the second
  // line of defence, because a row can also arrive from an older payload.
  const people = (founders.people ?? []).filter((p) => p && p.name && p.name.trim())

  // Optional, not deleted. `principle` is still a field on the section, so the
  // client can reword or restore the pull-quote from the admin without a code
  // change - which is the entire point of it being CMS-managed. Blank simply
  // does not render.
  const principle = (founders.principle ?? '').trim()

  return (
    <section className="about-founders section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>THE FOUNDERS</Eyebrow>
          <h2>{founders.heading}</h2>
          <p className="about-lede">{founders.intro}</p>
        </Reveal>

        {/* Every founder, not people[0] and people[1]. The previous version
            addressed the list positionally so it could sit the principle
            between two cards - which silently discarded a third founder the
            moment the admin added one, saving the record but never rendering
            it. The grid is intrinsic (auto-fit/minmax), so the row now reflows
            for any count instead of depending on a three-column rule. */}
        <div className="about-founder-grid" data-count={people.length}>
          {people.map((person, i) => (
            <FounderCard key={person.id ?? person.name ?? i} person={person} delay={i * 60}/>
          ))}
        </div>

        {/* Below the row rather than inside it. As a grid child it was a
            layout-bearing element, so blanking it would have left a hole. */}
        {principle && (
          <Reveal as="div" delay={60} className="about-principle">
            <blockquote>{principle}</blockquote>
          </Reveal>
        )}

        {founders.mission &&
          <Reveal as="p" delay={60} className="about-founder-mission">{founders.mission}</Reveal>}
      </div>
    </section>
  )
}
