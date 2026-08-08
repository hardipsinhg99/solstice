// H.264 only. VP9 was measured against this exact clip at equal file size and
// lost on quality (SSIM 0.912 vs 0.930), so a <source> split would have handed
// Chrome and Firefox a worse file for more bytes. See the hero commit message.
export const HERO_VIDEO_SRC = '/hero/hero.mp4'

// Frame 0 of HERO_VIDEO_SRC, extracted from the encoded file rather than the
// master, so the still and the video's first frame are the same pixels and the
// handover cannot flash or shift colour.
export const HERO_POSTER_SRC = '/hero/hero-poster.jpg'

export const ENQUIRY_EMAIL = 'hello@solsticetrading.com'

// VITE_ vars are inlined into the client bundle and are therefore public -
// only ever put a form-provider public form id / access key here.
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT
export const FORM_ACCESS_KEY = import.meta.env.VITE_FORM_ACCESS_KEY
