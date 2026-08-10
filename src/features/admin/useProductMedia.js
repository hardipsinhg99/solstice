import { readToken } from './useAdminAuth.js'

// Upload limits mirrored from server/src/media/media.constants.ts. Duplicated on
// purpose: the client pre-check exists so a buyer's 12MB phone photo fails in
// under a second instead of after a 12MB round trip. The server enforces the
// same numbers independently and is the authority - this copy is a courtesy,
// never a control.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 6
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function preflight(file) {
  if (!file) return 'No file selected.'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
  }
  // A hint only. The browser's type comes from the file extension, which is why
  // the server reads magic bytes and does not trust this.
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    return 'Images only — JPEG, PNG or WebP.'
  }
  return null
}

/**
 * XMLHttpRequest rather than fetch, for one reason: fetch cannot report upload
 * progress. There is no streaming-request support in browsers that would give a
 * percentage for a multipart body, and a progress bar that jumps 0 → 100 is
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
    xhr.addEventListener('error', () => reject(new Error('Upload failed — could not reach the server.')))
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
