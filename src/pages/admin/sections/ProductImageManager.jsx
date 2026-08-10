import { useRef, useState } from 'react'
import { DangerConfirm } from '../../../components/admin/DangerConfirm.jsx'
import {
  MAX_GALLERY_IMAGES, preflight, uploadPrimary, uploadGallery,
  clearPrimary, removeGalleryImage, reorderGallery, updateAltText
} from '../../../features/admin/useProductMedia.js'

// Native <input type="file"> and native HTML5 drag events. No dropzone library,
// no drag library - the standing no-new-frontend-dependency rule.

function bytes(n) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}

/** One file picker + alt field + progress bar, reused by primary and gallery. */
function UploadField({ id, label, hint, busy, progress, error, onPick }) {
  const inputRef = useRef(null)
  const [alt, setAlt] = useState('')

  const pick = (file) => {
    if (!file) return
    onPick(file, alt.trim())
    setAlt('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="admin-upload">
      <label className="admin-field" htmlFor={`${id}-alt`}>
        <span>Alt text {label ? `(${label})` : ''}</span>
        <input
          id={`${id}-alt`} value={alt} onChange={(e) => setAlt(e.target.value)}
          placeholder="What the photograph shows, for a screen reader"
        />
        <small className="admin-hint">
          Describe the image, not the product name. Applied to the file you pick next.
        </small>
      </label>

      <label className="admin-field" htmlFor={id}>
        <span>{label || 'Image'}</span>
        <input
          ref={inputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp"
          disabled={busy} onChange={(e) => pick(e.target.files?.[0])}
        />
        {hint && <small className="admin-hint">{hint}</small>}
      </label>

      {busy && (
        <div className="admin-progress" role="status" aria-live="polite">
          {/* aria-valuenow so the percentage is announced, not just painted. */}
          <div className="admin-progress-track" role="progressbar"
               aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
               aria-label="Upload progress">
            <div className="admin-progress-bar" style={{ width: `${progress}%` }}/>
          </div>
          <span className="admin-meta">{progress}% uploaded{progress === 100 ? ' — processing…' : ''}</span>
        </div>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  )
}

export function ProductImageManager({ productId, primaryImage, gallery, onChange }) {
  const [busy, setBusy] = useState('')          // '' | 'primary' | 'gallery'
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null) // {kind, assetId, name}
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const run = async (kind, fn) => {
    setBusy(kind); setError(''); setProgress(0)
    try {
      onChange(await fn())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(''); setProgress(0)
    }
  }

  const pickPrimary = (file, alt) => {
    const problem = preflight(file)
    if (problem) return setError(problem)
    run('primary', () => uploadPrimary(productId, file, alt, setProgress))
  }

  const pickGallery = (file, alt) => {
    const problem = preflight(file)
    if (problem) return setError(problem)
    if (gallery.length >= MAX_GALLERY_IMAGES) {
      return setError(`A product can have at most ${MAX_GALLERY_IMAGES} gallery images.`)
    }
    run('gallery', () => uploadGallery(productId, file, alt, setProgress))
  }

  const confirmDelete = () => {
    const { kind, assetId } = confirming
    setConfirming(null)
    run(kind, () => (kind === 'primary' ? clearPrimary(productId) : removeGalleryImage(productId, assetId)))
  }

  // ── Reorder. Native HTML5 DnD for pointer users, with explicit move buttons
  //    beside every image for everyone else. Drag-only reordering is the classic
  //    accessibility failure of media managers; the buttons are not a fallback,
  //    they are the primary path and the drag is the enhancement.
  const move = (from, to) => {
    if (to < 0 || to >= gallery.length || from === to) return
    const ids = gallery.map((g) => g.mediaAsset.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    run('gallery', () => reorderGallery(productId, ids))
  }

  const onDrop = (index) => {
    if (dragIndex === null) return
    move(dragIndex, index)
    setDragIndex(null); setOverIndex(null)
  }

  return (
    <fieldset className="admin-fieldset">
      <legend>Images</legend>

      {/* ── Primary ─────────────────────────────────────────────────────── */}
      <div className="admin-media-primary">
        {primaryImage ? (
          <figure className="admin-media-card">
            <img src={primaryImage.url} alt={primaryImage.altText || ''}/>
            <figcaption>
              <strong>Primary image</strong>
              <span className="admin-meta">
                {primaryImage.width && primaryImage.height
                  ? `${primaryImage.width}×${primaryImage.height} · ${bytes(primaryImage.sizeBytes)}`
                  : 'External URL — not stored by this site'}
              </span>
              <AltEditor asset={primaryImage} onSaved={onChange} productId={productId}/>
              <button type="button" className="admin-btn admin-btn-danger-quiet"
                      onClick={() => setConfirming({ kind: 'primary', name: 'the primary image' })}>
                Delete primary image
              </button>
            </figcaption>
          </figure>
        ) : (
          <p className="admin-meta">No primary image. The public card shows an awaiting-image plate.</p>
        )}

        <UploadField
          id="primary-upload"
          label={primaryImage ? 'Replace primary image' : 'Primary image'}
          hint="JPEG, PNG or WebP, up to 8 MB. Resized to 1600px and converted to WebP on upload."
          busy={busy === 'primary'} progress={progress}
          error={busy === 'primary' ? error : ''}
          onPick={pickPrimary}
        />
      </div>

      {/* ── Gallery ─────────────────────────────────────────────────────── */}
      <div className="admin-media-gallery">
        <p className="admin-meta">
          Gallery — {gallery.length} of {MAX_GALLERY_IMAGES}. Drag to reorder, or use the arrows.
        </p>

        <ul className="admin-media-grid">
          {gallery.map((row, index) => (
            <li
              key={row.mediaAsset.id}
              className={overIndex === index ? 'admin-media-tile is-over' : 'admin-media-tile'}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(index) }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={() => onDrop(index)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
            >
              <img src={row.mediaAsset.url} alt={row.mediaAsset.altText || ''}/>
              <span className="admin-meta">
                {row.mediaAsset.width}×{row.mediaAsset.height} · {bytes(row.mediaAsset.sizeBytes)}
              </span>
              <AltEditor asset={row.mediaAsset} onSaved={onChange} productId={productId}/>
              <div className="admin-media-tile-actions">
                <button type="button" className="admin-btn" disabled={index === 0}
                        aria-label={`Move image ${index + 1} earlier`} onClick={() => move(index, index - 1)}>↑</button>
                <button type="button" className="admin-btn" disabled={index === gallery.length - 1}
                        aria-label={`Move image ${index + 1} later`} onClick={() => move(index, index + 1)}>↓</button>
                <button type="button" className="admin-btn admin-btn-danger-quiet"
                        aria-label={`Remove image ${index + 1}`}
                        onClick={() => setConfirming({ kind: 'gallery', assetId: row.mediaAsset.id, name: `gallery image ${index + 1}` })}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        {gallery.length < MAX_GALLERY_IMAGES && (
          <UploadField
            id="gallery-upload" label="Add a gallery image"
            hint={`${MAX_GALLERY_IMAGES - gallery.length} slot${MAX_GALLERY_IMAGES - gallery.length === 1 ? '' : 's'} remaining.`}
            busy={busy === 'gallery'} progress={progress}
            error={busy === 'gallery' ? error : ''}
            onPick={pickGallery}
          />
        )}
      </div>

      {/* The same DangerConfirm the product delete uses — one component, not a
          second confirmation UI. */}
      {confirming && (
        <DangerConfirm
          title={`Delete ${confirming.name}?`}
          body="The file is removed from storage as well as from this product. It cannot be undone."
          confirmLabel="Delete image" busyLabel="Deleting…"
          onCancel={() => setConfirming(null)} onConfirm={confirmDelete}
        />
      )}
    </fieldset>
  )
}

/** Alt text stays editable after upload — it is content, not a file property. */
function AltEditor({ asset, onSaved, productId }) {
  const [value, setValue] = useState(asset.altText || '')
  const [state, setState] = useState('idle')

  const save = async () => {
    setState('saving')
    try {
      await updateAltText(asset.id, value.trim() || null)
      setState('saved')
      onSaved?.(null, productId)
    } catch {
      setState('error')
    }
  }

  return (
    <label className="admin-field admin-alt-editor">
      <span>Alt text</span>
      <input value={value} onChange={(e) => { setValue(e.target.value); setState('idle') }}
             onBlur={() => value.trim() !== (asset.altText || '') && save()}
             placeholder="What the photograph shows"/>
      <small className="admin-hint" aria-live="polite">
        {state === 'saving' && 'Saving…'}
        {state === 'saved' && 'Saved'}
        {state === 'error' && 'Could not save alt text'}
        {state === 'idle' && !asset.altText && 'Empty alt text hides this image from screen readers.'}
      </small>
    </label>
  )
}
