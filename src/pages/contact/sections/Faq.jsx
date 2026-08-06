import { useState } from 'react'
import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { contactFaq } from '../../../data/faqs.js'

export function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="faq section">
      <div className="container">
        <Reveal as="div" className="section-head">
          <div><Eyebrow>QUESTIONS &amp; ANSWERS</Eyebrow><h2>Frequently asked<br/><em>questions.</em></h2></div>
        </Reveal>
        <div className="faq-list">
          {/* Disclosure pattern: aria-expanded alone told assistive tech the
              state but not which region it governed, so the answer was an
              unrelated block of text further down the tree. */}
          {contactFaq.map((item, index) => (
            <Reveal as="div" key={item.q} delay={index * 60} className={open === index ? 'faq-item open' : 'faq-item'}>
              <button
                id={`faq-q-${index}`}
                className="faq-question"
                onClick={() => setOpen(open === index ? null : index)}
                aria-expanded={open === index}
                aria-controls={`faq-a-${index}`}
              >
                {item.q}<Icon name="arrow" size={15}/>
              </button>
              <div id={`faq-a-${index}`} className="faq-answer" role="region" aria-labelledby={`faq-q-${index}`}>
                <p>{item.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}