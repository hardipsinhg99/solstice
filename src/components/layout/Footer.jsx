import { Eyebrow } from '../ui/Eyebrow.jsx'
import { Button } from '../ui/Button.jsx'
import { navGroup } from '../../data/navigation.js'
import { usePublishedPages } from '../../features/pages/index.js'
import { useNavigate } from '../../app/navigation.js'
import { useSiteSettings, telHref, mailtoHref } from '../../features/settings/index.js'
import { useSocialLinks, SOCIAL_LABELS } from '../../features/social/index.js'
import { Icon } from '../ui/Icon.jsx'

export function Footer() {
  const { isPublished } = usePublishedPages()

  const navigate = useNavigate()
  const {
    contactEmail, contactPhone, contactEmailEnabled, contactPhoneEnabled,
    contactEmailLabel, contactPhoneLabel
  } = useSiteSettings()
  const mailto = mailtoHref(contactEmail)
  const tel = telHref(contactPhone)
  const social = useSocialLinks()

  // Enabled is NOT the same question as "is the value usable" - disabled means
  // the operator has a value and is choosing not to publish it. Both have to
  // hold before a row renders; see the schema note on contactPhoneEnabled.
  const showEmail = contactEmailEnabled !== false && Boolean(mailto)
  const showPhone = contactPhoneEnabled !== false && Boolean(tel)
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

          {showEmail && (
            <a className="footer-contact" href={mailto}>
              <Icon name="mail" size={16}/>
              <span>
                {contactEmailLabel && <em className="footer-contact-label">{contactEmailLabel}</em>}
                {contactEmail}
              </span>
            </a>
          )}

          {showPhone && (
            <a className="footer-contact" href={tel}>
              <Icon name="phone" size={16}/>
              <span>
                {contactPhoneLabel && <em className="footer-contact-label">{contactPhoneLabel}</em>}
                {contactPhone}
              </span>
            </a>
          )}

          {/* Nothing is hardcoded here - not the platforms, not the order, not
              the URLs. An empty list renders no row at all rather than an empty
              strip, which is what an operator who has enabled nothing expects. */}
          {social.length > 0 && (
            <ul className="footer-social">
              {social.map(({ platform, url }) => (
                <li key={platform}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                     aria-label={SOCIAL_LABELS[platform] ?? platform}
                     title={SOCIAL_LABELS[platform] ?? platform}>
                    <Icon name={platform} size={18}/>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <span className="footer-note">International buyer enquiries welcome</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Solstice Trading International LLP</span>
        <span>Fresh produce export, from India to your market.</span>
        {/* Build credit. A real external link, so it carries the same
            noopener/noreferrer the footer's social marks do - target=_blank
            without it hands the opened page a reference to this window. */}
        <a className="footer-credit" href="https://ivisioncraft.dev/"
           target="_blank" rel="noopener noreferrer">
          Made by <strong>iVisionCraft</strong>
        </a>
      </div>
    </footer>
  )
}
