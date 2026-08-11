/**
 * Page data → globe plot data.
 *
 * Before this, the globe read `src/data/globe.js` — a hardcoded file — while
 * the office list beside it read editable page sections. Changing a country in
 * the admin updated the words and left the earth showing the old set, which is
 * exactly the kind of quiet disagreement between two sources that the whole CMS
 * exists to remove. One list now drives both.
 *
 * A row with no coordinates is still listed on the page; it is simply not
 * plotted. That is deliberate: an editor adding an office before anyone has
 * looked up its latitude should not have the location silently vanish from the
 * text, and inventing a coordinate to avoid a gap would be inventing a fact.
 */

const num = (value) => {
  // Empty inputs arrive as '' or null; Number('') is 0, which is a real place
  // in the Gulf of Guinea. Only a genuine number counts as a coordinate.
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Valid, plottable rows only. Latitude and longitude both have real ranges. */
export function toMarkers(locations = [], labelOf = (row) => row.text ?? row.country ?? '') {
  return locations
    .map((row, index) => {
      const lat = num(row.lat)
      const lng = num(row.lng)
      if (lat === null || lng === null) return null
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
      return { id: row.id || `loc-${index}`, location: [lat, lng], label: labelOf(row), hq: Boolean(row.hq) }
    })
    .filter(Boolean)
}

/**
 * Arcs radiate from the headquarters. If nothing is flagged, the first plotted
 * marker stands in — a network diagram with no origin draws nothing at all,
 * which reads as a broken globe rather than as an unset flag.
 */
export function toArcs(markers = []) {
  if (markers.length < 2) return []
  const hq = markers.find((m) => m.hq) ?? markers[0]
  return markers
    .filter((m) => m !== hq)
    .map((m) => ({ id: `${hq.id}-${m.id}`, from: hq.location, to: m.location }))
}

/**
 * Where the camera should start.
 *
 * The globe opened on the Americas — every Solstice office was on the far side,
 * so "Our Global Presence" rendered an empty Pacific. cobe's `phi` is a
 * rotation in radians where 0 puts roughly 0° longitude at the left edge, so
 * the offices are centred by turning the globe to their mean longitude.
 *
 * The mean is taken on the unit circle rather than by averaging the numbers:
 * longitudes wrap at ±180, and a plain average of 170 and -170 gives 0, which
 * is the exact opposite side of the planet.
 */
export function phiForMarkers(markers = [], fallback = 0) {
  if (!markers.length) return fallback
  let x = 0
  let y = 0
  for (const m of markers) {
    const rad = (m.location[1] * Math.PI) / 180
    x += Math.cos(rad)
    y += Math.sin(rad)
  }
  if (x === 0 && y === 0) return fallback
  const meanLng = Math.atan2(y, x) // radians, -π..π
  // phi = -longitude - π/2 puts that longitude at the centre of the visible
  // face. Measured, not guessed: rendering a single marker at 0°, 72.57°E and
  // 75°W and reading back its pixel centroid gives cx=100 on a 200px canvas for
  // this formula and for no other candidate. -λ alone lands it at the right
  // limb (cx=185); -λ+π puts it on the left limb (cx=15).
  return -meanLng - Math.PI / 2
}

/** Marker set, arc set and opening rotation from one list. */
export function globeFromLocations(locations, labelOf, fallback = { markers: [], arcs: [] }) {
  const markers = toMarkers(locations, labelOf)
  if (!markers.length) {
    return { markers: fallback.markers, arcs: fallback.arcs, phi: phiForMarkers(fallback.markers) }
  }
  return { markers, arcs: toArcs(markers), phi: phiForMarkers(markers) }
}
