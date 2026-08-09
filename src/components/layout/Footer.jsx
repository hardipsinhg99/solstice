import { Eyebrow } from '../ui/Eyebrow.jsx'
import { Button } from '../ui/Button.jsx'
import { navItems } from '../../data/navigation.js'
import { ENQUIRY_EMAIL } from '../../lib/constants.js'
import { useNavigate } from '../../app/navigation.js'

export function Footer() {
  const navigate = useNavigate()
  return (
    <footer>
      <div className="footer-cta">
        <div className="container footer-cta-inner">
          <div><Eyebrow>NEW ENQUIRY</Eyebrow><h3>Looking to source fresh produce, spices or staples from India?</h3></div>
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
          {navItems.slice(1, 4).map(([route, label]) => <button key={route} onClick={() => navigate(route)}>{label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Company</span>
          {navItems.slice(4).map(([route, label]) => <button key={route} onClick={() => navigate(route)}>{label}</button>)}
        </div>
        <div className="footer-col">
          <span className="footer-heading">Get in touch</span>
          <a href={`mailto:${ENQUIRY_EMAIL}`}>{ENQUIRY_EMAIL}</a>
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
