import { Eyebrow } from '../ui/Eyebrow.jsx'
import { Button } from '../ui/Button.jsx'
import { navGroup } from '../../data/navigation.js'
import { usePublishedPages } from '../../features/pages/index.js'
import { useNavigate } from '../../app/navigation.js'
import { useSiteSettings } from '../../features/settings/index.js'

export function Footer() {
  const { isPublished } = usePublishedPages()

  const navigate = useNavigate()
  const { contactEmail } = useSiteSettings()
  return (
    <footer>
      <div className="footer-cta">
        <div className="container footer-cta-inner">
          <div><Eyebrow>NEW ENQUIRY</Eyebrow><h3>Looking to source <em>fresh produce, spices or staples</em> from India?</h3></div>
          <Button onClick={() => navigate('contact')} variant="lime">Start an enquiry</Button>
        </div>
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <button className="brand brand-logo footer-logo notranslate" translate="no" onClick={() => navigate('home')} aria-label="Solstice home">
            <img src="/solstice-logo.png" alt="Solstice Trading International LLP"/>
          </button>
          <p>Fresh produce, spices &amp; essential foods<br/>from India, for international buyers.</p>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Explore</span>
          {navGroup('explore', isPublished).map(item => <button key={item.route} onClick={() => navigate(item.route)}>{item.label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Company</span>
          {navGroup('company', isPublished).map(item => <button key={item.route} onClick={() => navigate(item.route)}>{item.label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Get in touch</span>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <span className="footer-note">International buyer enquiries welcome</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Solstice Trading International LLP</span>
        <span>Fresh produce export, from India to your market.</span>
      </div>
    </footer>
  )
}
