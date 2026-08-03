import { useMemo } from 'react'

// Globe's effect deps include its colour arrays. Built inline they get a new
// identity every render, so any parent re-render tore down and re-created the
// WebGL context. Memoising on `theme` alone keeps the identity stable.
export function useGlobeTheme(theme) {
  return useMemo(() => theme === 'dark'
    ? { dark: 1, baseColor: [0.07, 0.21, 0.15], markerColor: [0.86, 0.93, 0.42], arcColor: [0.86, 0.93, 0.42], glowColor: [0.04, 0.09, 0.07], mapBrightness: 6 }
    : { dark: 0, baseColor: [1, 1, 1], markerColor: [0.04, 0.48, 0.29], arcColor: [0.04, 0.48, 0.29], glowColor: [0.94, 0.95, 0.91], mapBrightness: 10 },
  [theme])
}
