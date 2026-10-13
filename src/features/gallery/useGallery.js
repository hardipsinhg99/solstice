import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../admin/useAdminAuth.js'
import { xhrUpload } from '../admin/useMediaAssets.js'
import { useApiResource, clearResource } from '../api/useApiResource.js'

// The gallery holds more images than a product does - it is the one place a
// larger set is the point. Mirrored from server/src/gallery/gallery.service.ts;
// the server enforces it independently and is the authority.
export const MAX_GALLERY_IMAGES = 24

/**
 * Upload goes through the SAME multipart shape the product media manager uses,
 * against /api/gallery, with progress - see xhrUpload.
 */
function upload(file, { caption, altText }, onProgress) {
  const body = new FormData()
  body.append('file', file)
  if (caption) body.append('caption', caption)
  if (altText) body.append('altText', altText)
  return xhrUpload('/api/gallery', body, onProgress)
}

const PUBLIC_KEY = 'gallery'

/** Every admin write drops the public cache, so the live page reflects it. */
const invalidate = () => clearResource(PUBLIC_KEY)

export const uploadGalleryImage = async (file, meta, onProgress) => {
  const row = await upload(file, meta, onProgress)
  invalidate()
  return row
}

export const updateGalleryImage = async (id, body) => {
  const row = await apiFetch(`/gallery/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  invalidate()
  return row
}

export const reorderGallery = async (ids) => {
  const rows = await apiFetch('/gallery/order', { method: 'PATCH', body: JSON.stringify({ ids }) })
  invalidate()
  return rows
}

export const deleteGalleryImage = async (id) => {
  const result = await apiFetch(`/gallery/${id}`, { method: 'DELETE' })
  invalidate()
  return result
}

/** Admin list. Three states, same shape as useAdminProducts. */
export function useAdminGallery() {
  const [images, setImages] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setImages(await apiFetch('/gallery/admin'))
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { images, status, error, reload: load, setImages }
}

async function fetchPublicGallery() {
  const response = await fetch('/api/gallery')
  if (!response.ok) throw new Error(`Gallery unavailable (${response.status})`)
  return response.json()
}

/** Public read, through the shared keyed cache - the third consumer of it. */
export function usePublicGallery() {
  return useApiResource(PUBLIC_KEY, fetchPublicGallery, [])
}
