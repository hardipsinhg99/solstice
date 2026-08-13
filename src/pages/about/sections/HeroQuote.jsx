import { useTilt3d } from '../../../features/tilt/index.js'

// The page's opening statement, and the one-of-one moment.
//
// Two stacked layers share the same text inside a preserve-3d context: a
// recessed, blurred shadow copy and the readable face, at different translateZ
// depths, so pointer movement produces real parallax between them rather than a
// flat plane rotating. The shadow copy is aria-hidden - only the face is in the
// accessibility tree, so the quote is announced exactly once.
//
// Deliberately two layers, not three: a translucent highlight layer in front of
// the face would sit over the glyphs and lift their measured contrast off the
// backdrop. The recessed layer can only ever darken what is behind the text, so
// the 12.2:1 measurement below holds no matter where the tilt is.
//
// The ghost numeral is carried here rather than in PageTitle: this section
// replaces the standard page header, and website-strategy.md Pillar 4 calls the
// title-mark a signature worth keeping.
export function HeroQuote({ data }) {
  const heroQuote = data ?? {}
  const ref = useTilt3d({ max: 5 })

  return (
    <section
      className={heroQuote.image?.url ? 'about-hero has-banner' : 'about-hero'}
      /* Custom properties on the SECTION, not object-fit/position inline on the
         image. An inline style beats the stylesheet, so per-breakpoint framing
         would have needed !important to override it - which the house rules
         forbid, and rightly. Declared on the parent, the value inherits down to
         the image, and a media query targeting the image itself is the closer
         rule and simply wins. No !important anywhere. */
      style={{
        '--hero-fit': heroQuote.imageFit === 'contain' ? 'contain' : 'cover',
        '--hero-focus': heroQuote.imageFocus || '50% 50%'
      }}
    >
      {/* A real <img>, not a background-image: it gets the browser's own
          responsive loading, it can carry alt text, and object-fit gives
          per-breakpoint framing that background-size cannot express as
          precisely. Sits behind the copy via CSS, not via DOM order, so the
          text stays first in the reading order. */}
      {heroQuote.image?.url && (
        <img
          className="about-hero-banner"
          src={heroQuote.image.url}
          alt={heroQuote.image.alt || ''}
          data-fit={heroQuote.imageFit === 'contain' ? 'contain' : 'cover'}
          fetchPriority="high"
          decoding="async"
        />
      )}
      <span className="title-mark" aria-hidden="true">02</span>
      <div className="container">
        <div className="about-hero-stage" ref={ref}>
          <p className="eyebrow">ABOUT SOLSTICE</p>
          <blockquote className="about-hero-quote">
            <span className="about-hero-layer about-hero-layer-back" aria-hidden="true">{heroQuote.primary}</span>
            <span className="about-hero-layer about-hero-layer-face">{heroQuote.primary}</span>
          </blockquote>
        </div>
      </div>
    </section>
  )
}
