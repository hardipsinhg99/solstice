import { Button } from '../../components/ui/Button.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { useNavigate } from '../../app/navigation.js'
import { usePage, usePublicTeam } from '../../features/pages/index.js'
import { PageUnavailable } from '../../components/layout/PageUnavailable.jsx'
import { TEAM_FALLBACK } from './teamFallback.js'

/**
 * The people, from the database.
 *
 * What this replaced: three ANONYMOUS role cards - the array was
 * [role, copy, image] with no name field at all - each illustrated with a stock
 * Unsplash portrait of a stranger. website-strategy.md 2.5 calls that a
 * falsifiable trust claim on a page whose entire job is trust, and it is the
 * longest-standing flag in the original site audit.
 *
 * A member with no photograph now renders an initials monogram, the same
 * treatment the founders' cards use. It never falls back to stock.
 */
const initials = (name) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function TeamPage() {
  const navigate = useNavigate()
  const { section, missing } = usePage('team', TEAM_FALLBACK)
  const [members] = usePublicTeam()

  // Unpublished in the admin: render the shared not-available state rather than
  // the static fallback. Two lines, and any other page can adopt the same pair.
  if (missing) return <PageUnavailable/>
  const intro = section('intro')
  const cta = section('cta')

  return <>
    <PageTitle mark={intro.mark} eyebrow={intro.eyebrow} title={intro.title} accent={intro.accent} copy={intro.copy}/>
    {/* An empty member list rendered an empty grid, which reads as a large
        unexplained void between the hero and the closing CTA rather than as
        "no one is listed yet". */}
    {members.length > 0 && (
    <section className="team section">
      <div className="container team-grid">
        {members.map((member, index) => (
          <Reveal as="article" key={member.id} delay={index * 90}>
            <div className="team-image">
              {member.photo ? (
                <img
                  src={member.photo.url}
                  {...(member.photo.width && member.photo.height
                    ? { width: member.photo.width, height: member.photo.height } : {})}
                  alt={member.photo.alt || `${member.name}, ${member.role}`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="team-monogram">
                  <span aria-hidden="true">{initials(member.name)}</span>
                  <span className="team-photo-note">Photograph to follow</span>
                </div>
              )}
            </div>
            <span>0{index + 1}</span>
            <h3>{member.name}</h3>
            {member.role && member.role !== member.name && <p className="team-role">{member.role}</p>}
            {/* Sanitized server-side on write, against the allowlist in
                common/sanitize.ts - not trusted at render. */}
            {member.bio && <div className="about-rich" dangerouslySetInnerHTML={{ __html: member.bio }}/>}
          </Reveal>
        ))}
      </div>
    </section>
    )}
    <section className="team-join">
      <Reveal as="div" className="container">
        <h2>{cta.headingLine1}<br/><em>{cta.headingAccent}</em></h2>
        <p>{cta.body}</p>
        <Button onClick={() => navigate(cta.ctaRoute)} variant="lime">{cta.ctaLabel}</Button>
      </Reveal>
    </section>
  </>
}
