import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './useAdminAuth.js'

/**
 * Same three-state shape as useAdminProducts. Unlike products, the list is
 * fetched with the server's filters rather than filtered in memory: enquiries
 * only ever grow, and a lead list is the one table on this site that will not
 * stay small.
 */
export function useAdminEnquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const load = useCallback(async ({ search = '', status: filter = '' } = {}) => {
    setStatus('loading')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter) params.set('status', filter)
      const query = params.toString()
      setEnquiries(await apiFetch(`/enquiries${query ? `?${query}` : ''}`))
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { enquiries, status, error, reload: load }
}

export const setEnquiryStatus = (id, status) =>
  apiFetch(`/enquiries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const deleteEnquiry = (id) => apiFetch(`/enquiries/${id}`, { method: 'DELETE' })
