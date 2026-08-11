import { useEffect, useState } from 'react'
import { PAGE_CONFIG, useAdminPage, saveSection, publishPage, unpublishPage, discardDraft } from '../../features/pages/index.js'
import { Field } from '../../components/admin/SectionFields.jsx'
import { DangerConfirm } from '../../components/admin/DangerConfirm.jsx'
import { TeamMembersManager } from './sections/TeamMembersManager.jsx'
import { goTo } from '../../app/router.js'

/**
 * ONE editor for every page, parametrized by slug and the section config in
 * features/pages/sectionTypes.js.
 *
 * Three near-identical AdminHomePage / AdminAboutPage / AdminTeamPage files
 * would have been the same mistake useProductCatalogue made before it became
 * useApiResource - and it was caught and fixed once already in this project.
 * Adding Services later is a config entry and a seed row, not a new file.
 *
 * Draft and published are genuinely separate, which is what makes the publish
 * step mean something. Saving writes draftData; the public site reads
 * publishedData; Publish copies one onto the other. An unpublished edit is not
 * hidden by the UI - it is not in the public response at all.
 */
export default function AdminPageEditor({ slug }) {
  const config = PAGE_CONFIG[slug]
  const { page, status, error, reload } = useAdminPage(slug)
  const [drafts, setDrafts] = useState({})
  const [savingKey, setSavingKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(null)

  // Seed the local editing copy from the server's draft. Keyed by section, so
  // saving one section never discards unsaved work in another.
  useEffect(() => {
    if (!page) return
    setDrafts(Object.fromEntries(page.sections.map((s) => [s.key, s.draftData ?? {}])))
  }, [page])

  if (!config) return <p className="admin-error" role="alert">No editor is configured for “{slug}”.</p>
  if (status === 'loading') return <p className="admin-skeleton" role="status">Loading {config.title}…</p>
  if (status === 'error') {
    return (
      <div className="admin-danger-panel" role="alert">
        <h3>Could not load {config.title}</h3>
        <p>{error}</p>
        <button className="admin-btn" onClick={reload}>Try again</button>
      </div>
    )
  }

  const sectionRow = (key) => page.sections.find((s) => s.key === key)
  const isDirty = (key) => JSON.stringify(drafts[key]) !== JSON.stringify(sectionRow(key)?.draftData ?? {})
  const pendingPublish = page.sections.filter((s) => s.hasUnpublishedChanges).length
  const unsaved = config.sections.filter((s) => !s.managed && isDirty(s.key)).length

  const save = async (key) => {
    setSavingKey(key); setActionError(''); setSavedKey('')
    try {
      await saveSection(slug, key, drafts[key])
      await reload()
      setSavedKey(key)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSavingKey('')
    }
  }

  const run = async (fn) => {
    setBusy(true); setActionError('')
    try { await fn(); await reload() } catch (err) { setActionError(err.message) } finally { setBusy(false) }
  }

  const published = page.status === 'PUBLISHED'

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">{config.title}</h2>
          <p className="admin-meta">
            <span className={published ? 'admin-chip is-published' : 'admin-chip is-draft'}>
              {published ? 'Published' : 'Not published'}
            </span>
            {' '}
            {pendingPublish > 0
              ? `${pendingPublish} section${pendingPublish === 1 ? '' : 's'} changed since the last publish.`
              : 'Everything saved here is live.'}
          </p>
        </div>
        <div className="admin-head-actions">
          <button className="admin-btn" onClick={() => goTo(config.route)}>View page</button>
          {pendingPublish > 0 && (
            <button className="admin-btn" disabled={busy}
                    onClick={() => setConfirming({ kind: 'discard' })}>Discard changes</button>
          )}
          <button className="admin-btn admin-btn-primary" disabled={busy || unsaved > 0}
                  onClick={() => run(() => publishPage(slug))}>
            {busy ? 'Working…' : 'Publish page'}
          </button>
        </div>
      </header>

      {/* Publishing with unsaved section edits on screen would silently ship the
          previous wording. The button is disabled and the reason is stated. */}
      {unsaved > 0 && (
        <p className="admin-hint" role="status">
          {unsaved} section{unsaved === 1 ? ' has' : 's have'} unsaved edits. Save
          {unsaved === 1 ? ' it' : ' them'} before publishing.
        </p>
      )}

      {actionError && <p className="admin-error" role="alert">{actionError}</p>}

      {config.sections.map((section) => {
        const row = sectionRow(section.key)
        if (!row) return null
        if (section.managed === 'teamMembers') {
          return (
            <section className="admin-section-card" key={section.key} aria-labelledby={`sec-${section.key}`}>
              <div className="admin-section-head">
                <h3 id={`sec-${section.key}`}>{section.label}</h3>
                {section.help && <p className="admin-hint">{section.help}</p>}
              </div>
              <TeamMembersManager/>
            </section>
          )
        }

        const dirty = isDirty(section.key)
        return (
          <section className="admin-section-card" key={section.key} aria-labelledby={`sec-${section.key}`}>
            <div className="admin-section-head">
              <h3 id={`sec-${section.key}`}>{section.label}</h3>
              {row.hasUnpublishedChanges && !dirty && (
                <span className="admin-chip is-draft">Saved, not published</span>
              )}
              {dirty && <span className="admin-chip is-unverified">Unsaved</span>}
              {section.help && <p className="admin-hint">{section.help}</p>}
            </div>

            {section.fields.map((field) => (
              <Field
                key={field.name} field={field} idBase={`${slug}-${section.key}`}
                value={drafts[section.key]?.[field.name]}
                onChange={(v) => setDrafts((d) => ({ ...d, [section.key]: { ...d[section.key], [field.name]: v } }))}
              />
            ))}

            <div className="admin-head-actions">
              <button className="admin-btn admin-btn-primary" disabled={savingKey === section.key || !dirty}
                      onClick={() => save(section.key)}>
                {savingKey === section.key ? 'Saving…' : 'Save section'}
              </button>
              <p className="admin-live" role="status" aria-live="polite">
                {savedKey === section.key && !dirty && (
                  <span className="admin-saved">Saved as a draft. Publish the page to make it live.</span>
                )}
              </p>
            </div>
          </section>
        )
      })}

      <div className="admin-danger-panel" role="note">
        <h3>{published ? 'This page is live' : 'This page is not on the site'}</h3>
        <p>
          {published
            ? 'Taking it down removes it from the public site immediately. Your drafts are kept.'
            : 'Publishing puts every saved section on the public site.'}
        </p>
        <div className="admin-danger-actions">
          <button className="admin-btn" disabled={busy}
                  onClick={() => run(() => (published ? unpublishPage(slug) : publishPage(slug)))}>
            {published ? 'Take the page down' : 'Publish the page'}
          </button>
        </div>
      </div>

      {confirming?.kind === 'discard' && (
        <DangerConfirm
          title="Discard every unpublished change?"
          body={`This resets all ${pendingPublish} changed section${pendingPublish === 1 ? '' : 's'} back to what is currently live. It cannot be undone.`}
          confirmLabel="Discard changes" busyLabel="Discarding…"
          busy={busy} error={actionError}
          onCancel={() => setConfirming(null)}
          onConfirm={() => { setConfirming(null); run(() => discardDraft(slug)) }}
        />
      )}
    </section>
  )
}
