import { useApiResource, primeResource, clearResource } from '../api/useApiResource.js'
import { ENQUIRY_EMAIL, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../../lib/constants.js'

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
  contactEmail: ENQUIRY_EMAIL
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
 * "[WHATSAPP_NUMBER]", so this also answers "has anyone filled the number in
 * yet" - which is what the FAB uses to decide whether to render at all.
 */
export const isUsableWhatsappNumber = (value) => /^[1-9]\d{7,14}$/.test(String(value ?? ''))

export function whatsappHref({ whatsappNumber, whatsappMessage }) {
  // Hand-escaping the message is what breaks wa.me links - an apostrophe or an
  // accented character arrives as a truncated or mojibake'd draft.
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage ?? '')}`
}
