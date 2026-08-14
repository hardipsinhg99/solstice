// The hero photograph, art-directed into two crops rather than one file scaled
// two ways.
//
// The source (public/home.png, 1584x672) is a 2.36:1 letterbox with a baked-in
// SOLSTICE wordmark occupying its left third on a near-white wash. Neither fact
// survives a single background-position:
//
//   - At 2.36:1, a portrait phone viewport showing it with `cover` displays
//     roughly a fifth of its width. The ship - the whole point of the picture -
//     lands outside the frame at most positions.
//   - The wordmark sits exactly where the hero copy sits, under the darkest end
//     of --hero-scrim. Overlaying them buries the wordmark under a 96%-opaque
//     scrim AND collides it with the h1, and the header already carries the
//     logo, so keeping it there would be duplicate branding that reads as a
//     mistake.
//
// So the crops are taken at build time from the photographic portion: the wide
// one keeps plane, cranes, yard, truck, ship and ocean; the narrow one is
// squarer and centred on the ship and gantries, which is what survives a
// portrait frame. Both drop the wordmark band.
//
// Regenerate with scripts/build-hero.mjs if the source changes.
export const HERO_IMAGE_SRC = '/home-hero.webp'
export const HERO_IMAGE_SRCSET = ''
// Below this width the wide crop is the wrong picture, not merely a big one -
// which is what makes this art direction (<picture> + media) rather than srcset.
export const HERO_IMAGE_NARROW = '/home-hero-960.webp'
export const HERO_NARROW_MEDIA = '(max-width: 780px)'
export const HERO_IMAGE_W = 1024
export const HERO_IMAGE_H = 672

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
