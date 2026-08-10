import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './useAdminAuth.js'

/**
 * One request for the whole admin shell: the stat cards, the bell and the
 * activity list arrive together because they paint together.
 *
 * Not useApiResource: that hook is the cache for PUBLIC, rarely-changing GETs
 * where serving a stale value to a second consumer is the point. These are
 * counts an operator is watching for change, and caching them across route
 * changes would show a bell badge of 2 after the third enquiry arrived.
 */
export function useDashboard() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await apiFetch('/dashboard'))
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, status, error, reload: load }
}
