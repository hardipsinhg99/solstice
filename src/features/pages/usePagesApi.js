import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../admin/useAdminAuth.js'
import { useApiResource, clearResource } from '../api/useApiResource.js'

const publicKey = (slug) => `page:${slug}`

/** Every admin write drops the public cache for that page. */
const invalidate = (slug) => { clearResource(publicKey(slug)); clearResource('team') }

export function useAdminPage(slug) {
  const [page, setPage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setPage(await apiFetch(`/pages/admin/${slug}`))
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [slug])

  useEffect(() => { setStatus('loading'); load() }, [load])
  return { page, status, error, reload: load, setPage }
}

export const saveSection = async (slug, key, data) => {
  const row = await apiFetch(`/pages/admin/${slug}/section/${key}`, {
    method: 'PATCH', body: JSON.stringify({ data })
  })
  // The draft moved, not the published copy - so the public cache is still
  // correct and is deliberately NOT dropped here. Publish drops it.
  return row
}

export const publishPage = async (slug) => {
  const page = await apiFetch(`/pages/admin/${slug}/publish`, { method: 'POST' })
  invalidate(slug)
  return page
}
export const unpublishPage = async (slug) => {
  const page = await apiFetch(`/pages/admin/${slug}/unpublish`, { method: 'POST' })
  invalidate(slug)
  return page
}
export const discardDraft = async (slug) => {
  const page = await apiFetch(`/pages/admin/${slug}/discard`, { method: 'POST' })
  invalidate(slug)
  return page
}

async function fetchPage(slug) {
  const res = await fetch(`/api/pages/${slug}`)
  if (!res.ok) throw new Error(`Page unavailable (${res.status})`)
  return res.json()
}

/**
 * Public read. Returns a `section(key)` lookup rather than the raw array,
 * because every consumer wants one section by name and none of them wants to
 * care about order or about a section that has never been published.
 */
export function usePage(slug, fallback = {}) {
  const [data, status] = useApiResource(publicKey(slug), () => fetchPage(slug), null)
  const map = {}
  for (const s of data?.sections ?? []) map[s.key] = s.data
  // Until the fetch lands - and if it fails - the caller's own copy is used, so
  // the page renders its existing wording instead of a blank frame.
  const section = (key) => map[key] ?? fallback[key] ?? {}
  return { section, status, loaded: Boolean(data) }
}
