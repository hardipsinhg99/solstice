import { readToken, apiFetch } from './useAdminAuth.js'

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

/**
 * A multipart upload that reports progress. XMLHttpRequest rather than fetch
 * for one reason: fetch cannot report upload progress, and a bar that jumps
 * 0 -> 100 is worse than none on a slow connection. Lifted out of the gallery,
 * which now uses this too - one implementation, not two.
 */
export function xhrUpload(url, body, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    const token = readToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      let payload = null
      try { payload = JSON.parse(xhr.responseText) } catch { /* non-JSON error body */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload)
      const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message
      reject(new Error(message || `Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed - could not reach the server.')))
    xhr.send(body)
  })
}

/**
 * The Home hero background video. Returns the pair's state immediately -
 * { desktopId, status, failureReason, video } - while the server encodes in the
 * background; poll fetchHeroVideoState(desktopId) until READY or FAILED.
 */
export function uploadHeroVideo(file, onProgress) {
  const body = new FormData()
  body.append('file', file)
  return xhrUpload('/api/media/hero-video', body, onProgress)
}

export const fetchHeroVideoState = (desktopId) => apiFetch(`/media/hero-video/${encodeURIComponent(desktopId)}`)
