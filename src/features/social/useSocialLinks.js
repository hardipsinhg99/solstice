import { useApiResource } from '../api/useApiResource.js'

const KEY = 'social-links'

/**
 * Enabled, configured social profiles in display order.
 *
 * FAILS CLOSED - the fallback is an empty list. The opposite choice, some
 * hardcoded default set, is what the brief rules out: the admin panel is the
 * single source of truth, so an unreachable API must show no social row rather
 * than a stale one nobody can turn off. The footer's other columns still render.
 */
async function fetchSocialLinks () {
  const res = await fetch('/api/social')
  if (!res.ok) throw new Error(`Social links unavailable (${res.status})`)
  return res.json()
}

export function useSocialLinks () {
  const [data] = useApiResource(KEY, fetchSocialLinks, [])
  return Array.isArray(data) ? data : []
}

/**
 * The accessible name for each mark. The icons carry no text, so this IS the
 * link's name to a screen reader - "Instagram", not "social link 3".
 */
export const SOCIAL_LABELS = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn'
}
