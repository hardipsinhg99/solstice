/**
 * The one destructive-confirmation component. Extracted from AdminProductsPage
 * in Phase 1b so image delete reuses this exact component rather than a second
 * confirmation UI that drifts from it.
 *
 * A dedicated panel rather than window.confirm(): the browser dialog cannot be
 * styled, cannot carry the danger token, gives no room to name what is about to
 * be destroyed, and is modal to the whole tab - which blocks the live region
 * announcing the result.
 */
export function DangerConfirm({
  title, body, confirmLabel = 'Delete permanently', busyLabel = 'Deleting…',
  busy = false, error = '', onCancel, onConfirm
}) {
  return (
    <div className="admin-danger-panel" role="alertdialog" aria-modal="false"
         aria-labelledby="danger-title" aria-describedby="danger-body">
      <h3 id="danger-title">{title}</h3>
      <p id="danger-body">{body}</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {/* Focus lands on Cancel, not on the destructive button. The panel appears
          under the operator's hand; a stray Enter should dismiss it, never
          destroy something. */}
      <div className="admin-danger-actions">
        <button className="admin-btn" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
        <button className="admin-btn admin-btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </div>
  )
}
