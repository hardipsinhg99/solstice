import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'

export default function GalleryPage() {
  const images = [
    'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1557844352-761f2565b576?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=1000&q=85'
  ]
  const [active, setActive] = useState(null)
  useEffect(() => {
    if (active === null) return
    const onKey = (event) => {
      if (event.key === 'Escape') setActive(null)
      if (event.key === 'ArrowRight') setActive(a => (a + 1) % images.length)
      if (event.key === 'ArrowLeft') setActive(a => (a - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
  return <>
    <PageTitle mark="06" eyebrow="A LOOK AT THE PRODUCE" title="Freshness, in" accent="focus." copy="A glimpse into the colour, texture and care behind our fresh-produce conversations."/>
    <section className="gallery section">
      <div className="container gallery-grid">
        {images.map((image, index) => (
          <Reveal as="button" key={image} delay={(index % 3) * 70} className={`gallery-tile tile-${index + 1}`} style={{ backgroundImage: `url('${image}')` }} onClick={() => setActive(index)} aria-label={`Open image ${index + 1} of ${images.length}`}>
            <span>0{index + 1}</span>
          </Reveal>
        ))}
      </div>
    </section>
    {active !== null && (
      <div className="lightbox" onClick={() => setActive(null)}>
        <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close"><Icon name="close" size={20}/></button>
        <button className="lightbox-nav prev" onClick={event => { event.stopPropagation(); setActive(a => (a - 1 + images.length) % images.length) }} aria-label="Previous image"><Icon name="arrow" size={20}/></button>
        <img src={images[active]} alt={`Fresh produce gallery ${active + 1}`} onClick={event => event.stopPropagation()}/>
        <button className="lightbox-nav next" onClick={event => { event.stopPropagation(); setActive(a => (a + 1) % images.length) }} aria-label="Next image"><Icon name="arrow" size={20}/></button>
      </div>
    )}
  </>
}