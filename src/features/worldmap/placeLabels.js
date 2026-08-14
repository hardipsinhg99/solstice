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
 * NP-hard and this map has four pins - a solver would be theatre. The order is
 * deterministic (north first, then west) so the same locations always produce
 * the same layout and the map never reshuffles between renders.
 *
 * Geometry is in viewBox units. The SVG viewBox is 800x400 and the stage is
 * aspect-ratio 2/1, so at a typical desktop width one unit is close to one CSS
 * pixel and these estimates hold. They only need to be good enough to CHOOSE a
 * side; the browser does the real typesetting.
 */
/* Deliberately over-estimated. A pill's width is set by its TEXT, so it does not
   shrink with the map - at the narrowest width that still shows labels (~570px,
   the two-column desktop minimum) a pill covers ~1.4x the fraction it would at
   the 800-unit nominal. Measuring the real boxes would mean a ResizeObserver and
   a second render pass for four labels; inflating the estimate by that same 1.4
   buys the same safety for nothing. Being too cautious only costs a label a side
   it could have had - being too optimistic is the overlap this exists to stop. */
const CHAR_W = 8.4     // ~11px DM Sans (6.0 measured) x 1.4 safety
const PAD_X = 28       // pill padding + border, both sides, same margin
const LABEL_H = 20
const GAP = 13         // pin-to-label clearance

const boxFor = (x, y, w, place) => {
  const h = LABEL_H
  if (place === 'top')    return { x1: x - w / 2, y1: y - GAP - h, x2: x + w / 2, y2: y - GAP }
  if (place === 'bottom') return { x1: x - w / 2, y1: y + GAP, x2: x + w / 2, y2: y + GAP + h }
  if (place === 'right')  return { x1: x + GAP, y1: y - h / 2, x2: x + GAP + w, y2: y + h / 2 }
  return { x1: x - GAP - w, y1: y - h / 2, x2: x - GAP, y2: y + h / 2 }
}

const hits = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
// A label pushed past the viewBox edge gets clipped by the section, so running
// off the map counts as a collision too.
const outside = (b) => b.x1 < 0 || b.x2 > MAP_WIDTH || b.y1 < 0 || b.y2 > MAP_HEIGHT

const ORDER = ['top', 'bottom', 'right', 'left']

export function placeLabels(markers = []) {
  const placed = []
  return [...markers]
    .map((m) => ({ m, p: project(m.lng, m.lat) }))
    .sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x)
    .map(({ m, p }) => {
      const w = String(m.label ?? '').length * CHAR_W + PAD_X
      let chosen = null
      for (const place of ORDER) {
        const box = boxFor(p.x, p.y, w, place)
        if (outside(box) || placed.some((b) => hits(box, b))) continue
        chosen = place
        placed.push(box)
        break
      }
      // Every side collided. Keep the label rather than drop it - the pill has
      // its own opaque surface, so the worst case is overlap, not illegibility,
      // and the legend beside the map still lists every location.
      if (!chosen) { chosen = 'top'; placed.push(boxFor(p.x, p.y, w, 'top')) }
      return { ...m, place: chosen }
    })
}
