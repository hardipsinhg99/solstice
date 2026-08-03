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
          {contactFaq.map((item, index) => (
            <Reveal as="div" key={item.q} delay={index * 60} className={open === index ? 'faq-item open' : 'faq-item'}>
              <button className="faq-question" onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>
                {item.q}<Icon name="arrow" size={15}/>
              </button>
              <div className="faq-answer"><p>{item.a}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}