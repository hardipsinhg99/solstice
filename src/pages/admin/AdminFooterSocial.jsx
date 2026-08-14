import { useEffect, useState } from 'react'
import { apiFetch } from '../../features/admin/index.js'
import { Icon } from '../../components/ui/Icon.jsx'
import { SOCIAL_LABELS } from '../../features/social/index.js'

/**
 * Footer social links.
 *
 * Its own component and its own save lifecycle rather than more fields on the
 * settings form: a row here saves one platform, and folding that into the
 * settings submit would mean one Save button writing to two different tables
 * with two different failure modes.
 *
 * Rows are never created or destroyed in this UI. The four platforms are a fixed
 * set - fixed because the icon sprite has to be able to draw them - so the
 * server seeds all four and "Remove" clears a row rather than deleting it.
 * Deleting would leave an operator with no way to add Instagram back short of a
 * code change, which is not a thing a settings screen should be able to do.
 */
export function AdminFooterSocial () {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(null)        // platform currently saving
  const [rowError, setRowError] = useState({})  // platform -> message
  const [savedRow, setSavedRow] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const load = () => apiFetch('/social/admin')
    .then((data) => { setRows(data); setState('ready') })
    .catch((err) => { setLoadError(err.message); setState('error') })

  useEffect(() => { load() }, [])

  const patch = (platform, changes) =>
    setRows((rs) => rs.map((r) => (r.platform === platform ? { ...r, ...changes } : r)))

  const save = async (row, overrides = {}) => {
    const body = { platform: row.platform, url: row.url ?? '', enabled: row.enabled, order: row.order, ...overrides }
    setBusy(row.platform); setRowError((e) => ({ ...e, [row.platform]: '' })); setSavedRow(null)
    try {
      const saved = await apiFetch('/social/admin', { method: 'POST', body: JSON.stringify(body) })
      patch(row.platform, saved)
      setSavedRow(row.platform)
    } catch (err) {
      // The server refuses to enable a row with no URL. Reflect that refusal in
      // the checkbox too - leaving it ticked after a rejected save would show a
      // state the database does not have.
      patch(row.platform, { enabled: row.enabled && !overrides.enabled ? row.enabled : false })
      setRowError((e) => ({ ...e, [row.platform]: err.message }))
    } finally {
      setBusy(null)
    }
  }

  const move = async (index, delta) => {
    const next = [...rows]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next)
    try {
      setRows(await apiFetch('/social/admin/reorder', {
        method: 'PATCH', body: JSON.stringify({ ids: next.map((r) => r.id) })
      }))
    } catch (err) {
      setLoadError(err.message); load()
    }
  }

  const clear = async (row) => {
    setBusy(row.platform); setConfirming(null)
    try {
      const cleared = await apiFetch(`/social/admin/${row.id}`, { method: 'DELETE' })
      patch(row.platform, cleared)
    } catch (err) {
      setRowError((e) => ({ ...e, [row.platform]: err.message }))
    } finally { setBusy(null) }
  }

  if (state === 'loading') return <p className="admin-skeleton" role="status">Loading footer links…</p>
  if (state === 'error') return <p className="admin-error" role="alert">{loadError}</p>

  return (
    <fieldset className="admin-fieldset" style={{ marginTop: 20 }}>
      <legend>Footer social links</legend>
      <p className="admin-hint" style={{ marginBottom: 14 }}>
        A link appears in the footer only when it has a URL <em>and</em> is switched on. Order here is
        the order buyers see. Removing a link clears its address and switches it off — the platform
        stays on this list so you can put it back.
      </p>

      {rows.map((row, i) => (
        <div className="admin-social-row" key={row.platform}>
          <span className="admin-social-mark" aria-hidden="true"><Icon name={row.platform} size={18}/></span>

          <div className="admin-social-body">
            <label className="admin-field admin-social-url">
              <span>{SOCIAL_LABELS[row.platform] ?? row.platform}</span>
              <input
                type="url" value={row.url ?? ''} placeholder="https://…"
                disabled={busy === row.platform}
                onChange={(e) => patch(row.platform, { url: e.target.value })}
                onBlur={() => save(row)}
              />
            </label>

            <label className="admin-toggle-row">
              <input
                type="checkbox" checked={Boolean(row.enabled)}
                disabled={busy === row.platform}
                onChange={(e) => { patch(row.platform, { enabled: e.target.checked }); save(row, { enabled: e.target.checked }) }}
              />
              <span>{row.enabled ? 'Shown in the footer' : 'Hidden'}</span>
            </label>

            {rowError[row.platform] && <p className="admin-error" role="alert">{rowError[row.platform]}</p>}
            {savedRow === row.platform && !rowError[row.platform] && busy !== row.platform &&
              <span className="admin-hint admin-ok" role="status">Saved.</span>}
            {busy === row.platform && <span className="admin-hint" role="status">Saving…</span>}
          </div>

          <div className="admin-social-actions">
            <button type="button" className="admin-btn" aria-label={`Move ${row.platform} up`}
                    disabled={i === 0 || busy === row.platform} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="admin-btn" aria-label={`Move ${row.platform} down`}
                    disabled={i === rows.length - 1 || busy === row.platform} onClick={() => move(i, 1)}>↓</button>
            {confirming === row.platform ? (
              <>
                <button type="button" className="admin-btn admin-btn-danger-quiet"
                        onClick={() => clear(row)}>Yes, remove</button>
                <button type="button" className="admin-btn" onClick={() => setConfirming(null)}>Cancel</button>
              </>
            ) : (
              <button type="button" className="admin-btn admin-btn-danger-quiet"
                      disabled={!row.url && !row.enabled}
                      onClick={() => setConfirming(row.platform)}>Remove</button>
            )}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
