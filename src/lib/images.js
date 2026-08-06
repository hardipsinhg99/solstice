// Unsplash delivery helpers.
//
// Every photograph on the site is an Unsplash URL carrying its own `w` and `q`
// parameters, previously served at a single fixed width into every viewport - a
// 1000px catalogue image was downloaded in full for a 340px phone card. Unsplash
// resizes on the fly, so a srcset costs nothing but the string that builds it.
//
// These rewrite the query on the existing photo URLs. They do not choose or
// replace any image; the art direction stays exactly where it is defined.

const DEFAULT_WIDTHS = [480, 800, 1200]

// Replaces the w= parameter on an Unsplash URL, leaving every other option
// (auto=format, fit=crop, q=) untouched. Any non-Unsplash URL is returned as-is.
export function unsplashAt(url, width) {
  if (typeof url !== 'string' || !url.includes('images.unsplash.com')) return url
  return url.replace(/([?&]w=)\d+/, `$1${width}`)
}

// Builds a `srcset` string. Returns undefined for URLs it cannot rewrite so the
// attribute is simply omitted rather than emitted empty.
export function unsplashSrcSet(url, widths = DEFAULT_WIDTHS) {
  if (typeof url !== 'string' || !url.includes('images.unsplash.com') || !/[?&]w=\d+/.test(url)) return undefined
  return widths.map(w => `${unsplashAt(url, w)} ${w}w`).join(', ')
}
