/**
 * A globe that needs no WebGL.
 *
 * The canvas one is the right thing when it works, but it depends on a WebGL
 * context, and a browser can refuse to give one: a blocklisted driver, GPU
 * acceleration off, too many live contexts across tabs, or a headless/software
 * path the browser has stopped allowing. In every one of those cases
 * createGlobe() leaves a correctly sized, fully opaque, completely EMPTY canvas
 * - which is exactly how it was reported: "the earth doesn't show".
 *
 * So the section no longer bets on WebGL. This renders the same markers and the
 * same arcs from the same data as plain SVG, with an orthographic projection
 * done here rather than in a shader. It is inert - no drag, no spin - and it is
 * not trying to be the canvas globe. It is trying to be an earth with the
 * offices on it, which is the whole job of the section.
 */
const RAD = Math.PI / 180

// Central longitude for a given cobe phi. phiForMarkers() produces
// phi = -lng - π/2, so this is that relation solved back the other way.
const centralLng = (phi) => -(phi + Math.PI / 2) / RAD

/** Orthographic projection onto a unit disc. `null` when the point is on the far side. */
function project(lat, lng, lng0) {
  const p = lat * RAD
  const d = (lng - lng0) * RAD
  // cos(c) > 0 is the visible hemisphere.
  if (Math.cos(p) * Math.cos(d) <= 0.02) return null
  return { x: Math.cos(p) * Math.sin(d), y: -Math.sin(p) }
}

// A coarse land mask, as latitude/longitude boxes. Deliberately crude: this is a
// silhouette that says "earth", not a map anybody should measure. Drawing it as
// dots on the same grid the canvas globe uses keeps the two visually related.
const LAND = [
  [[8, 72], [37, 90]], [[20, 60], [45, 75]], [[5, 95], [30, 122]], [[30, 100], [50, 135]],
  [[-10, 95], [8, 140]], [[35, -10], [60, 30]], [[45, 20], [65, 60]], [[35, 25], [45, 50]],
  [[-35, 12], [35, 52]], [[-35, -20], [15, 15]], [[25, -20], [37, 12]],
  [[25, -125], [50, -70]], [[50, -140], [70, -60]], [[8, -105], [25, -80]],
  [[-20, -75], [10, -35]], [[-55, -75], [-20, -50]], [[-40, 113], [-12, 153]],
  [[-47, 166], [-35, 179]], [[60, -50], [82, -20]]
]

function landDots(lng0) {
  const dots = []
  for (const [[lat1, lng1], [lat2, lng2]] of LAND) {
    for (let lat = lat1; lat <= lat2; lat += 4.5) {
      for (let lng = lng1; lng <= lng2; lng += 4.5) {
        const p = project(lat, lng, lng0)
        if (p) dots.push(p)
      }
    }
  }
  return dots
}

export function GlobeFallback({ markers = [], arcs = [], phi = 0, label }) {
  const lng0 = centralLng(phi)
  const R = 100
  const to = (p) => ({ x: 120 + p.x * R, y: 120 + p.y * R })

  const dots = landDots(lng0).map(to)
  const pins = markers
    .map((m) => {
      const p = project(m.location[0], m.location[1], lng0)
      return p ? { ...to(p), id: m.id, hq: m.hq } : null
    })
    .filter(Boolean)

  const curves = arcs
    .map((a, i) => {
      const f = project(a.from[0], a.from[1], lng0)
      const t = project(a.to[0], a.to[1], lng0)
      if (!f || !t) return null
      const A = to(f)
      const B = to(t)
      // Bow the arc away from the centre so it reads as a hop over the surface.
      const mx = (A.x + B.x) / 2
      const my = (A.y + B.y) / 2
      const dx = mx - 120
      const dy = my - 120
      const len = Math.hypot(dx, dy) || 1
      const lift = Math.hypot(B.x - A.x, B.y - A.y) * 0.22
      return { id: a.id ?? i, d: `M${A.x} ${A.y} Q${mx + (dx / len) * lift} ${my + (dy / len) * lift} ${B.x} ${B.y}` }
    })
    .filter(Boolean)

  return (
    <div className="globe-wrap globe-wrap-static">
      <svg
        className="globe-static" viewBox="0 0 240 240"
        role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}
      >
        <defs>
          <radialGradient id="globe-shade" cx="38%" cy="32%" r="78%">
            <stop offset="0%" stopColor="var(--globe-hi)"/>
            <stop offset="100%" stopColor="var(--globe-lo)"/>
          </radialGradient>
        </defs>
        <circle cx="120" cy="120" r={R} fill="url(#globe-shade)" stroke="var(--globe-edge)"/>
        {/* Graticule: three parallels and three meridians, clipped to the disc by
            the circle they are drawn inside. */}
        <g stroke="var(--globe-grid)" fill="none">
          {[-45, 0, 45].map((lat) => (
            <ellipse key={lat} cx="120" cy={120 - Math.sin(lat * RAD) * R}
                     rx={Math.cos(lat * RAD) * R} ry={Math.cos(lat * RAD) * R * 0.16}/>
          ))}
          {[-60, -20, 20, 60].map((off) => (
            <ellipse key={off} cx="120" cy="120" rx={Math.abs(Math.sin(off * RAD)) * R} ry={R}/>
          ))}
        </g>
        <g fill="var(--globe-land)">
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="1.15"/>)}
        </g>
        <g stroke="var(--globe-arc)" fill="none" strokeWidth="1.2" strokeLinecap="round">
          {curves.map((a) => <path key={a.id} d={a.d}/>)}
        </g>
        <g fill="var(--globe-arc)">
          {pins.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r={p.hq ? 3.4 : 2.6}/>)}
        </g>
      </svg>
    </div>
  )
}
