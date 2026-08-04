// Scroll-driven frame sequence for the Products page.
//
// Assets live at public/explode-frames/explode/ - one level deeper than the
// brief specified (public/explode/). Contents match exactly (60 contiguous
// frames + poster, 1100x618, ~60KB each). This constant is the only place the
// path appears; move the folder and change this line, nothing else.
const BASE = '/explode-frames/explode'

export const FRAME_COUNT = 60
export const framePath = (i) => `${BASE}/frame-${String(i + 1).padStart(3, '0')}.webp`
export const POSTER_SRC = `${BASE}/poster.webp`

// 781px complements the 780px mobile breakpoint in styles/responsive.css exactly,
// and matches the hero video's gate.
export const MIN_VIEWPORT_PX = 781

export const MAX_DPR = 2          // backing store cap
export const DESCENT_VH = 25      // how far the canvas sinks over the scroll
export const FADE_START = 0.7     // progress at which the recede begins
export const FADE_TO = 0.35       // opacity at p = 1
