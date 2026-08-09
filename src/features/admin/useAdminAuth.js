import { useCallback, useEffect, useState } from 'react'

// Token lives in sessionStorage, not localStorage: it dies with the tab, which
// is the right default for an admin session on a shared laptop. Phase 1a has no
// refresh rotation by design (docs/admin-cms-blueprint.md) - an 8h expiry then a
// re-login is the accepted trade, so the only job here is to notice expiry and
// send the operator back to the login screen rather than fail silently.
const TOKEN_KEY = 'solstice_admin_token'

export const readToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}
const writeToken = (token) => {
  try { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY) } catch { /* storage blocked */ }
}

/** Thrown for a 401 so callers can distinguish "logged out" from "server down". */
export class AuthExpiredError extends Error {
  constructor() { super('Session expired'); this.name = 'AuthExpiredError' }
}

export async function apiFetch(path, options = {}) {
  const token = readToken()
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  if (response.status === 401) { writeToken(null); throw new AuthExpiredError() }
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    const message = Array.isArray(detail?.message) ? detail.message.join(', ') : detail?.message
    throw new Error(message || `Request failed (${response.status})`)
  }
  return response.status === 204 ? null : response.json()
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState(null)
  // 'checking' until the stored token has been validated against the server, so
  // the guard never flashes the login screen at an already-authenticated user.
  const [state, setState] = useState('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!readToken()) { setState('anonymous'); return }
    apiFetch('/auth/me')
      .then((me) => { if (!cancelled) { setAdmin(me); setState('authenticated') } })
      .catch(() => { if (!cancelled) { setAdmin(null); setState('anonymous') } })
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email, password) => {
    setError('')
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      writeToken(result.accessToken)
      setAdmin(result.admin)
      setState('authenticated')
      return true
    } catch (err) {
      // A 401 here means bad credentials, not an expired session - the generic
      // message is deliberate, so a wrong email and a wrong password read alike.
      setError(err instanceof AuthExpiredError ? 'Invalid email or password' : err.message)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    writeToken(null)
    setAdmin(null)
    setState('anonymous')
  }, [])

  return { admin, state, error, login, logout }
}
