import { useEffect, useState } from 'react'
import { AdminFooterSocial } from './AdminFooterSocial.jsx'
import { getSettings, updateSettings } from '../../features/admin/index.js'
import { isUsableWhatsappNumber, whatsappHref } from '../../features/settings/index.js'

const EMPTY = { whatsappNumber: '', whatsappMessage: '', contactEmail: '', contactPhone: '', contactEmailEnabled: true, contactPhoneEnabled: true, contactEmailLabel: '', contactPhoneLabel: '', translateEnabled: true }

/**
 * One record, so one form and one Save - no list, no create, no delete.
 *
 * The fields are named columns rather than rows in a key/value table. That is a
 * deliberate reversal of the pattern audited in the PRIM AI blueprint, where a
 * hundred-plus ungrouped key/value rows were the problem: named columns mean the
 * API validates a WhatsApp number as a WhatsApp number, and this form can label
 * it in the operator's language instead of showing them a key.
 */
export default function AdminSettingsPage() {
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((row) => {
        if (cancelled) return
        setForm({
          whatsappNumber: row.whatsappNumber ?? '',
          whatsappMessage: row.whatsappMessage ?? '',
          contactEmail: row.contactEmail ?? '',
          contactPhone: row.contactPhone ?? '',
          contactEmailLabel: row.contactEmailLabel ?? '',
          contactPhoneLabel: row.contactPhoneLabel ?? '',
          // Only an explicit false turns it off, so a row saved before these
          // columns existed reads as enabled rather than silently hiding the
          // widget on the live site.
          contactEmailEnabled: row.contactEmailEnabled !== false,
          contactPhoneEnabled: row.contactPhoneEnabled !== false,
          translateEnabled: row.translateEnabled !== false
        })
        setUpdatedAt(row.updatedAt)
        setState('ready')
      })
      .catch((err) => { if (!cancelled) { setLoadError(err.message); setState('error') } })
    return () => { cancelled = true }
  }, [])

  // Any edit clears the terminal states, so "Saved" never lingers over a form
  // that has since been changed - the same rule the public enquiry form follows.
  const set = (key) => (event) => {
    setForm((f) => ({ ...f, [key]: event.target.value }))
    setSaved(false); setSaveError('')
  }

  // Client-side check mirrors the server's regex exactly. It is a courtesy, not
  // the guard: the server rejects the same values independently.
  const numberValid = isUsableWhatsappNumber(form.whatsappNumber)
  const numberTouched = form.whatsappNumber !== ''

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      const row = await updateSettings(form)
      setUpdatedAt(row.updatedAt)
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (state === 'loading') {
    return <p className="admin-skeleton" role="status">Loading settings…</p>
  }

  if (state === 'error') {
    return (
      <div className="admin-danger-panel" role="alert">
        <h3>Could not load settings</h3>
        <p>{loadError}</p>
      </div>
    )
  }

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">Site settings</h2>
          <p className="admin-meta">
            The contact details the public site reads at runtime.
            {updatedAt && ` Last saved ${new Date(updatedAt).toLocaleString()}.`}
          </p>
        </div>
      </header>

      <form onSubmit={submit} noValidate>
        <fieldset className="admin-fieldset">
          <legend>WhatsApp</legend>

          <label className="admin-field">
            <span>WhatsApp number</span>
            <input
              type="text" inputMode="numeric" value={form.whatsappNumber}
              onChange={set('whatsappNumber')}
              aria-describedby="wa-number-hint"
              aria-invalid={numberTouched && !numberValid ? 'true' : undefined}
            />
            <span className="admin-hint" id="wa-number-hint">
              Digits only, in international format - no “+”, spaces, dashes or brackets.
              India example: 919876543210. wa.me does not report a malformed number as an
              error; it silently tells the buyer the number is invalid, so this is checked here.
            </span>
          </label>

          {numberTouched && !numberValid && (
            <p className="admin-error" role="alert">
              That is not a usable WhatsApp number. Use 8–15 digits with the country code and
              no leading zero.
            </p>
          )}

          <label className="admin-field">
            <span>Pre-filled message</span>
            <textarea rows={3} value={form.whatsappMessage} onChange={set('whatsappMessage')}
                      aria-describedby="wa-message-hint"/>
            <span className="admin-hint" id="wa-message-hint">
              What the buyer’s WhatsApp composer opens with. Write it as plain prose -
              it is URL-encoded automatically, so apostrophes and accents are safe.
            </span>
          </label>

          {/* The link the buyer actually gets, built by the same helper the public
              FAB uses. Reading the encoded URL back is the fastest way to catch a
              wrong country code before it ships. */}
          {numberValid && (
            <p className="admin-hint">
              Buyers will open:{' '}
              <a href={whatsappHref(form)} target="_blank" rel="noopener noreferrer">
                {whatsappHref(form)}
              </a>
            </p>
          )}
        </fieldset>

        <fieldset className="admin-fieldset" style={{ marginTop: 20 }}>
          <legend>Contact</legend>
          <label className="admin-field">
            <span>Public enquiry email</span>
            <input type="email" value={form.contactEmail} onChange={set('contactEmail')}
                   aria-describedby="email-hint"/>
            <span className="admin-hint" id="email-hint">
              Shown in the footer and on the contact page, and used as the address the enquiry
              form falls back to if the API cannot be reached.
            </span>
          </label>
          <label className="admin-field">
            <span>Email label (optional)</span>
            <input value={form.contactEmailLabel} onChange={set('contactEmailLabel')} placeholder="e.g. Sales"/>
          </label>
          <label className="admin-toggle-row">
            <input type="checkbox" checked={form.contactEmailEnabled}
                   onChange={(e) => setForm((f) => ({ ...f, contactEmailEnabled: e.target.checked }))}/>
            <span>Show the email in the footer</span>
          </label>

          <label className="admin-field">
            <span>Public phone number</span>
            <input type="tel" value={form.contactPhone} onChange={set('contactPhone')}
                   placeholder="+91 90813 66630" aria-describedby="phone-hint"/>
            <span className="admin-hint" id="phone-hint">
              Shown on the contact page below the email, and in the footer. Write it the way you
              want it read - the spacing is kept. Include the country code, since the people
              reading it are dialling from abroad. Leave empty to show no phone number at all.
            </span>
          </label>
          <label className="admin-field">
            <span>Phone label (optional)</span>
            <input value={form.contactPhoneLabel} onChange={set('contactPhoneLabel')} placeholder="e.g. Head office"/>
          </label>
          {/* Switching off HIDES the number; it does not erase it. That is why
              this is a toggle and not "clear the field". */}
          <label className="admin-toggle-row">
            <input type="checkbox" checked={form.contactPhoneEnabled}
                   onChange={(e) => setForm((f) => ({ ...f, contactPhoneEnabled: e.target.checked }))}/>
            <span>Show the phone number in the footer</span>
          </label>
        </fieldset>

        <div className="admin-head-actions" style={{ marginTop: 20 }}>
          <button className="admin-btn admin-btn-primary" type="submit"
                  disabled={saving || (numberTouched && !numberValid)}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <p className="admin-live" role="status" aria-live="polite">
            {saved && <span className="admin-saved">Saved. The public site picks this up immediately.</span>}
          </p>
        </div>

        {saveError && <p className="admin-error" role="alert">{saveError}</p>}
        {/* A native checkbox: focusable, space-toggleable and announced as a
            checkbox without any ARIA. The help text says what OFF actually does,
            because "hidden" and "never loaded" are materially different for a
            third-party script. */}
        <label className="admin-field admin-field-toggle">
          <span className="admin-toggle-row">
            <input
              type="checkbox"
              checked={form.translateEnabled}
              onChange={(e) => setForm((f) => ({ ...f, translateEnabled: e.target.checked }))}
            />
            <span>Show the language selector</span>
          </span>
          <span className="admin-hint">
            Google Translate in the site header. Off removes it entirely - the
            script is never loaded, so no request is made to translate.google.com
            and no gap is left in the navbar.
          </span>
        </label>

      </form>

      {/* Outside the <form> on purpose: each social row saves itself, so it must
          not be submitted by the settings Save button - one button writing to two
          tables with two failure modes is how a half-saved screen happens. */}
      <AdminFooterSocial/>
    </section>
  )
}
