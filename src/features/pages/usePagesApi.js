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
// Plain fetch, not apiFetch: this is a PUBLIC endpoint and apiFetch attaches
// the admin bearer token. A visitor has no token, and the nav must work for
// them.
async function fetchPageList() {
  const res = await fetch('/api/pages')
  if (!res.ok) throw new Error(`Page list unavailable (${res.status})`)
  return res.json()
}

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

  // THREE states, not two. This is the same collapse Phase 1e found on
  // ProductDetailPage: "no data" meant both "still fetching" and "does not
  // exist", so one code path served both and the wrong one won.
  //
  //   loading      - fetch in flight. Render the fallback; that is what it is for.
  //   ready + data - the page exists and is published.
  //   ready + null - findPublic said no. The page is UNPUBLISHED.
  //   error        - the network failed. Render the fallback, NOT a not-found
  //                  state: an unreachable API is not a statement about whether
  //                  the page exists, and telling a buyer the page is gone
  //                  because their wifi dropped is worse than showing stale copy.
  //
  // The error case is why this is not simply `status !== 'loading' && !data` -
  // that version reported every failed fetch as an unpublished page.
  const state = status === 'error' ? 'error' : status === 'loading' ? 'loading' : data ? 'ready' : 'unpublished'
  const missing = state === 'unpublished'

  return { section, shows, status, state, loaded: Boolean(data), missing }
}

/**
 * Which CMS pages are currently published.
 *
 * The nav used to be a hand-maintained list with no relationship to publish
 * state, so unpublishing a page left its link in the header pointing at a page
 * that no longer rendered. Two places to remember instead of one, and the
 * second was always going to be forgotten.
 *
 * Fails OPEN: until the fetch lands, and if it fails, every item stays visible.
 * A nav that empties itself because the API blinked is far worse than one that
 * briefly shows a link to an unpublished page - and that link now lands on the
 * not-available state rather than a broken route, so the failure is contained.
 */
export function usePublishedPages() {
  const [data, status] = useApiResource('pages:list', fetchPageList, null)
  const slugs = data?.slugs ?? null
  return {
    slugs,
    status,
    isPublished: (slug) => (slugs === null ? true : slugs.includes(slug))
  }
}
