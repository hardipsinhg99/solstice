import { readToken } from './useAdminAuth.js'

/**
 * A media asset with nothing attached to it yet - what a page-section image
 * field and TipTap's image insert both need. Same endpoint, same MediaService,
 * same pipeline as every other upload on this server.
 */
export async function uploadAsset(file, altText) {
  const body = new FormData()
  body.append('file', file)
  if (altText) body.append('altText', altText)

  const token = readToken()
  const res = await fetch('/api/media/assets', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const message = Array.isArray(detail?.message) ? detail.message.join(', ') : detail?.message
    throw new Error(message || `Upload failed (${res.status})`)
  }
  return res.json()
}
