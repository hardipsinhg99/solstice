import { useMemo } from 'react'

// Globe's effect deps include its colour arrays. Built inline they get a new
// identity every render, so any parent re-render tore down and re-created the
// WebGL context. Memoising on `theme` alone keeps the identity stable.
//
// Light theme was a white sphere (baseColor [1,1,1]) with mapBrightness 10 on a
// #f8f7f1 page: the body of the globe was invisible against the background and
// the dot map was brighter than the base, so the continents washed out too. It
// now sits a few percent below the page background with the dots DARKER than
// the base, which is the way round a light-mode map has to be. The dark theme
// is unchanged - it was never the problem.
export function useGlobeTheme(theme) {
  return useMemo(() => theme === 'dark'
    ? {
        dark: 1,
        baseColor: [0.07, 0.21, 0.15],
        markerColor: [0.86, 0.93, 0.42],
        arcColor: [0.86, 0.93, 0.42],
        glowColor: [0.04, 0.09, 0.07],
        mapBrightness: 6
      }
    : {
        dark: 0,
        // Just below --bg (#f8f7f1), so the sphere has an edge without becoming
        // a grey disc on a warm page.
        baseColor: [0.90, 0.90, 0.87],
        // The site green, so a plotted office reads as one of ours.
        markerColor: [0.04, 0.42, 0.26],
        arcColor: [0.04, 0.42, 0.26],
        glowColor: [0.86, 0.87, 0.83],
        // Below 1 darkens the dot map relative to the base. At 10 the dots were
        // brighter than a near-white sphere, which is why the continents
        // disappeared entirely.
        mapBrightness: 0.62
      },
  [theme])
}
