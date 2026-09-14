import { MAP_WIDTH, MAP_HEIGHT, project } from './project.js'

/**
 * Chooses a side for each label so they stop landing on top of each other.
 *
 * Every label used to carry the same translate(-50%,-160%) - directly above its
 * pin - which is fine until two pins share a longitude. China (105E) and Vietnam
 * (106E) are 1 degree apart horizontally, so their labels occupied nearly the
 * same box and overlapped into an unreadable stack.
 *
 * Greedy, not optimal: markers are placed in a fixed order and each takes the
 * first side that does not collide with one already placed. Optimal placement is
 * NP-hard and this map has a handful of pins - a solver would be theatre. The
 * order is deterministic (north first, then west) so the same locations always
 * produce the same layout and the map never reshuffles between renders.
 *
 * MEASURED, NOT ASSUMED. The first version worked in viewBox units and assumed
 * one unit was about one CSS pixel. That only holds on desktop: on a 343px phone
 * a unit is 0.43px while a label's text stays the same size, so every label
 * covered ~2.3x more of the map than the estimate thought - which is why the
 * labels were simply switched off below 780px. The caller now passes the map's
 * rendered size, label geometry is stated in CSS pixels, and the two are
 * reconciled here. The same code is correct at 343px and at 1200px.
 */

/* Label geometry in CSS px. These MUST match .worldmap-label in components.css
   (font, padding, border) and its is-top/-bottom/-left/-right offsets. */
export const LABEL_METRICS = {
  // h = font (line-height 1) + 2 x 3px padding + 2 x 1px border, as rendered.
  regular: { font: 11, padX: 9, h: 19, gapY: 9, gapX: 11, diag: 6 },
  compact: { font: 9.5, padX: 6, h: 18, gapY: 6, gapX: 7, diag: 4 }
}
// Average advance of DM Sans 600 is ~0.58em; 0.64 leaves margin for wide names.
const CHAR_EM = 0.64

const overlap = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
/* Eight candidates, in order of preference: the four sides, then the four
   corners. Four were not enough - on a 358px phone map, India HQ had every side
   blocked by the UAE label or a neighbouring pin and fell back onto the UAE
   label. A corner almost always has room. */
const ORDER = ['top', 'bottom', 'right', 'left', 'top-right', 'top-left', 'bottom-right', 'bottom-left']

/**
 * A label short enough for a phone-sized map. The legend under the map keeps
 * the full names, so nothing is lost - the map only has to identify the pin.
 *   "India - Headquarters" -> "India HQ"    (the suffix after a dash goes;
 *   "United Arab Emirates" -> "UAE"          HQ is kept as a two-letter tag)
 *   "United Kingdom"       -> "UK"
 */
const ABBREVIATIONS = {
  'united arab emirates': 'UAE',
  'united kingdom': 'UK',
  'united states': 'USA',
  'united states of america': 'USA',
  'saudi arabia': 'Saudi Arabia',
  'south africa': 'S. Africa'
}
export function shortLabel(label = '', hq = false) {
  const base = String(label).split(/\s[-–—]\s/)[0].trim()
  const short = ABBREVIATIONS[base.toLowerCase()] ?? base
  return hq ? `${short} HQ` : short
}

/**
 * @param markers  [{ label, lat, lng, hq }]
 * @param stage    { width, height } of the rendered map in CSS px
 * @param compact  narrow map: smaller pills and short names
 */
export function placeLabels(markers = [], stage = { width: MAP_WIDTH, height: MAP_HEIGHT }, compact = false) {
  const M = compact ? LABEL_METRICS.compact : LABEL_METRICS.regular
  const sx = stage.width / MAP_WIDTH, sy = stage.height / MAP_HEIGHT
  const placed = []

  const d = M.diag
  const boxFor = (x, y, w, place) => {
    switch (place) {
      case 'top':          return { x1: x - w / 2, y1: y - M.gapY - M.h, x2: x + w / 2, y2: y - M.gapY }
      case 'bottom':       return { x1: x - w / 2, y1: y + M.gapY, x2: x + w / 2, y2: y + M.gapY + M.h }
      case 'right':        return { x1: x + M.gapX, y1: y - M.h / 2, x2: x + M.gapX + w, y2: y + M.h / 2 }
      case 'left':         return { x1: x - M.gapX - w, y1: y - M.h / 2, x2: x - M.gapX, y2: y + M.h / 2 }
      case 'top-right':    return { x1: x + d, y1: y - d - M.h, x2: x + d + w, y2: y - d }
      case 'top-left':     return { x1: x - d - w, y1: y - d - M.h, x2: x - d, y2: y - d }
      case 'bottom-right': return { x1: x + d, y1: y + d, x2: x + d + w, y2: y + d + M.h }
      default:             return { x1: x - d - w, y1: y + d, x2: x - d, y2: y + d + M.h }   // bottom-left
    }
  }
  // A label past the map's edge is clipped, so leaving the map is a collision.
  const outside = (b) => b.x1 < 2 || b.x2 > stage.width - 2 || b.y1 < 2 || b.y2 > stage.height - 2

  // Every pin is also an obstacle: a label must not sit on top of another pin.
  const pins = markers.map((m) => { const p = project(m.lng, m.lat); return { x: p.x * sx, y: p.y * sy } })
  const pinBoxes = pins.map((p) => ({ x1: p.x - 5, y1: p.y - 5, x2: p.x + 5, y2: p.y + 5 }))

  return [...markers]
    .map((m, i) => ({ m, p: pins[i], i }))
    .sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x)
    .map(({ m, p, i }) => {
      const text = compact ? shortLabel(m.label, m.hq) : String(m.label ?? '')
      const w = text.length * M.font * CHAR_EM + M.padX * 2 + 2
      /* Least-bad, not first-fit. Each candidate is scored: leaving the map is
         the worst outcome, covering another label next, grazing another pin a
         minor one, and the preference order breaks ties. The old code took the
         first candidate with no collision at all and, when there was none,
         dropped to 'top' - which is exactly where it collided. Now a label that
         cannot be perfect still takes the spot where it is most readable. */
      let best = null
      ORDER.forEach((place, rank) => {
        const box = boxFor(p.x, p.y, w, place)
        const cost = (outside(box) ? 1e7 : 0)
          + placed.reduce((sum, b) => sum + overlap(box, b), 0) * 100
          + pinBoxes.reduce((sum, b, j) => sum + (j === i ? 0 : overlap(box, b)), 0) * 10
          + rank
        if (!best || cost < best.cost) best = { place, box, cost }
      })
      placed.push(best.box)
      return { ...m, text, place: best.place }
    })
}
