import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useAutoScroller } from '../../../components/motion/useAutoScroller.js'

/**
 * The certification strip: an auto-advancing row that can also be swiped.
 *
 * No carousel library - useAutoScroller drives a plain scrollable row, the
 * same hook as the Trade Network quotes, so the codebase has one pattern for
 * both. It drifts continuously, or steps one logo every few seconds under
 * Reduce Motion, and pauses while the visitor touches or scrolls it.
 *
 * Renders nothing at all when there are no published certificates. That is not
 * a placeholder state - a certification is a legal claim in the destination
 * market, and an empty band is the correct output until real ones exist.
 */
export function Certifications({ data }) {
  const certs = data ?? {}
  // Hooks run before the early return below - their order must not change.
  const [rowRef, copies] = useAutoScroller({ speed: 34 })

  // `published` is per-certificate, so a lapsed one can be taken down without
  // losing its record. Undefined counts as published: rows added before the
  // toggle existed should not silently vanish.
  const items = (certs.items ?? []).filter(
    (c) => c && c.name && c.published !== false
  )
  if (items.length === 0) return null

  return (
    <section className="section certifications">
      <div className="container">
        <Reveal as="div" className="certifications-head">
          <h2>{certs.heading}</h2>
          {certs.intro && <p>{certs.intro}</p>}
        </Reveal>
      </div>

      {/* Identical runs of the list side by side; the hook keeps the scroll
          position inside the second run and moves it by exactly one run's
          width to loop, which is invisible. How many runs is measured, so a
          short list never shows a gap. Only the first run is announced. */}
      <div className="certifications-marquee" ref={rowRef} tabIndex={0} role="region" aria-label={certs.heading || 'Certifications'}>
        <div className="certifications-track">
          {Array.from({ length: copies }, (_, copy) => (
            <ul className="certifications-run" key={copy}
                aria-hidden={copy > 0 || undefined}>
              {items.map((c, i) => (
                <li className="certification" data-marquee-item key={`${copy}-${i}`}>
                  {c.logo?.url
                    ? <img src={c.logo.url} alt={copy > 0 ? '' : (c.logo.alt || c.name)}
                           loading="lazy" decoding="async" draggable="false"/>
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
