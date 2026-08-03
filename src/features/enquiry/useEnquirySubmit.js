import { useState } from 'react'
import { ENQUIRY_EMAIL, FORM_ENDPOINT, FORM_ACCESS_KEY } from '../../lib/constants.js'

// Failure fallback: never lose a lead to a dead endpoint - hand the buyer a
// prefilled mail draft carrying everything they already typed.
function mailtoFallback(payload) {
  const lines = [
    ['Name', payload.name], ['Email', payload.email], ['Phone', payload.phone],
    ['Company / market', payload.company], ['Product', payload.product],
    ['Quantity', [payload.quantity, payload.quantity_unit].filter(Boolean).join(' ')],
    ['Destination', payload.destination], ['Incoterm', payload.incoterm],
    ['Frequency', payload.frequency], ['Message', payload.message]
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`)
  const subject = `Enquiry - ${payload.product || 'general'}${payload.company ? ` - ${payload.company}` : ''}`
  return `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

export function useEnquirySubmit() {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorDetail, setErrorDetail] = useState('')
  const [fallbackHref, setFallbackHref] = useState(`mailto:${ENQUIRY_EMAIL}`)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    if (payload.company_website) return // honeypot tripped - drop silently
    delete payload.company_website
    setFallbackHref(mailtoFallback(payload))

    if (!FORM_ENDPOINT) {
      setStatus('error')
      setErrorDetail('The enquiry endpoint is not configured (VITE_FORM_ENDPOINT is unset).')
      return
    }

    setStatus('submitting')
    setErrorDetail('')
    try {
      if (FORM_ACCESS_KEY) payload.access_key = FORM_ACCESS_KEY
      payload.subject = `New enquiry: ${payload.product || 'general'}${payload.company ? ` - ${payload.company}` : ''}`
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(`The enquiry service responded ${response.status}.`)
      setStatus('success')
      form.reset()
    } catch (error) {
      setStatus('error')
      setErrorDetail(error.message === 'Failed to fetch' ? 'Could not reach the enquiry service.' : error.message)
    }
  }

  return { status, errorDetail, fallbackHref, handleSubmit }
}
