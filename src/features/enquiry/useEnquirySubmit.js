import { useState } from 'react'
import { useSiteSettings } from '../settings/index.js'

// Failure fallback: never lose a lead to a dead endpoint - hand the buyer a
// prefilled mail draft carrying everything they already typed.
function mailtoFallback(payload, address) {
  const lines = [
    ['Name', payload.name], ['Email', payload.email],
    ['Phone', payload.phone], ['Message', payload.message]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)
  const subject = `Enquiry from ${payload.name || 'the website'}`
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

export function useEnquirySubmit() {
  // The fallback address is now the one saved in site settings rather than a
  // build-time constant, so changing it does not need a redeploy. useSiteSettings
  // returns the constant as its fallback, so this is never undefined.
  const { contactEmail } = useSiteSettings()

  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorDetail, setErrorDetail] = useState('')
  const [fallbackHref, setFallbackHref] = useState(`mailto:${contactEmail}`)

  // Both terminal states used to be permanent. After a success the button read
  // "Enquiry received" forever, so a buyer sending a second enquiry for another
  // product got no feedback that anything had happened; after a failure the
  // error stayed on screen while they corrected the field it complained about.
  // Any edit returns the form to idle.
  const resetStatus = () => setStatus(s => (s === 'success' || s === 'error' ? 'idle' : s))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    setFallbackHref(mailtoFallback(payload, contactEmail))

    // The honeypot is posted rather than dropped here. The server discards a
    // tripped submission silently and still answers 200: a bot that is told it
    // failed simply retries with the field cleared, and dropping it client-side
    // only ever caught the bots that run JavaScript.

    // No configuration check any more. The enquiry endpoint is this site's own
    // API - the same origin that serves the catalogue - so there is no
    // VITE_FORM_ENDPOINT to be unset and no third-party form provider in the
    // path. An unreachable API is a runtime failure, handled below.
    setStatus('submitting')
    setErrorDetail('')
    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => null)
        const message = Array.isArray(detail?.message) ? detail.message.join(' ') : detail?.message
        // 429 is the per-IP throttle on the public endpoint. It reads as a real
        // sentence rather than a status code, because the person seeing it is a
        // buyer, not an operator.
        if (response.status === 429) throw new Error('Too many enquiries sent from this connection. Please try again in a minute.')
        throw new Error(message || `The enquiry service responded ${response.status}.`)
      }
      setStatus('success')
      form.reset()
    } catch (error) {
      setStatus('error')
      setErrorDetail(error.message === 'Failed to fetch' ? 'Could not reach the enquiry service.' : error.message)
    }
  }

  return { status, errorDetail, fallbackHref, handleSubmit, resetStatus }
}
