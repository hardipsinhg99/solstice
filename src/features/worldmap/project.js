/**
 * Equirectangular projection, shared by the map and its markers.
 *
 * These four constants MUST match scripts/generate-world-dots.py. That script
 * plots every land dot with exactly this formula, so a marker computed here
 * lands on the same pixel the coastline was drawn at - alignment is a property
 * of the construction, not something tuned by eye afterwards.
 *
 * This is the failure the reference component has: its map comes from
 * `dotted-map` and its markers from a hand-written formula, two projections
 * that only coincidentally agree, which is why pins end up in the sea. There is
 * one projection here and both consumers read it.
 *
 * If you change WIDTH or HEIGHT, change them in the generator and re-run it.
 */
export const MAP_WIDTH = 800
export const MAP_HEIGHT = 400

/** [lng, lat] degrees -> { x, y } in viewBox units. */
export function project(lng, lat) {
  return {
    x: (Number(lng) + 180) * (MAP_WIDTH / 360),
    y: (90 - Number(lat)) * (MAP_HEIGHT / 180)
  }
}

/** The same point as percentages, for HTML labels positioned over the SVG. */
export function projectPercent(lng, lat) {
  const { x, y } = project(lng, lat)
  return { left: (x / MAP_WIDTH) * 100, top: (y / MAP_HEIGHT) * 100 }
}

/**
 * A great-circle-ish arc between two points, as a quadratic bezier.
 *
 * Not a true great circle: on an equirectangular map a real geodesic is a
 * complicated curve, and the point of the arc here is to read as a connection,
 * not to be navigable. The control point is lifted perpendicular to the chord
 * by a fraction of its length, so short hops bow gently and long ones bow more.
 */
export function arcPath(from, to) {
  const a = project(from.lng, from.lat)
  const b = project(to.lng, to.lat)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  // Lift toward the top of the map, which is how flight paths are conventionally
  // drawn and keeps arcs clear of the labels sitting below their markers.
  const lift = Math.min(dist * 0.22, 90)
  return `M ${a.x} ${a.y} Q ${mx} ${my - lift} ${b.x} ${b.y}`
}
