import { Eyebrow } from '../../components/ui/Eyebrow.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { EnquiryForm } from '../../features/enquiry/index.js'
import { useSiteSettings } from '../../features/settings/index.js'
import { Faq } from './sections/Faq.jsx'

export default function ContactPage() {
  const { contactEmail } = useSiteSettings()
  return <>
    <PageTitle mark="07" eyebrow="CONTACT SOLSTICE" title="Let’s talk" accent="produce." copy="Tell us what you are looking for and where you want it to go."/>
    <section className="contact-page section">
      <div className="container contact-page-grid">
        <Reveal as="aside">
          <Eyebrow>START AN ENQUIRY</Eyebrow>
          <h2>Your next fresh<br/>produce <em>conversation.</em></h2>
          <p>We welcome enquiries from importers, distributors, retailers and foodservice buyers.</p>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <div className="contact-points">
            <span><Icon name="globe" size={16}/> International buyer enquiries</span>
            <span><Icon name="leaf" size={16}/> Fresh fruits &amp; vegetables</span>
          </div>
        </Reveal>
        <EnquiryForm/>
      </div>
    </section>
    <Faq/>
  </>
}