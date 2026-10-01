import { useEffect, useState } from 'react'
import { apiFetch } from '../../../features/admin/index.js'

/**
 * Whether search engines are seeing what the editor just published.
 *
 * Publishing asks for a rebuild of the static HTML and returns at once - the
 * rebuild runs in the background and takes under a minute. Without this line
 * a failed rebuild would be silent: the live site shows the edit (it renders
 * from the API), so nothing on screen would suggest crawlers are still being
 * served the old copy.
 *
 * Polls while mounted because the state it reports changes on its own, after
 * the click that caused it.
 */
const POLL_MS = 15_000
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

export function PrerenderStatus ({ refreshKey }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () => apiFetch('/prerender/status')
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch(() => { /* an unreachable status is not worth an error banner */ })
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [refreshKey])

  if (!status) return null
  const built = status.lastSuccess?.finishedAt

  if (status.failing) {
    return (
      <p className="admin-error" role="alert">
        The search-engine copy could not be rebuilt ({time(status.last?.finishedAt)}). Visitors see
        your changes; search engines still see the version from {built ? time(built) : 'before this'}.
        It retries automatically every few minutes.
      </p>
    )
  }
  if (status.stale) {
    return <p className="admin-hint" role="status">Updating the search-engine copy — usually under a minute.</p>
  }
  if (!built) {
    return <p className="admin-hint" role="status">The search-engine copy has not been built yet.</p>
  }
  return <p className="admin-hint" role="status">Search-engine copy up to date (built {time(built)}).</p>
}
