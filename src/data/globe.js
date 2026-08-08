// Globe plot data. Two independent sets, deliberately not merged.
//
// `globeMarkers` / `globeArcs` belong to the Home page's "A truly global
// footprint" section and are left exactly as they were. The About page needs a
// different five-office set, and mutating these in place would silently change
// Home - a page explicitly out of scope for that work. Two datasets, one Globe
// component, no fork.
export const globeMarkers = [
  { id: 'india', location: [19.0760, 72.8777], label: 'Mumbai, India - HQ' },
  { id: 'uae', location: [25.2048, 55.2708], label: 'Dubai, UAE' },
  { id: 'vietnam', location: [10.8231, 106.6297], label: 'Ho Chi Minh City, Vietnam' },
  { id: 'china', location: [31.2304, 121.4737], label: 'Shanghai, China' }
]
export const globeArcs = [
  { id: 'india-uae', from: [19.0760, 72.8777], to: [25.2048, 55.2708] },
  { id: 'india-vietnam', from: [19.0760, 72.8777], to: [10.8231, 106.6297] },
  { id: 'india-china', from: [19.0760, 72.8777], to: [31.2304, 121.4737] }
]

// --- About page: the five operational offices --------------------------------
//
// [CONFIRM] docs/about-us-content.md names a city for exactly one office -
// Dubai. The other four are pinned to each country's principal commercial city
// so the globe has a real point to plot, and the India pin follows the
// registered office recorded in docs/website-strategy.md §3.4 (Ahmedabad).
// These are plot coordinates, not published claims: the visible office list in
// the About page renders only the country names the content file actually
// states. Confirm the real office cities and correct the four marked below.
const OFFICE_COORDS = {
  india: [23.0225, 72.5714],      // [CONFIRM] Ahmedabad, per the registered office
  uae: [25.2048, 55.2708],        // Dubai - stated in the content file
  uk: [51.5072, -0.1276],         // [CONFIRM] London
  tanzania: [-6.7924, 39.2083],   // [CONFIRM] Dar es Salaam
  vietnam: [10.8231, 106.6297]    // [CONFIRM] Ho Chi Minh City
}

export const aboutOfficeMarkers = [
  { id: 'india', location: OFFICE_COORDS.india, label: 'India — Headquarters' },
  { id: 'uae', location: OFFICE_COORDS.uae, label: 'Dubai, United Arab Emirates' },
  { id: 'uk', location: OFFICE_COORDS.uk, label: 'United Kingdom' },
  { id: 'tanzania', location: OFFICE_COORDS.tanzania, label: 'Tanzania' },
  { id: 'vietnam', location: OFFICE_COORDS.vietnam, label: 'Vietnam' }
]

// Arcs radiate from the India headquarters to each other office.
export const aboutOfficeArcs = aboutOfficeMarkers
  .filter(marker => marker.id !== 'india')
  .map(marker => ({ id: `india-${marker.id}`, from: OFFICE_COORDS.india, to: marker.location }))
