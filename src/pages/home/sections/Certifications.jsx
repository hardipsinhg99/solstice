import { Reveal } from '../../../components/motion/Reveal.jsx'

/**
 * The certification marquee.
 *
 * No carousel library. The reference implementation reaches for embla plus an
 * auto-scroll plugin, a slot primitive and a variance helper - four packages to
 * translate a row of images at a constant rate, which two CSS rules already do.
 * The same seamless-loop technique is already in use by the Trade Network
 * quotes, so this is one pattern in the codebase rather than two.
 *
 * Renders nothing at all when there are no published certificates. That is not
 * a placeholder state - a certification is a legal claim in the destination
 * market, and an empty band is the correct output until real ones exist.
 */
export function Certifications({ data }) {
  const certs = data ?? {}

  // `published` is per-certificate, so a lapsed one can be taken down without
  // losing its record. Undefined counts as published: rows added before the
  // toggle existed should not silently vanish.
  const items = (certs.items ?? []).filter(
    (c) => c && c.name && c.published !== false
  )
  if (items.length === 0) return null

  // A short list would leave a visible gap before the loop restarts, because
  // the track must be at least twice the viewport for -50% to land seamlessly.
  // Repeating the set until it is long enough fixes that without asking the
  // editor to paste duplicates in the admin.
  const MIN_PER_RUN = 8
  const run = []
  while (run.length < MIN_PER_RUN) run.push(...items)

  return (
    <section className="section certifications">
      <div className="container">
        <Reveal as="div" className="certifications-head">
          <h2>{certs.heading}</h2>
          {certs.intro && <p>{certs.intro}</p>}
        </Reveal>
      </div>

      {/* Two identical runs inside one track, translated by exactly -50%: at
          the end of the cycle the second run sits precisely where the first
          began, so the restart is invisible. A percentage rather than a pixel
          value, so it cannot drift as logos are added or removed.
          The second run is aria-hidden - it is a visual duplicate, and the list
          should be announced once. */}
      <div className="certifications-marquee">
        <div className="certifications-track">
          {[0, 1].map((copy) => (
            <ul className="certifications-run" key={copy}
                aria-hidden={copy === 1 || undefined}>
              {run.map((c, i) => (
                <li className="certification" key={`${copy}-${i}`}>
                  {c.logo?.url
                    ? <img src={c.logo.url} alt={c.logo.alt || c.name}
                           loading="lazy" decoding="async"/>
                    /* No logo yet: the name carries the row rather than a
                       broken-image icon or a stock badge standing in for a
                       credential. */
                    : <span className="certification-name">{c.name}</span>}
                  {c.description && <span className="certification-note">{c.description}</span>}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
