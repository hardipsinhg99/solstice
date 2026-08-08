import { useTilt3d } from '../../../features/tilt/index.js'
import { heroQuote } from '../../../data/about-content.js'

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
export function HeroQuote() {
  const ref = useTilt3d({ max: 5 })

  return (
    <section className="about-hero">
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
