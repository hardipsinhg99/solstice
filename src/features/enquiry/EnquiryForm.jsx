import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { useEnquirySubmit } from './useEnquirySubmit.js'

// Four fields, all required. The qualification set that used to live here -
// company, product, quantity + unit, destination, Incoterm, frequency - is gone;
// whatever the buyer wants to specify now goes in the message, which is why its
// placeholder still prompts for product, pack and quantity.
//
// The consent checkbox is not one of the four and is deliberately kept: it is a
// legal control rather than a data field, and it is the lawful basis for
// replying to EU/UK buyers. Say the word and it goes.
//
// The honeypot below it is invisible spam protection, not a field a human ever
// sees or fills.
export function EnquiryForm() {
  const { status, errorDetail, fallbackHref, handleSubmit, resetStatus } = useEnquirySubmit()
  return (
    // onInput rather than onChange so the reset fires on the first keystroke,
    // not on blur - the stale "Enquiry received" label would otherwise sit there
    // through the whole of the next enquiry being typed.
    <Reveal as="form" className="enquiry-form" delay={100} onSubmit={handleSubmit} onInput={resetStatus} aria-busy={status === 'submitting'}>
      <label>Name<input name="name" required autoComplete="name" placeholder="Your name"/></label>
      <label>Business email<input name="email" required type="email" autoComplete="email" placeholder="you@company.com"/></label>
      <label>Phone / WhatsApp<input name="phone" required type="tel" autoComplete="tel" placeholder="+1 234 567 8900"/></label>
      <label>Message<textarea name="message" required placeholder="Product, variety, pack, estimated quantity or any relevant detail"/></label>
      <label className="consent-field">
        <input name="consent" type="checkbox" required value="yes"/>
        <span>I agree that Solstice Trading International LLP may use these details to respond to my enquiry.</span>
      </label>
      <label className="hp-field" aria-hidden="true">Company website
        <input name="company_website" tabIndex={-1} autoComplete="off"/>
      </label>
      <button className={status === 'success' ? 'button primary sent' : 'button primary'} type="submit" disabled={status === 'submitting'}>
        {status === 'success' ? <><Icon name="check" size={16}/> Enquiry received</>
          : status === 'submitting' ? <>Sending<span className="dots" aria-hidden="true"/></>
          : <>Send enquiry <Icon name="arrow" size={17}/></>}
      </button>
      <p className="form-status" role="status" aria-live="polite">
        {status === 'success' && 'Thank you - your enquiry has reached our team. We reply within one business day (IST 09:00-18:00).'}
      </p>
      {status === 'error' && (
        <p className="form-status form-error" role="alert">
          We could not send your enquiry. {errorDetail}{' '}
          {fallbackHref
            ? <><a href={fallbackHref}>Email it to us instead</a> - your answers are already in the draft.</>
            : 'Please try again shortly.'}
        </p>
      )}
    </Reveal>
  )
}
