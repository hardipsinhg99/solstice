import { useEffect, useRef, useState } from 'react'
import { useAdminEnquiries, setEnquiryStatus, deleteEnquiry } from '../../features/admin/index.js'
import { DangerConfirm } from '../../components/admin/DangerConfirm.jsx'

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Closed' }
]

const FILTERS = [{ value: '', label: 'All' }, ...STATUSES]

const chipClass = (status) =>
  status === 'NEW' ? 'admin-chip is-draft'
    : status === 'CONTACTED' ? 'admin-chip is-published'
      : 'admin-chip'

const when = (iso) => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

/**
 * A record of leads, not an inbox. Replying happens in the operator's own mail
 * client - the notification email is sent with the buyer's address as Reply-To
 * precisely so that Reply is the whole workflow. Building a send-mail UI here
 * would mean owning deliverability, threading and a sent-items store for a
 * feature the client did not ask for.
 */
export default function AdminEnquiriesPage({ highlightId }) {
  const { enquiries, status, error, reload } = useAdminEnquiries()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState('')

  // Filtering is server-side, so a debounce keeps a fast typist from firing a
  // request per keystroke. 250ms is below the threshold where the list feels
  // like it lags the input.
  useEffect(() => {
    const id = setTimeout(() => reload({ search, status: filter }), 250)
    return () => clearTimeout(id)
  }, [search, filter, reload])

  const changeStatus = async (id, next) => {
    setRowError('')
    try {
      await setEnquiryStatus(id, next)
      await reload({ search, status: filter })
    } catch (err) {
      setRowError(err.message)
    }
  }

  const confirmDelete = async () => {
    setBusy(true); setRowError('')
    try {
      await deleteEnquiry(confirming.id)
      setConfirming(null)
      await reload({ search, status: filter })
    } catch (err) {
      setRowError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Arriving from the notification bell at #admin/enquiries/<id>: bring that row
  // into view and mark it, rather than dropping the operator at the top of a
  // list and leaving them to find the enquiry they just clicked.
  const rowRefs = useRef(new Map())
  useEffect(() => {
    if (!highlightId || status !== 'ready') return
    const el = rowRefs.current.get(highlightId)
    // 'auto' respects the reduced-motion backstop; the page's smooth scrolling
    // is a CSS declaration this deliberately does not fight.
    el?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [highlightId, status, enquiries])

  const newCount = enquiries.filter((e) => e.status === 'NEW').length

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">Enquiries</h2>
          <p className="admin-meta">
            {enquiries.length} shown{newCount > 0 && `, ${newCount} not yet contacted`}. Newest first.
          </p>
        </div>
      </header>

      <div className="admin-head-actions">
        <label className="admin-search">
          <span className="admin-visually-hidden">Search enquiries by name, email or message</span>
          <input
            type="search" placeholder="Search enquiries…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="admin-field admin-filter">
          <span className="admin-visually-hidden">Filter by status</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
      </div>

      {rowError && <p className="admin-error" role="alert">{rowError}</p>}

      {status === 'loading' && <p className="admin-skeleton" role="status">Loading enquiries…</p>}

      {status === 'error' && (
        <div className="admin-danger-panel" role="alert">
          <h3>Could not load enquiries</h3>
          <p>{error}</p>
          <button className="admin-btn" onClick={() => reload({ search, status: filter })}>Try again</button>
        </div>
      )}

      {status === 'ready' && enquiries.length === 0 && (
        <div className="admin-empty">
          <h3>{search || filter ? 'No enquiries match' : 'No enquiries yet'}</h3>
          <p>
            {search || filter
              ? 'Clear the search and filter to see everything received.'
              : 'Enquiries sent through the contact form appear here the moment they are received.'}
          </p>
        </div>
      )}

      {status === 'ready' && enquiries.length > 0 && (
        <table className="admin-table">
          <caption className="admin-visually-hidden">Enquiries received, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Received</th>
              <th scope="col">Buyer</th>
              <th scope="col">Enquiry</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="admin-visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((e) => (
              <tr
                key={e.id}
                ref={(node) => { node ? rowRefs.current.set(e.id, node) : rowRefs.current.delete(e.id) }}
                className={e.id === highlightId ? 'is-highlighted' : undefined}
              >
                <td>
                  {when(e.createdAt)}
                  {/* Null notifiedAt is the state worth being able to see: the
                      lead arrived but nobody was emailed about it. */}
                  {!e.notifiedAt && <span className="admin-meta">Not emailed</span>}
                </td>
                <td>
                  <strong>{e.name}</strong>
                  <span className="admin-meta">
                    <a className="admin-link" href={`mailto:${e.email}`}>{e.email}</a>
                  </span>
                  <span className="admin-meta">
                    <a className="admin-link" href={`tel:${e.phone.replace(/[^\d+]/g, '')}`}>{e.phone}</a>
                  </span>
                </td>
                <td>
                  <p className="admin-enquiry-message">{e.message}</p>
                  {e.consentAt && <span className="admin-meta">Consent given {when(e.consentAt)}</span>}
                </td>
                <td>
                  <span className={chipClass(e.status)}>
                    {STATUSES.find((s) => s.value === e.status)?.label ?? e.status}
                  </span>
                  {/* The chip states where the enquiry is; the select only offers
                      where it can go next. A select that also displays the current
                      value would print the same word twice in one cell. */}
                  <label className="admin-field admin-status-set">
                    <span className="admin-visually-hidden">Change status for the enquiry from {e.name}</span>
                    <select value="" onChange={(ev) => changeStatus(e.id, ev.target.value)}>
                      <option value="" disabled>Move to…</option>
                      {STATUSES.filter((s) => s.value !== e.status)
                        .map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </label>
                </td>
                <td className="admin-row-actions">
                  <button
                    className="admin-btn admin-btn-danger-quiet"
                    onClick={() => { setConfirming(e); setRowError('') }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirming && (
        <DangerConfirm
          title={`Delete the enquiry from “${confirming.name}”?`}
          body={`This permanently removes the enquiry received ${when(confirming.createdAt)}, including ${confirming.email} and the message. There is no other copy in the admin - only the notification email that was sent. It cannot be undone.`}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          busy={busy} error={rowError}
          onCancel={() => setConfirming(null)} onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}
