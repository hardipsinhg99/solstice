import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { MAP_WIDTH, MAP_HEIGHT, project, projectPercent, arcPath } from './project.js'

/**
 * The dotted world map that replaced the cobe globe.
 *
 * Decorative by contract. It is aria-hidden and takes no tab stop, because both
 * pages that use it already render the same locations as a real list beside it -
 * on About that list is the accessible source of truth for the offices, and on
 * Home it is the footprint legend. Making 5-7 SVG dots focusable would add tab
 * stops that announce nothing the list does not already say better. This is the
 * reference component's weakest area and the list is the fix for it.
 *
 * The land itself is a CSS mask (see styles), not markup: /world-dots.svg is
 * 5,947 dots, and inlining that would put 5,947 nodes in the DOM on two pages
 * for something that never changes. As a mask it costs no DOM, no JS and no
 * bundle - and one token drives its colour in both themes.
 */
export function WorldMap({ markers = [], arcs = [], className = '' }) {
  const root = useRef(null)
  // SVG <animate> does NOT honour prefers-reduced-motion - the media query
  // cannot reach inside it and there is no CSS to collapse. The only reliable
  // control is not to render the element, so the preference is read here and
  // the pulses are omitted entirely rather than animated invisibly.
  const [still, setStill] = useState(false)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const scope = root.current
    if (!scope) return

    // gsap.matchMedia + revert(), the same pattern JourneyScroll uses. Not
    // gsap.context(): there is no context() anywhere in this codebase and one
    // cleanup idiom is better than two. revert() kills every tween created
    // inside, so nothing is orphaned when the section unmounts.
    const mm = gsap.matchMedia(scope)

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const paths = gsap.utils.selector(scope)('.worldmap-arc')
      paths.forEach((path) => {
        const len = path.getTotalLength()
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len })
      })
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 1.4,
        ease: 'power2.inOut',
        stagger: 0.18
      })
    })

    // No ScrollTrigger is created here, so there is nothing to refresh and no
    // chance of colliding with the journey section's triggers on Home.
    return () => mm.revert()
  }, [markers, arcs])

  const pts = markers
    .map((m) => ({ ...m, lat: Number(m.lat), lng: Number(m.lng) }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))

  return (
    <div className={`worldmap ${className}`.trim()} ref={root} aria-hidden="true">
      <div className="worldmap-dots"/>
      <svg
        className="worldmap-overlay"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        {arcs.map((a) => (
          <path key={a.id} className="worldmap-arc" d={arcPath(a.from, a.to)} fill="none"/>
        ))}

        {pts.map((m) => {
          const { x, y } = project(m.lng, m.lat)
          return (
            <g key={m.id ?? m.label}>
              {/* The halo pulses; the core stays put so the position always
                  reads exactly, even mid-animation. */}
              {!still && (
                <circle className="worldmap-pulse" cx={x} cy={y} r="3">
                  <animate attributeName="r" from="3" to="9" dur="2.4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.55" to="0" dur="2.4s" repeatCount="indefinite"/>
                </circle>
              )}
              <circle className={m.hq ? 'worldmap-pin is-hq' : 'worldmap-pin'} cx={x} cy={y} r="3"/>
            </g>
          )
        })}
      </svg>

      {/* HTML, not SVG <text>: labels then inherit the type scale and the
          token colours instead of needing their own font sizing, and they stay
          legible when the map is scaled down. */}
      <div className="worldmap-labels">
        {pts.map((m) => {
          const { left, top } = projectPercent(m.lng, m.lat)
          return (
            <span
              key={`l-${m.id ?? m.label}`}
              className="worldmap-label"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {m.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
