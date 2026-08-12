/**
 * CMS location rows -> map markers and arcs.
 *
 * Both pages already store their own list with lat/lng/hq (home.footprint.legend
 * and about.globalPresence.offices), so this is a shape transform, not a data
 * source. Rows without coordinates are listed on the page but not plotted -
 * dropping a pin at 0,0 would put an office in the Gulf of Guinea.
 */
const num = (v) => (v === '' || v == null ? NaN : Number(v))

export function toMarkers(rows = [], labelOf = (r) => r.text ?? r.country ?? '') {
  return rows
    .map((r, i) => ({
      id: r.id ?? `${labelOf(r) || 'loc'}-${i}`,
      label: labelOf(r),
      lat: num(r.lat),
      lng: num(r.lng),
      hq: Boolean(r.hq)
    }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
}

/**
 * Arcs radiate from the headquarters to every other pin. If no row is flagged
 * hq the first plottable one is used, so a list that has not been flagged still
 * draws a sensible network rather than none at all.
 */
export function toArcs(markers = []) {
  if (markers.length < 2) return []
  const hub = markers.find((m) => m.hq) ?? markers[0]
  return markers
    .filter((m) => m !== hub)
    .map((m) => ({
      id: `${hub.id}-${m.id}`,
      from: { lat: hub.lat, lng: hub.lng },
      to: { lat: m.lat, lng: m.lng }
    }))
}

export function mapFromLocations(rows, labelOf, fallback = []) {
  const markers = toMarkers(rows?.length ? rows : fallback, labelOf)
  return { markers, arcs: toArcs(markers) }
}
