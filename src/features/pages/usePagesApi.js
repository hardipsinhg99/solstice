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

export const saveSection = async (slug, key, data, visible) => {
  const row = await apiFetch(`/pages/admin/${slug}/section/${key}`, {
    // `visible` is omitted rather than sent as undefined when it is not being
    // changed: the server treats an absent field as "leave it alone".
    method: 'PATCH',
    body: JSON.stringify(visible === undefined ? { data } : { data, visible })
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

  // Presence, which is NOT the same question as content. findPublic omits a
  // hidden section entirely, so absence from `map` is how the server says
  // "hidden" - but `section()` would quietly substitute the fallback and render
  // it anyway. Callers that must not mount a hidden section ask this instead.
  //
  // Before the fetch lands it answers from the fallback rather than defaulting
  // to true: a section with no fallback entry stays unmounted until the server
  // has actually confirmed it, which is what keeps a hidden section from
  // mounting for one frame and firing off its image requests.
  const shows = (key) => (data ? key in map : key in fallback)

  // Page-level availability, as opposed to section-level presence.
  //
  // findPublic returns null for a page whose status is not PUBLISHED, but
  // section() would then quietly substitute the caller's static fallback and
  // render the page anyway - so unpublishing a page in the admin changed
  // nothing on the public site. `missing` is true only once the fetch has
  // COMPLETED and produced no page, so a slow network never flashes a
  // not-found state at someone.
  const missing = status !== 'loading' && !data

  return { section, shows, status, loaded: Boolean(data), missing }
}
