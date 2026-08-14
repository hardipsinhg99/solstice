import { Icon } from '../../components/ui/Icon.jsx'
import { goTo } from '../../app/router.js'

const when = (iso) => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
})

// Audit actions are stored as machine strings. Reading them back as English is a
// display concern, so the mapping lives here rather than in the database.
const ACTIONS = {
  created: 'created', updated: 'updated', deleted: 'deleted',
  'status.published': 'published', 'status.draft': 'moved to draft',
  'status.new': 'reopened', 'status.contacted': 'marked contacted', 'status.closed': 'closed',
  'image.primary.set': 'set the main image on', 'image.primary.cleared': 'removed the main image from',
  'image.gallery.added': 'added an image to', 'image.gallery.removed': 'removed an image from',
  'image.gallery.reordered': 'reordered the images on',
  'gallery.added': 'added a gallery image', 'gallery.updated': 'edited a gallery image',
  'gallery.deleted': 'deleted a gallery image', 'gallery.reordered': 'reordered the gallery',
  'page.section.saved': 'saved a draft section on', 'page.draft.discarded': 'discarded the draft of',
  'team.added': 'added to the team', 'team.updated': 'edited', 'team.removed': 'removed from the team',
  'team.reordered': 'reordered the team', 'team.photo.set': 'added a photograph of',
  'team.photo.cleared': 'removed the photograph of'
}

/**
 * Four cards, every one a count query. The reference mockup's fourth card was
 * "Exports This Month" - nothing in this schema records an export, a shipment
 * or a dispatch, so that number could only have been invented. Open Enquiries
 * replaces it: leads not yet closed, which is the one figure here that means
 * "work waiting for you".
 */
function StatCard({ icon, tone, label, value, note, onClick }) {
  const body = (
    <>
      <span className={`admin-stat-icon is-${tone}`} aria-hidden="true"><Icon name={icon} size={20}/></span>
      <span className="admin-stat-body">
        <span className="admin-stat-label">{label}</span>
        <strong className="admin-stat-value">{value}</strong>
        <span className="admin-meta">{note}</span>
      </span>
    </>
  )
  // A card that navigates is a button; a card that does not is not. Making all
  // four look clickable when two are not is the kind of thing that teaches an
  // operator to stop trusting the interface.
  return onClick
    ? <button type="button" className="admin-stat is-actionable" onClick={onClick}>{body}</button>
    : <div className="admin-stat">{body}</div>
}

export default function AdminDashboardPage({ dashboard }) {
  const { data, status, error, reload } = dashboard

  if (status === 'loading') return <p className="admin-skeleton" role="status">Loading dashboard…</p>

  if (status === 'error') {
    return (
      <div className="admin-danger-panel" role="alert">
        <h3>Could not load the dashboard</h3>
        <p>{error}</p>
        <button className="admin-btn" onClick={reload}>Try again</button>
      </div>
    )
  }

  const { stats, activity, placeholderSettings = [], unresolvedPageSections = [] } = data

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">Overview</h2>
          <p className="admin-meta">Everything below is a live count, read straight from the database.</p>
        </div>
        <button className="admin-btn" onClick={reload}>Refresh</button>
      </header>

      <div className="admin-stats">
        <StatCard
          icon="box" tone="neutral" label="Total products" value={stats.totalProducts}
          note="In the catalogue" onClick={() => goTo('admin/products')}
        />
        <StatCard
          icon="check" tone="good" label="Published" value={stats.publishedProducts}
          note={stats.publishedProducts === stats.totalProducts ? 'All of them are live' : `${stats.totalProducts - stats.publishedProducts} still draft`}
        />
        <StatCard
          icon="award" tone={stats.unverifiedProducts > 0 ? 'warn' : 'good'}
          label="Unverified claims" value={stats.unverifiedProducts}
          note={stats.unverifiedProducts > 0 ? 'Certification with no reference' : 'Every claim has a reference'}
          onClick={() => goTo('admin/products')}
        />
        <StatCard
          icon="mail" tone={stats.openEnquiries > 0 ? 'info' : 'neutral'}
          label="Open enquiries" value={stats.openEnquiries}
          note={stats.newEnquiries > 0 ? `${stats.newEnquiries} not yet contacted` : 'Nothing waiting'}
          onClick={() => goTo('admin/enquiries')}
        />
      </div>

      {/* The certification count is the one number here that is a liability
          rather than a statistic, so it gets a sentence, not just a card. */}
      {stats.unverifiedProducts > 0 && (
        <div className="admin-danger-panel" role="note">
          <h3>{stats.unverifiedProducts} {stats.unverifiedProducts === 1 ? 'product carries' : 'products carry'} an unverifiable certification claim</h3>
          <p>
            A certification claimed without a producible certificate reference is a legal exposure in
            several destination markets, not a cosmetic gap. Open a product and add the reference, or
            remove the claim.
          </p>
        </div>
      )}

      {/* Same component, same reasoning: a bracketed placeholder that reaches a
          public control is not a cosmetic gap either - it is the WhatsApp FAB
          opening "[WHATSAPP_NUMBER]" on a buyer's phone. This is what makes
          that silent long before a buyer ever finds it. */}
      {placeholderSettings.length > 0 && (
        <div className="admin-danger-panel" role="note">
          <h3>
            {placeholderSettings.length} {placeholderSettings.length === 1 ? 'setting still contains' : 'settings still contain'} a placeholder value
          </h3>
          <p>Not yet configured, so the matching public control renders nothing until it is:</p>
          <ul>
            {placeholderSettings.map((f) => <li key={f.field}>{f.label}</li>)}
          </ul>
          <button className="admin-btn" onClick={() => goTo('admin/settings')}>Open settings</button>
        </div>
      )}

      {unresolvedPageSections.length > 0 && (() => {
        const count = unresolvedPageSections.reduce((n, p) => n + p.sections.length, 0)
        return (
          <div className="admin-danger-panel" role="note">
            <h3>{count} live section{count === 1 ? '' : 's'} {count === 1 ? 'carries' : 'carry'} placeholder copy</h3>
            <p>Flagged draft or unverified wording that is currently live on the public site:</p>
            <ul>
              {unresolvedPageSections.map((p) => (
                <li key={p.slug}>
                  <button className="admin-btn" onClick={() => goTo(`admin/page-${p.slug}`)}>
                    {p.title} - {p.sections.join(', ')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      <section aria-labelledby="activity-heading">
        <h3 className="admin-section-heading" id="activity-heading">Recent activity</h3>
        {activity.length === 0 ? (
          <div className="admin-empty">
            <h3>Nothing recorded yet</h3>
            <p>Edits made in this panel are logged here.</p>
          </div>
        ) : (
          <ul className="admin-activity">
            {activity.map((a) => (
              <li key={a.id}>
                <span className="admin-activity-what">
                  <strong>{a.actor ?? 'Someone'}</strong>{' '}
                  {ACTIONS[a.action] ?? a.action.replace(/[._]/g, ' ')}
                  {a.summary && <> - <em>{a.summary}</em></>}
                </span>
                <span className="admin-meta">{when(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
