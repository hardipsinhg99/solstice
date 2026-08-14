// The hero composite. Three widths; the largest is the source's native 1672px -
// anything above that would be upscaling, which invents detail and costs bytes
// for nothing, so wide viewports scale the native file instead.
export const HERO_IMAGE_SRC = '/hero/hero-1280.webp'
export const HERO_IMAGE_SRCSET = [
  '/hero/hero-960.webp 960w',
  '/hero/hero-1280.webp 1280w',
  '/hero/hero-1672.webp 1672w'
].join(', ')

// Contact details moved into the SiteSettings row in Phase 1c and are edited at
// #admin/settings. What is left here is the FALLBACK the site renders before the
// settings fetch resolves, and if it fails - see features/settings. Keeping real
// values here means an unreachable API degrades to the old behaviour rather than
// to a mailto: pointing at "undefined".
export const ENQUIRY_EMAIL = 'hello@solsticetrading.com'

// Display fallback only, same role as ENQUIRY_EMAIL: what renders before the
// settings request resolves, and if the API is unreachable. The live value is
// SiteSettings.contactPhone. Spacing is the number as a reader would say it.
export const CONTACT_PHONE = '+91 90813 66630'

// wa.me takes the number in international format as DIGITS ONLY - no leading +,
// no spaces, no dashes, no parentheses. Any of those are not rejected with an
// error, they silently resolve to "phone number shared via url is invalid", so
// the failure only shows up on the buyer's screen. India example: 919876543210.
// The message is URL-encoded at the call site, so write it here as plain prose.
export const WHATSAPP_NUMBER = '[WHATSAPP_NUMBER]'
export const WHATSAPP_MESSAGE = '[PRE_FILLED_MESSAGE]'
