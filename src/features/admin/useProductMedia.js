import { readToken } from './useAdminAuth.js'

// Upload limits mirrored from server/src/media/media.constants.ts. Duplicated on
// purpose: the client pre-check exists so a buyer's 12MB phone photo fails in
// under a second instead of after a 12MB round trip. The server enforces the
// same numbers independently and is the authority - this copy is a courtesy,
// never a control.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 6
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/* Video has its own caps, mirrored from VIDEO in media.constants.ts. They are
   separate from the image ones on purpose: 8MB is a sane ceiling for a
   photograph and is cleared by the first two seconds of a phone clip. */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
export const MAX_VIDEO_SECONDS = 60

/**
 * @param {File} file
 * @param {{ allowVideo?: boolean }} opts
 *
 * Kind-aware. It used to be images-only, which was correct when it was written -
 * it serves the PRODUCT media form, where video has never been allowed. The
 * gallery then grew video support: its file input accepts video/mp4 and the
 * server transcodes it, but this pre-check still rejected every clip in the
 * browser, so the file never reached the endpoint that would have taken it.
 * The picker offering a format the validator refuses is the bug.
 *
 * Callers opt IN to video. Product media keeps the images-only behaviour by
 * default rather than inheriting a widening it never asked for.
 */
export function preflight(file, { allowVideo = false } = {}) {
  if (!file) return 'No file selected.'

  // The browser derives type from the extension, so this is a courtesy check.
  // The server reads magic bytes and is the authority for both kinds.
  const isVideo = allowVideo && file.type && file.type.startsWith('video/')

  if (isVideo) {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return 'Video must be MP4, MOV, WebM or AVI.'
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return `That clip is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_VIDEO_BYTES / 1024 / 1024} MB.`
    }
    // Duration cannot be read here without decoding the file, so the server
    // rejects anything over MAX_VIDEO_SECONDS after probing it. Saying so up
    // front means a two-minute clip is not a surprise after the upload.
    return null
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
  }
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return allowVideo
      ? 'Use a JPEG, PNG or WebP image, or an MP4, MOV, WebM or AVI video.'
      : 'Images only - JPEG, PNG or WebP.'
  }
  return null
}

/**
 * XMLHttpRequest rather than fetch, for one reason: fetch cannot report upload
 * progress. There is no streaming-request support in browsers that would give a
 * percentage for a multipart body, and a progress bar that jumps 0 🠖 100 is
 * worse than none on a slow connection.
 */
function upload(path, file, altText, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData()
    body.append('file', file)
    if (altText) body.append('altText', altText)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api${path}`)
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

const json = async (path, options) => {
  const token = readToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const message = Array.isArray(detail?.message) ? detail.message.join(', ') : detail?.message
    throw new Error(message || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

export const uploadPrimary = (productId, file, altText, onProgress) =>
  upload(`/media/products/${productId}/primary`, file, altText, onProgress)

export const uploadGallery = (productId, file, altText, onProgress) =>
  upload(`/media/products/${productId}/gallery`, file, altText, onProgress)

export const clearPrimary = (productId) =>
  json(`/media/products/${productId}/primary`, { method: 'DELETE' })

export const removeGalleryImage = (productId, assetId) =>
  json(`/media/products/${productId}/gallery/${assetId}`, { method: 'DELETE' })

export const reorderGallery = (productId, assetIds) =>
  json(`/media/products/${productId}/gallery/order`, {
    method: 'PATCH',
    body: JSON.stringify({ assetIds })
  })

export const updateAltText = (assetId, altText) =>
  json(`/media/assets/${assetId}/alt`, { method: 'PATCH', body: JSON.stringify({ altText }) })
