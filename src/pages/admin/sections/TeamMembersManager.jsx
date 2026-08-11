import { useRef, useState } from 'react'
import { DangerConfirm } from '../../../components/admin/DangerConfirm.jsx'
import { RichTextEditor } from '../../../components/admin/RichTextEditor.jsx'
import { preflight } from '../../../features/admin/useProductMedia.js'
import {
  useAdminTeam, createMember, updateMember, removeMember,
  reorderMembers, setMemberPhoto, clearMemberPhoto
} from '../../../features/pages/index.js'

/**
 * Full CRUD on real people, not editable copy around a fixed roster.
 *
 * Team members publish immediately - they are records, not page sections, and
 * a person who has left should come off the site the moment they are removed
 * rather than waiting for somebody to remember to publish the page.
 */
function MemberCard({ member, index, total, onChanged, onMove, onDelete, busy }) {
  const [form, setForm] = useState({ name: member.name, role: member.role, bio: member.bio || '' })
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const dirty = form.name !== member.name || form.role !== member.role || (form.bio || '') !== (member.bio || '')

  const save = async () => {
    setState('saving'); setError('')
    try {
      await updateMember(member.id, form)
      await onChanged()
      setState('saved')
    } catch (err) { setError(err.message); setState('idle') }
  }

  const pickPhoto = async (file) => {
    if (!file) return
    const problem = preflight(file)
    if (problem) return setError(problem)
    setState('uploading'); setError('')
    try {
      // A real photograph of a real person, through the same pipeline product
      // and gallery images use. This is the fix for the stock-photography trust
      // risk website-strategy.md 2.5 has flagged since the original audit.
      await setMemberPhoto(member.id, file, `${form.name}, ${form.role}`)
      await onChanged()
      setState('idle')
    } catch (err) { setError(err.message); setState('idle') } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const id = `member-${member.id}`
  return (
    <article className="admin-repeater-row admin-member-card">
      <div className="admin-repeater-head">
        <strong>{member.name || 'Unnamed member'}</strong>
        <div className="admin-repeater-actions">
          <button type="button" className="admin-btn" disabled={index === 0 || busy}
                  aria-label={`Move ${member.name || 'member'} up`} onClick={() => onMove(index, index - 1)}>↑</button>
          <button type="button" className="admin-btn" disabled={index === total - 1 || busy}
                  aria-label={`Move ${member.name || 'member'} down`} onClick={() => onMove(index, index + 1)}>↓</button>
          <button type="button" className="admin-btn"
                  aria-label={member.published ? `Hide ${member.name || 'member'}` : `Show ${member.name || 'member'}`}
                  onClick={async () => { await updateMember(member.id, { published: !member.published }); onChanged() }}>
            {member.published ? 'Hide' : 'Show'}
          </button>
          <button type="button" className="admin-btn admin-btn-danger-quiet"
                  aria-label={`Remove ${member.name || 'member'}`} onClick={() => onDelete(member)}>Remove</button>
        </div>
      </div>

      <div className="admin-member-body">
        <div className="admin-member-photo">
          {member.photo ? (
            <>
              <img src={member.photo.url} alt={member.photo.altText || ''}/>
              <button type="button" className="admin-btn admin-btn-danger-quiet"
                      onClick={async () => { await clearMemberPhoto(member.id); onChanged() }}>Remove photo</button>
            </>
          ) : (
            /* No stock fallback, ever. The public card renders a monogram when
               there is no photograph - a stranger's stock portrait presented as
               staff is a falsifiable claim, which is worse than none. */
            <div className="admin-member-monogram" aria-hidden="true">
              {(form.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
            </div>
          )}
          <label className="admin-field" htmlFor={`${id}-photo`}>
            <span>{member.photo ? 'Replace photograph' : 'Photograph'}</span>
            <input ref={fileRef} id={`${id}-photo`} type="file" accept="image/jpeg,image/png,image/webp"
                   disabled={state === 'uploading'} onChange={(e) => pickPhoto(e.target.files?.[0])}/>
            {state === 'uploading' && <small className="admin-hint" role="status">Uploading…</small>}
          </label>
        </div>

        <div className="admin-member-fields">
          <label className="admin-field" htmlFor={`${id}-name`}>
            <span>Name</span>
            <input id={`${id}-name`} value={form.name}
                   onChange={(e) => { setForm({ ...form, name: e.target.value }); setState('idle') }}/>
            {!form.name && <small className="admin-hint">This card has no name. It is the gap the live page has today.</small>}
          </label>
          <label className="admin-field" htmlFor={`${id}-role`}>
            <span>Role</span>
            <input id={`${id}-role`} value={form.role}
                   onChange={(e) => { setForm({ ...form, role: e.target.value }); setState('idle') }}/>
          </label>
          <div className="admin-field">
            <span id={`${id}-bio-label`}>Biography</span>
            <RichTextEditor value={form.bio} id={`${id}-bio`}
                            onChange={(html) => { setForm({ ...form, bio: html }); setState('idle') }}/>
          </div>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <div className="admin-head-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={!dirty || state === 'saving'}
                    onClick={save}>{state === 'saving' ? 'Saving…' : 'Save member'}</button>
            <p className="admin-live" role="status" aria-live="polite">
              {state === 'saved' && !dirty && <span className="admin-saved">Saved. Live immediately.</span>}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

export function TeamMembersManager() {
  const { members, status, error, reload } = useAdminTeam()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [actionError, setActionError] = useState('')

  const run = async (fn) => {
    setBusy(true); setActionError('')
    try { await fn(); await reload() } catch (err) { setActionError(err.message) } finally { setBusy(false) }
  }

  const move = (from, to) => {
    if (to < 0 || to >= members.length) return
    const ids = members.map((m) => m.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    run(() => reorderMembers(ids))
  }

  if (status === 'loading') return <p className="admin-skeleton" role="status">Loading the team…</p>
  if (status === 'error') return <p className="admin-error" role="alert">{error}</p>

  const missingPhotos = members.filter((m) => !m.photo).length

  return (
    <div className="admin-team-manager">
      <p className="admin-meta">
        {members.length} member{members.length === 1 ? '' : 's'}
        {missingPhotos > 0 && `, ${missingPhotos} without a photograph`}. Changes here are live immediately.
      </p>

      {actionError && <p className="admin-error" role="alert">{actionError}</p>}

      <div className="admin-repeater">
        {members.map((m, index) => (
          <MemberCard
            key={m.id} member={m} index={index} total={members.length} busy={busy}
            onChanged={reload} onMove={move} onDelete={(member) => setConfirming(member)}
          />
        ))}
      </div>

      <button type="button" className="admin-btn" disabled={busy}
              onClick={() => run(() => createMember({ name: 'New member', role: 'Role', bio: '' }))}>
        Add a team member
      </button>

      {confirming && (
        <DangerConfirm
          title={`Remove ${confirming.name || 'this member'}?`}
          body="This removes the person from the public Team page immediately, and deletes their photograph from storage. It cannot be undone."
          confirmLabel="Remove member" busyLabel="Removing…"
          busy={busy} error={actionError}
          onCancel={() => setConfirming(null)}
          onConfirm={() => { const id = confirming.id; setConfirming(null); run(() => removeMember(id)) }}
        />
      )}
    </div>
  )
}
