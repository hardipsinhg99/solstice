import { Icon } from '../../components/ui/Icon.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { products } from '../../data/products.js'
import { useEnquirySubmit } from './useEnquirySubmit.js'

export function EnquiryForm() {
  const { status, errorDetail, fallbackHref, handleSubmit, resetStatus } = useEnquirySubmit()
  return (
    // onInput rather than onChange so the reset fires on the first keystroke,
    // not on blur - the stale "Enquiry received" label would otherwise sit there
    // through the whole of the next enquiry being typed.
    <Reveal as="form" delay={100} onSubmit={handleSubmit} onInput={resetStatus} aria-busy={status === 'submitting'}>
      <label>Name<input name="name" required autoComplete="name" placeholder="Your name"/></label>
      <label>Business email<input name="email" required type="email" autoComplete="email" placeholder="you@company.com"/></label>
      <label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" placeholder="+1 234 567 8900"/></label>
      <label>Company / market<input name="company" autoComplete="organization" placeholder="Company name and country"/></label>
      <label>What are you looking for?
        <select name="product" defaultValue="">
          <option value="" disabled>Select a product category</option>
          {products.map(p => <option key={p.slug}>{p.name}</option>)}
          <option>Spices &amp; staples</option>
          <option>Other product enquiry</option>
        </select>
      </label>
      <label>Quantity
        <span className="field-row">
          <input name="quantity" type="number" min="1" inputMode="numeric" placeholder="e.g. 24"/>
          <select name="quantity_unit" defaultValue="MT" aria-label="Quantity unit">
            <option>MT</option><option>20ft reefer</option><option>40ft reefer</option><option>Cartons</option>
          </select>
        </span>
      </label>
      <label>Destination port or country<input name="destination" autoComplete="country-name" placeholder="e.g. Jebel Ali, UAE"/></label>
      <label>Incoterm
        <select name="incoterm" defaultValue="Not sure">
          <option>FOB</option><option>CFR</option><option>CIF</option><option>DAP</option><option>Not sure</option>
        </select>
      </label>
      <label>How often do you need this?
        <select name="frequency" defaultValue="">
          <option value="" disabled>Select frequency</option>
          <option>One-time</option><option>Monthly</option><option>Seasonal programme</option><option>Annual contract</option>
        </select>
      </label>
      <label>Message<textarea name="message" placeholder="Product, variety, pack, estimated quantity or any relevant detail"/></label>
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
          <a href={fallbackHref}>Email it to us instead</a> - your answers are already in the draft.
        </p>
      )}
    </Reveal>
  )
}
