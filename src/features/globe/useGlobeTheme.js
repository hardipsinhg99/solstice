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
        // Light mode is a pale sphere with a darker dot map. Two attempts got
        // this wrong in opposite directions and both are worth recording:
        //
        //   base 1.00 / mb 10    the dots were BRIGHTER than a white sphere, so
        //                        the continents vanished and so did the globe
        //   base 0.52 / mb 0.08  the sphere was clearly visible but the dots had
        //                        converged with it - a plain sage disc, no land
        //
        // cobe derives the dot colour from baseColor scaled by mapBrightness, so
        // the land/sea separation is bounded however far the base is pushed -
        // there is no palette that makes both the sphere and its continents
        // strongly contrasty in light mode. Legible land wins: the continents
        // are the information, the sphere is the frame. A CSS ring was tried and
        // removed - cobe draws the globe inset from its canvas, so the ring
        // traced the element box and floated well outside the sphere.
        baseColor: [0.90, 0.90, 0.88],
        markerColor: [0.05, 0.55, 0.33],
        arcColor: [0.05, 0.55, 0.33],
        glowColor: [0.85, 0.87, 0.82],
        mapBrightness: 0.45
      },
  [theme])
}
