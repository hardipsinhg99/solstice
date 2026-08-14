import { useApiResource, primeResource, clearResource } from '../api/useApiResource.js'
import { ENQUIRY_EMAIL, CONTACT_PHONE, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../../lib/constants.js'
import { isPlaceholder } from '../../lib/placeholder.js'

// The second consumer of useApiResource, and the reason it was generalised out
// of useProductCatalogue.
const KEY = 'settings'

// The constants stay in lib/constants.js and become the fallback, not dead code.
// If the API is down or has not been seeded, the footer still shows an address
// and the WhatsApp button still has a target - a marketing site must never render
// a mailto: to `undefined` because a database was unreachable.
const FALLBACK = {
  whatsappNumber: WHATSAPP_NUMBER,
  whatsappMessage: WHATSAPP_MESSAGE,
  contactEmail: ENQUIRY_EMAIL,
  contactPhone: CONTACT_PHONE,
  // Matches the server's default row - both read as shown, not withheld, until
  // an admin explicitly turns one off. See the schema note on contactPhoneEnabled.
  contactEmailEnabled: true,
  contactPhoneEnabled: true,
  contactEmailLabel: '',
  contactPhoneLabel: '',
  // Fails OPEN. A settings fetch that has not landed, or that failed, must not
  // blink the language selector out of the header - the widget staying is the
  // safe direction, and turning it off is a deliberate admin action.
  translateEnabled: true
}

async function fetchSiteSettings() {
  const response = await fetch('/api/settings')
  if (!response.ok) throw new Error(`Settings unavailable (${response.status})`)
  return { ...FALLBACK, ...(await response.json()) }
}

export function primeSiteSettings() {
  return primeResource(KEY, fetchSiteSettings)
}

/** Lets the admin see its own save reflected without a full reload. */
export function clearSiteSettings() {
  clearResource(KEY)
}

/**
 * Returns the settings object directly rather than the [data, status, retry]
 * tuple: every consumer is a footer link or a floating button that has no
 * meaningful loading or error state - it renders the fallback until the real
 * value arrives, and swaps silently.
 */
export function useSiteSettings() {
  const [data] = useApiResource(KEY, fetchSiteSettings, FALLBACK)
  return data ?? FALLBACK
}

/**
 * wa.me needs digits only. The seeded placeholder is literally
 * "[WHATSAPP_NUMBER]", so isPlaceholder() is what answers "has anyone filled
 * the number in yet" and the digits-only regex is what answers "is what they
 * typed usable" - both have to pass before the FAB (or anything else) renders
 * a wa.me link.
 */
export const isUsableWhatsappNumber = (value) =>
  !isPlaceholder(value) && /^[1-9]\d{7,14}$/.test(String(value ?? ''))

export function whatsappHref({ whatsappNumber, whatsappMessage }) {
  // Hand-escaping the message is what breaks wa.me links - an apostrophe or an
  // accented character arrives as a truncated or mojibake'd draft.
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage ?? '')}`
}

/**
 * A mailto: href, or null when the address is unset or a placeholder marker.
 * Every mailto: consumer (footer, contact page, the enquiry form's failure
 * fallback) goes through this rather than interpolating contactEmail directly.
 */
export function isUsableContactEmail(value) {
  return !isPlaceholder(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

export function mailtoHref(contactEmail) {
  return isUsableContactEmail(contactEmail) ? `mailto:${contactEmail}` : null
}

/**
 * A tel: href from a number written for humans.
 *
 * The stored value carries display spacing (+91 90813 66630); a dialler wants
 * none of it. Strip to digits, keeping a leading + because that is what makes
 * it dialable from outside India - which is the only kind of buyer this site
 * has. Returns null for an empty setting, a bracketed placeholder, or too few
 * digits to dial, so the caller renders nothing rather than an href to nowhere.
 */
export function telHref(contactPhone) {
  if (isPlaceholder(contactPhone)) return null
  const digits = (contactPhone ?? '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return digits.replace(/\D/g, '').length >= 6 ? `tel:${digits}` : null
}
