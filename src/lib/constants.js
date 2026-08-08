export const HERO_VIDEO_SRC = '/hero/hero.mp4'

export const ENQUIRY_EMAIL = 'hello@solsticetrading.com'

// wa.me takes the number in international format as DIGITS ONLY - no leading +,
// no spaces, no dashes, no parentheses. Any of those are not rejected with an
// error, they silently resolve to "phone number shared via url is invalid", so
// the failure only shows up on the buyer's screen. India example: 919876543210.
// The message is URL-encoded at the call site, so write it here as plain prose.
export const WHATSAPP_NUMBER = '[WHATSAPP_NUMBER]'
export const WHATSAPP_MESSAGE = '[PRE_FILLED_MESSAGE]'

// VITE_ vars are inlined into the client bundle and are therefore public -
// only ever put a form-provider public form id / access key here.
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT
export const FORM_ACCESS_KEY = import.meta.env.VITE_FORM_ACCESS_KEY
