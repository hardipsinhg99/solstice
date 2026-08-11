import { useCallback, useEffect, useState } from 'react'
import { apiFetch, readToken } from '../admin/useAdminAuth.js'
import { useApiResource, clearResource } from '../api/useApiResource.js'

const KEY = 'team'
const invalidate = () => clearResource(KEY)

export function useAdminTeam() {
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setMembers(await apiFetch('/team/admin'))
      setStatus('ready')
    } catch (err) { setError(err.message); setStatus('error') }
  }, [])

  useEffect(() => { load() }, [load])
  return { members, status, error, reload: load, setMembers }
}

const write = async (path, options) => {
  const result = await apiFetch(path, options)
  invalidate()
  return result
}

export const createMember = (body) => write('/team', { method: 'POST', body: JSON.stringify(body) })
export const updateMember = (id, body) => write(`/team/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const removeMember = (id) => write(`/team/${id}`, { method: 'DELETE' })
export const reorderMembers = (ids) => write('/team/order', { method: 'PATCH', body: JSON.stringify({ ids }) })
export const clearMemberPhoto = (id) => write(`/team/${id}/photo`, { method: 'DELETE' })

/** Photo upload needs multipart, so it does not go through apiFetch's JSON path. */
export async function setMemberPhoto(id, file, altText) {
  const body = new FormData()
  body.append('file', file)
  if (altText) body.append('altText', altText)
  const token = readToken()
  const res = await fetch(`/api/team/${id}/photo`, {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const message = Array.isArray(detail?.message) ? detail.message.join(', ') : detail?.message
    throw new Error(message || `Upload failed (${res.status})`)
  }
  invalidate()
  return res.json()
}

const fetchTeam = async () => {
  const res = await fetch('/api/team')
  if (!res.ok) throw new Error(`Team unavailable (${res.status})`)
  return res.json()
}

export function usePublicTeam() {
  return useApiResource(KEY, fetchTeam, [])
}
