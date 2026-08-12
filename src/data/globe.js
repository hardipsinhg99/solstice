// FALLBACK map plot data.
//
// As of the admin-driven globe work, this file is no longer the source. Both
// maps plot from the page's own location list - Home's footprint legend and
// About's office list - so changing a country in the admin moves the pin. These
// arrays are what renders while /api/pages/<slug> is in flight, and if a payload
// arrives whose rows carry no coordinates yet.
//
// Two independent sets, deliberately not merged.
//
// `globeMarkers` / `globeArcs` belong to the Home page's "A truly global
// footprint" section and are left exactly as they were. The About page needs a
// different five-office set, and mutating these in place would silently change
// Home - a page explicitly out of scope for that work. Two datasets, one Globe
// component, no fork.

// ── Map fallbacks ────────────────────────────────────────────────────────────
// The world map takes rows in the same shape the CMS stores, so the fallbacks
// are expressed that way rather than as pre-projected markers. Ahmedabad is the
// India coordinate on BOTH pages now: Home previously carried Mumbai, which put
// the same headquarters ~530km apart between two pages - unnoticeable on a
// rotating globe, obvious on a flat labelled map.
export const HOME_MAP_FALLBACK = [
  { text: 'India - Headquarters', lat: 23.0225, lng: 72.5714, hq: true },
  { text: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { text: 'Vietnam', lat: 10.8231, lng: 106.6297 },
  { text: 'China', lat: 31.2304, lng: 121.4737 }
]

export const ABOUT_MAP_FALLBACK = [
  { country: 'India', lat: 23.0225, lng: 72.5714, hq: true },
  { country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { country: 'United Kingdom', lat: 51.5072, lng: -0.1276 },
  { country: 'Tanzania', lat: -6.7924, lng: 39.2083 },
  { country: 'Vietnam', lat: 10.8231, lng: 106.6297 }
]
