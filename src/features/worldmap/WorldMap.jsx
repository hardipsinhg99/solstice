import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { MAP_WIDTH, MAP_HEIGHT, project, projectPercent, arcPath } from './project.js'

/**
 * The dotted world map. Replaced the cobe WebGL globe on Home and About.
 *
 * Decorative by contract: aria-hidden, no tab stop. Both pages render the same
 * locations as a real list beside it, and that list is the accessible source of
 * truth - which is why seven SVG dots are not made focusable.
 *
 * THE RENDER PATH DOES NOT DEPEND ON JAVASCRIPT. CSS paints the finished state
 * - arcs drawn and glowing, pins solid, labels present. GSAP only ever takes a
 * finished thing, hides it and brings it back, undoing itself with clearProps.
 * With JS disabled, or GSAP failing to load, or the effect torn down mid-tween,
 * the map is still complete.
 */

// Unique per instance: Home and About both mount a map, and two <defs> sharing
// gradient and filter ids would have the second silently adopt the first's.
let uid = 0

export function WorldMap({ markers = [], arcs = [], className = '' }) {
  const root = useRef(null)
  const [ids] = useState(() => { uid += 1; return { grad: `wm-grad-${uid}`, glow: `wm-glow-${uid}` } })

  // SVG <animate> cannot be reached by a media query - there is no CSS inside
  // SMIL to collapse - so the preference is read here and the pulse elements are
  // omitted. ONLY the pulse: the pin underneath is always rendered.
  const [still, setStill] = useState(false)
  const [debug, setDebug] = useState(null)

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
    let ran = false

    // gsap.matchMedia + revert(), the pattern JourneyScroll established. No
    // gsap.context() - there is none anywhere in this codebase. No ScrollTrigger
    // either, so nothing here can collide with the journey timeline.
    const mm = gsap.matchMedia(scope)

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ran = true
      const q = gsap.utils.selector(scope)

      q('.worldmap-arc').forEach((path, i) => {
        const len = path.getTotalLength()
        // A path measured before layout reports 0. Animating from 0 would blank
        // it, so it is left in its finished state instead.
        if (!len) return
        gsap.fromTo(path,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', delay: i * 0.18,
            clearProps: 'strokeDasharray,strokeDashoffset' })
      })

      // The travelling pulse. offset-path is native CSS, so GSAP drives one
      // number and the browser does the geometry - no per-frame JS, no library.
      q('.worldmap-spark').forEach((spark, i) => {
        gsap.fromTo(spark,
          { '--wm-travel': 0 },
          { '--wm-travel': 1, duration: 3.2, delay: 1.2 + i * 0.5, repeat: -1,
            repeatDelay: 1.4, ease: 'none',
            onUpdate() {
              // Ramp in and out so the spark appears and fades rather than
              // snapping on at the coast and off at the destination.
              const el = this.targets()[0]
              const t = Number(el.style.getPropertyValue('--wm-travel')) || 0
              el.style.opacity = String(Math.sin(Math.PI * t))
            } })
      })
    })

    // Instrumentation rather than another hypothesis. ?mapdebug=1 only, so it
    // cannot ship by accident.
    if (new URLSearchParams(window.location.search).get('mapdebug') === '1') {
      requestAnimationFrame(() => {
        const svg = scope.querySelector('.worldmap-overlay')
        const dots = scope.querySelector('.worldmap-dots')
        const pin = scope.querySelector('.worldmap-pin')
        const arc = scope.querySelector('.worldmap-arc')
        const box = (el) => {
          if (!el) return 'MISSING'
          const r = el.getBoundingClientRect()
          return `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`
        }
        const paint = (el, props) => {
          if (!el) return 'MISSING'
          const cs = getComputedStyle(el)
          return props.map((p) => `${p}=${cs.getPropertyValue(p)}`).join('  ')
        }
        const first = markers[0]
        const p = first ? project(first.lng, first.lat) : null
        setDebug({
          counts: `markers=${markers.length} arcs=${arcs.length}`,
          first: first
            ? `${first.label} lat=${first.lat} lng=${first.lng} -> x=${p.x.toFixed(1)} y=${p.y.toFixed(1)}`
            : '*** NO MARKERS RECEIVED ***',
          svgBox: box(svg),
          dotsBox: box(dots),
          children: svg
            ? `${svg.querySelectorAll('path').length} path, ${svg.querySelectorAll('circle').length} circle`
            : 'MISSING',
          pinPaint: paint(pin, ['fill', 'opacity', 'visibility', 'display']),
          arcPaint: paint(arc, ['stroke', 'stroke-dashoffset', 'opacity']),
          stacking: `dots z=${dots ? getComputedStyle(dots).zIndex : '?'}  svg z=${svg ? getComputedStyle(svg).zIndex : '?'}`,
          reduced: String(window.matchMedia('(prefers-reduced-motion: reduce)').matches),
          gsapRan: String(ran)
        })
      })
    }

    return () => mm.revert()
  }, [markers, arcs])

  const pts = markers
    .map((m) => ({ ...m, lat: Number(m.lat), lng: Number(m.lng) }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))

  return (
    <div className={`worldmap ${className}`.trim()} ref={root} aria-hidden="true">
      <div className="worldmap-dots"/>

      {/* preserveAspectRatio is "none", not "xMidYMid meet". The land is a CSS
          mask sized `100% 100%`, which STRETCHES; "meet" would FIT, letterboxing
          the overlay inside a box the mask had already filled. Two different
          sizing mechanisms agree only while the container is exactly 2:1, so
          "none" makes them agree by construction at any container shape. */}
      <svg
        className="worldmap-overlay"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          {/* Transparent at both ends, solid between. This is what makes an arc
              read as a route being travelled rather than a line that was drawn:
              the ends dissolve into the map instead of stopping dead. */}
          <linearGradient id={ids.grad} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--map-accent)" stopOpacity="0"/>
            <stop offset="18%" stopColor="var(--map-accent)" stopOpacity="0.95"/>
            <stop offset="82%" stopColor="var(--map-accent)" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="var(--map-accent)" stopOpacity="0"/>
          </linearGradient>

          {/* The halo. Blur the source, then composite the original back over it
              so the line keeps a crisp core inside a glow rather than simply
              going soft. The gradient and this filter are what read as
              dimensional - not the hue, which is why the colour is one token
              away from being anything the client prefers. */}
          <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${ids.glow})`}>
          {arcs.map((a) => (
            <path key={a.id} className="worldmap-arc" d={arcPath(a.from, a.to)}
                  fill="none" stroke={`url(#${ids.grad})`}/>
          ))}

          {pts.map((m) => {
            const { x, y } = project(m.lng, m.lat)
            return (
              <g key={m.id ?? m.label}>
                {!still && (
                  <circle className="worldmap-pulse" cx={x} cy={y} r="3">
                    <animate attributeName="r" from="3" to="10" dur="2.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.5" to="0" dur="2.6s" repeatCount="indefinite"/>
                  </circle>
                )}
                <circle className={m.hq ? 'worldmap-pin is-hq' : 'worldmap-pin'} cx={x} cy={y} r="3"/>
              </g>
            )
          })}
        </g>

        {/* Travelling sparks, outside the glow group so they keep a hard bright
            core against the halo. Omitted entirely under reduced motion - the
            arcs and pins they ride are not. */}
        {!still && arcs.map((a) => (
          <circle key={`s-${a.id}`} className="worldmap-spark" r="2.2"
                  style={{ offsetPath: `path("${arcPath(a.from, a.to)}")` }}/>
        ))}
      </svg>

      <div className="worldmap-labels">
        {pts.map((m) => {
          const { left, top } = projectPercent(m.lng, m.lat)
          return (
            <span key={`l-${m.id ?? m.label}`} className="worldmap-label"
                  style={{ left: `${left}%`, top: `${top}%` }}>
              {m.label}
            </span>
          )
        })}
      </div>

      {debug && (
        <pre className="worldmap-debug">
          {Object.entries(debug).map(([k, v]) => `${k.padEnd(9)} ${v}`).join('\n')}
        </pre>
      )}
    </div>
  )
}
