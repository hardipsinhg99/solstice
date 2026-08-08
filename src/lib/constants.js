// The hero composite. Three widths; the largest is the source's native 1672px -
// anything above that would be upscaling, which invents detail and costs bytes
// for nothing, so wide viewports scale the native file instead.
export const HERO_IMAGE_SRC = '/hero/hero-1280.webp'
export const HERO_IMAGE_SRCSET = [
  '/hero/hero-960.webp 960w',
  '/hero/hero-1280.webp 1280w',
  '/hero/hero-1672.webp 1672w'
].join(', ')

export const ENQUIRY_EMAIL = 'hello@solsticetrading.com'

// VITE_ vars are inlined into the client bundle and are therefore public -
// only ever put a form-provider public form id / access key here.
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT
export const FORM_ACCESS_KEY = import.meta.env.VITE_FORM_ACCESS_KEY
