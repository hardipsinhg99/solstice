import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'
import { usePublicGallery } from '../../features/gallery/index.js'

// The six photographs used to live in a hardcoded array at module scope here.
// They are now GalleryImage rows, edited at #admin/gallery - the migration moved
// the same URLs across as EXTERNAL media assets, so this page shows exactly what
// it showed before until somebody uploads a replacement.

export default function GalleryPage() {
  const [images, status] = usePublicGallery()
  const [active, setActive] = useState(null)
  const step = (index, by) => (index + by + images.length) % images.length
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

  // The lightbox indexes into `images`. If a refetch shortens the list while it
  // is open, the index would point past the end and render undefined.
  useEffect(() => {
    if (active !== null && active >= images.length) setActive(null)
  }, [images.length, active])

  return <>
    <PageTitle mark="06" eyebrow="A LOOK AT THE PRODUCE" title="Freshness, in" accent="focus." copy="A glimpse into the colour, texture and care behind our fresh-produce conversations."/>
    <section className="gallery section">
      <div className="container gallery-grid">
        {images.map((image, index) => (
          <Reveal
            as="button"
            key={image.id}
            delay={(index % 3) * 70}
            className={`gallery-tile tile-${index + 1}`}
            onClick={(event) => open(index, event)}
            aria-label={image.caption
              ? `Open image ${index + 1} of ${images.length}: ${image.caption}`
              : `Open image ${index + 1} of ${images.length}`}
          >
            {/* Was a CSS background-image, which no browser can lazy-load or
                size-negotiate: all six full-width photographs were fetched
                eagerly on page load. */}
            <img
              src={unsplashAt(image.url, 800)}
              srcSet={unsplashSrcSet(image.url)}
              sizes="(max-width: 780px) 50vw, 33vw"
              {...(image.width && image.height ? { width: image.width, height: image.height } : {})}
              // The tile is inside a button that already announces the image and
              // its caption, so alt="" here would be correct even with alt text
              // set - a screen reader would otherwise hear the description twice.
              alt=""
              loading="lazy"
              decoding="async"
            />
            <span className="gallery-index">0{index + 1}</span>
            {image.caption && <span className="gallery-caption">{image.caption}</span>}
          </Reveal>
        ))}
      </div>

      {status === 'loading' && images.length === 0 && (
        <p className="container gallery-status" role="status">Loading the gallery…</p>
      )}
      {status === 'error' && (
        <p className="container gallery-status" role="status">
          The gallery could not be loaded just now. Everything else on the site is unaffected.
        </p>
      )}
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
        <figure className="lightbox-figure" onClick={event => event.stopPropagation()}>
          <img
            src={unsplashAt(images[active].url, 1400)}
            // The real description now, where there is one. The generic
            // "Fresh produce gallery 3" it used to carry told a screen-reader
            // user nothing they could not already work out from the dialog label.
            alt={images[active].alt || `Fresh produce gallery ${active + 1}`}
          />
          {images[active].caption && <figcaption>{images[active].caption}</figcaption>}
        </figure>
        <button className="lightbox-nav next" onClick={event => { event.stopPropagation(); setActive(a => step(a, 1)) }} aria-label="Next image"><Icon name="arrow" size={20}/></button>
      </div>
    )}
  </>
}
