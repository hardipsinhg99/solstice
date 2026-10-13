import { HERO_IMAGE_SRC, HERO_IMAGE_NARROW, HERO_IMAGE_W, HERO_IMAGE_H } from '../../../lib/constants.js'
import { HeroPicture } from '../../../features/pages/index.js'
import { HeroVideo } from './HeroVideo.jsx'

// The hero visual. The admin can replace it (Pages > Home > Hero); with nothing
// uploaded it is the branded logistics composite, exactly as before.
//
// A real <img>, not the CSS background-image this replaces. A background-image
// fed through a custom property is invisible to the preload scanner and cannot
// take fetchpriority, so the largest element on the page - the LCP candidate -
// could not begin loading until the stylesheet had downloaded and parsed. That
// is the construction docs/website-strategy.md 3.7 singles out as the LCP
// problem on this site.
//
// An optional video layer sits on top (Admin -> Pages -> Home -> Hero). It is
// transparent until it is actually playing and absent whenever it cannot play,
// so this image is still what every visitor sees first and what anyone without
// the video keeps - see HeroVideo.
//
// The element is absolutely positioned inside an already-sized box and declares
// its intrinsic dimensions, so it reserves nothing and shifts nothing - the hero
// is a fixed 730px whether or not the image has arrived.
//
// alt="" and the aria-hidden wrapper: this is decoration. Everything it says -
// the company name, that the business is import/export, that it moves freight -
// is already in the adjacent h1, the eyebrow and the body copy, so describing it
// would only make a screen reader read the hero twice.
/* With a video switched on, the still is the video's own poster - its exact
   first frame, at the video's size - rather than the hero image. Two reasons,
   both measured:
   - LCP. Chrome scores an image by its own pixels and moves LCP to anything
     strictly LARGER that paints later, and it counts a video's first frame.
     The live hero image is 1600x588; the desktop video 1600x900. Over the
     image, the video became the LCP element seconds after the page was
     readable (6.5s -> 10.2s on slow 3G). Over its own poster it scores the
     same, so LCP is the poster, early, and stays there.
   - The hand-off. The still and the first frame are the same picture, so the
     fade into motion is a dissolve with no jump.
   The hero image is still the hero whenever there is no video, or it is
   switched off; and the poster is the static image for anyone the video does
   not play for (reduced motion, data saver, autoplay refused). */
const videoStill = (video) =>
  video?.desktop?.url && video.published !== false && video.poster?.url
    ? { url: video.poster.url, width: video.poster.width, height: video.poster.height }
    : null

export function HeroMedia({ image, imageMobile, focus, video }) {
  const still = videoStill(video)
  return (
    <div className="hero-media" aria-hidden="true">
      {/* <picture>, not srcset. srcset picks a SIZE of the same picture; below
          780px this needs a different CROP, because the wide frame shows about a
          fifth of its width in a portrait viewport and the ship falls outside it.
          That is art direction, and <source media> is the element for it -
          HeroPicture decides which file each screen gets. */}
      <HeroPicture
        image={still ?? image}
        imageMobile={still ? null : imageMobile}
        focus={focus}
        fallback={HERO_IMAGE_SRC}
        fallbackPhone={HERO_IMAGE_NARROW}
        imgClassName="hero-poster"
        width={HERO_IMAGE_W}
        height={HERO_IMAGE_H}
      />
      {/* After the picture and before the overlay (.hero-media:after), so the
          readability scrim covers the video exactly as it covers the image. */}
      <HeroVideo video={video} focus={focus}/>
    </div>
  )
}
