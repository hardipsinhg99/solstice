import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

// Hoisted out of the component: rebuilt on every render it was a fresh array
// identity each time, which is exactly the dependency trap the globe was fixed
// for. It is constant data and belongs at module scope.
const images = [
  'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1557844352-761f2565b576?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=1000&q=85'
]

const step = (index, by) => (index + by + images.length) % images.length

export default function GalleryPage() {
  const [active, setActive] = useState(null)
  const dialogRef = useRef(null)
  const openerRef = useRef(null)

  const open = (index, event) => { openerRef.current = event.currentTarget; setActive(index) }
  const close = () => { setActive(null); openerRef.current?.focus() }

  // The lightbox looked like a modal but behaved like an overlay: focus stayed
  // on the page behind it, Tab walked out into the gallery, the background
  // scrolled, and closing dropped focus back to <body>. This gives it the four
  // behaviours a dialog owes the user (SC 2.1.2, 2.4.3).
  useEffect(() => {
    if (active === null) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key === 'ArrowRight') { setActive(a => step(a, 1)); return }
      if (event.key === 'ArrowLeft') { setActive(a => step(a, -1)); return }
      if (event.key !== 'Tab') return

      // Focus trap. Recomputed per keypress rather than cached, so it stays
      // correct as the dialog's contents change.
      const focusable = dialogRef.current?.querySelectorAll('button')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
    // `active` is in the deps so the handler closes over the current index, but
    // the scroll lock and focus calls are idempotent across those re-runs.
  }, [active])

  return <>
    <PageTitle mark="06" eyebrow="A LOOK AT THE PRODUCE" title="Freshness, in" accent="focus." copy="A glimpse into the colour, texture and care behind our fresh-produce conversations."/>
    <section className="gallery section">
      <div className="container gallery-grid">
        {images.map((image, index) => (
          <Reveal
            as="button"
            key={image}
            delay={(index % 3) * 70}
            className={`gallery-tile tile-${index + 1}`}
            onClick={(event) => open(index, event)}
            aria-label={`Open image ${index + 1} of ${images.length}`}
          >
            {/* Was a CSS background-image, which no browser can lazy-load or
                size-negotiate: all six full-width photographs were fetched
                eagerly on page load. */}
            <img
              src={unsplashAt(image, 800)}
              srcSet={unsplashSrcSet(image)}
              sizes="(max-width: 780px) 50vw, 33vw"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <span>0{index + 1}</span>
          </Reveal>
        ))}
      </div>
    </section>
    {active !== null && (
      <div
        className="lightbox"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Fresh produce gallery, image ${active + 1} of ${images.length}`}
        tabIndex={-1}
        onClick={close}
      >
        <button className="lightbox-close" onClick={close} aria-label="Close"><Icon name="close" size={20}/></button>
        <button className="lightbox-nav prev" onClick={event => { event.stopPropagation(); setActive(a => step(a, -1)) }} aria-label="Previous image"><Icon name="arrow" size={20}/></button>
        <img
          src={unsplashAt(images[active], 1400)}
          alt={`Fresh produce gallery ${active + 1}`}
          onClick={event => event.stopPropagation()}
        />
        <button className="lightbox-nav next" onClick={event => { event.stopPropagation(); setActive(a => step(a, 1)) }} aria-label="Next image"><Icon name="arrow" size={20}/></button>
      </div>
    )}
  </>
}
