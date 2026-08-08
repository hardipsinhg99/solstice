import { HERO_IMAGE_SRC, HERO_IMAGE_SRCSET } from '../../../lib/constants.js'

// The hero visual: the branded logistics composite.
//
// A real <img>, not the CSS background-image this replaces. A background-image
// fed through a custom property is invisible to the preload scanner and cannot
// take fetchpriority, so the largest element on the page - the LCP candidate -
// could not begin loading until the stylesheet had downloaded and parsed. That
// is the construction docs/website-strategy.md 3.7 singles out as the LCP
// problem on this site.
//
// No video layer. The clip would play on top of this and hide it, which defeats
// the point of supplying the composite; the video work still exists on the
// feat/hero-video branch if it is wanted back.
//
// The element is absolutely positioned inside an already-sized box and declares
// its intrinsic dimensions, so it reserves nothing and shifts nothing - the hero
// is a fixed 730px whether or not the image has arrived.
//
// alt="" and the aria-hidden wrapper: this is decoration. Everything it says -
// the company name, that the business is import/export, that it moves freight -
// is already in the adjacent h1, the eyebrow and the body copy, so describing it
// would only make a screen reader read the hero twice.
export function HeroMedia() {
  return (
    <div className="hero-media" aria-hidden="true">
      <img
        className="hero-poster"
        src={HERO_IMAGE_SRC}
        srcSet={HERO_IMAGE_SRCSET}
        sizes="100vw"
        alt=""
        width="1672"
        height="941"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  )
}
