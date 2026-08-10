import { useRef, useState } from 'react'
import { DangerConfirm } from '../../components/admin/DangerConfirm.jsx'
import { preflight } from '../../features/admin/useProductMedia.js'
import {
  useAdminGallery, uploadGalleryImage, updateGalleryImage,
  reorderGallery, deleteGalleryImage, MAX_GALLERY_IMAGES
} from '../../features/gallery/index.js'

// Native <input type="file"> and native HTML5 drag events, the same as the
// product image manager. No dropzone library, no drag library.
const bytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

/**
 * The public #gallery page, editable.
 *
 * Alt text and caption are two fields because they answer two questions. Alt
 * text is what a screen reader hears INSTEAD of the photograph; the caption is
 * the line a sighted visitor reads underneath it. Merging them produces captions
 * that read like alt text and alt text that reads like marketing.
 */
export default function AdminGalleryPage() {
  const { images, status, error, reload, setImages } = useAdminGallery()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [actionError, setActionError] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const fileRef = useRef(null)
  const [caption, setCaption] = useState('')
  const [altText, setAltText] = useState('')

  const run = async (fn) => {
    setBusy(true); setActionError(''); setProgress(0)
    try {
      await fn()
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false); setProgress(0)
    }
  }

  const pick = (file) => {
    if (!file) return
    const problem = preflight(file)
    if (problem) return setActionError(problem)
    if (images.length >= MAX_GALLERY_IMAGES) {
      return setActionError(`The gallery holds at most ${MAX_GALLERY_IMAGES} images.`)
    }
    run(async () => {
      await uploadGalleryImage(file, { caption: caption.trim(), altText: altText.trim() }, setProgress)
      setCaption(''); setAltText('')
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  // Reorder: explicit move buttons for everyone, drag as the enhancement. Drag-
  // only reordering is the classic accessibility failure of a media manager.
  const move = (from, to) => {
    if (to < 0 || to >= images.length || from === to) return
    const ids = images.map((g) => g.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    // Optimistic: the list reorders under the pointer immediately and the
    // server confirms. reload() in run() replaces it with the truth either way.
    const next = [...images]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setImages(next)
    run(() => reorderGallery(ids))
  }

  const onDrop = (index) => {
    if (dragIndex === null) return
    move(dragIndex, index)
    setDragIndex(null); setOverIndex(null)
  }

  const confirmDelete = () => {
    const { id } = confirming
    setConfirming(null)
    run(() => deleteGalleryImage(id))
  }

  const missingAlt = images.filter((g) => !g.mediaAsset.altText).length
  const hidden = images.filter((g) => !g.published).length

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">Gallery</h2>
          <p className="admin-meta">
            {images.length} of {MAX_GALLERY_IMAGES} image{images.length === 1 ? '' : 's'}
            {hidden > 0 && `, ${hidden} hidden from the public page`}. Shown in this order on the site.
          </p>
        </div>
      </header>

      {/* The migrated Unsplash photographs carry no alt text, because the page
          they came from rendered alt="" for all six. Inventing descriptions of
          pictures nobody has looked at would be fabricating content, so the gap
          is surfaced rather than filled. */}
      {missingAlt > 0 && status === 'ready' && (
        <div className="admin-danger-panel" role="note">
          <h3>{missingAlt} image{missingAlt === 1 ? '' : 's'} without alt text</h3>
          <p>
            An image with no alt text is invisible to a screen reader. Add a short description of what
            the photograph shows - not the company name, and not the caption again.
          </p>
        </div>
      )}

      <fieldset className="admin-fieldset admin-upload-panel">
        <legend>Add an image</legend>

        <label className="admin-field" htmlFor="gallery-alt">
          <span>Alt text</span>
          <input id="gallery-alt" value={altText} onChange={(e) => setAltText(e.target.value)}
                 placeholder="What the photograph shows, for a screen reader"/>
          <small className="admin-hint">Describe the image. Applied to the file you pick next.</small>
        </label>

        <label className="admin-field" htmlFor="gallery-caption">
          <span>Caption <span className="admin-optional">optional</span></span>
          <input id="gallery-caption" value={caption} onChange={(e) => setCaption(e.target.value)}
                 placeholder="Shown under the image on the public page"/>
        </label>

        <label className="admin-field" htmlFor="gallery-file">
          <span>Image file</span>
          <input ref={fileRef} id="gallery-file" type="file" accept="image/jpeg,image/png,image/webp"
                 disabled={busy || images.length >= MAX_GALLERY_IMAGES}
                 onChange={(e) => pick(e.target.files?.[0])}/>
          <small className="admin-hint">
            JPEG, PNG or WebP, up to 8 MB. Resized to 1600px, converted to WebP and stripped of EXIF on
            upload - the same pipeline product images use.
          </small>
        </label>

        {busy && progress > 0 && (
          <div className="admin-progress" role="status" aria-live="polite">
            <div className="admin-progress-track" role="progressbar"
                 aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress">
              <div className="admin-progress-bar" style={{ width: `${progress}%` }}/>
            </div>
            <span className="admin-meta">{progress}% uploaded{progress === 100 ? ' - processing…' : ''}</span>
          </div>
        )}
        {actionError && <p className="admin-error" role="alert">{actionError}</p>}
      </fieldset>

      {status === 'loading' && <p className="admin-skeleton" role="status">Loading the gallery…</p>}

      {status === 'error' && (
        <div className="admin-danger-panel" role="alert">
          <h3>Could not load the gallery</h3>
          <p>{error}</p>
          <button className="admin-btn" onClick={reload}>Try again</button>
        </div>
      )}

      {status === 'ready' && images.length === 0 && (
        <div className="admin-empty">
          <h3>No images yet</h3>
          <p>Images added here appear on the public gallery page in the order you set.</p>
        </div>
      )}

      {status === 'ready' && images.length > 0 && (
        <ul className="admin-media-grid">
          {images.map((row, index) => (
            <li
              key={row.id}
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
                {row.mediaAsset.width && row.mediaAsset.height
                  ? `${row.mediaAsset.width}×${row.mediaAsset.height} · ${bytes(row.mediaAsset.sizeBytes)}`
                  : 'External URL - not stored by this site'}
              </span>

              <CaptionEditor row={row} onSaved={reload}/>

              <div className="admin-media-tile-actions">
                <button type="button" className="admin-btn" disabled={index === 0 || busy}
                        aria-label={`Move image ${index + 1} earlier`} onClick={() => move(index, index - 1)}>↑</button>
                <button type="button" className="admin-btn" disabled={index === images.length - 1 || busy}
                        aria-label={`Move image ${index + 1} later`} onClick={() => move(index, index + 1)}>↓</button>
                <button type="button" className="admin-btn"
                        aria-label={row.published ? `Hide image ${index + 1} from the public page` : `Show image ${index + 1} on the public page`}
                        onClick={() => run(() => updateGalleryImage(row.id, { published: !row.published }))}>
                  {row.published ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="admin-btn admin-btn-danger-quiet"
                        aria-label={`Delete image ${index + 1}`}
                        onClick={() => { setConfirming({ id: row.id, index }); setActionError('') }}>
                  Delete
                </button>
              </div>
              {!row.published && <span className="admin-chip is-draft">Hidden</span>}
            </li>
          ))}
        </ul>
      )}

      {/* The same DangerConfirm every other destructive action uses. */}
      {confirming && (
        <DangerConfirm
          title={`Delete gallery image ${confirming.index + 1}?`}
          body="The file is removed from storage as well as from the gallery, and it disappears from the public page immediately. It cannot be undone."
          confirmLabel="Delete image" busyLabel="Deleting…"
          busy={busy} error={actionError}
          onCancel={() => setConfirming(null)} onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}

/** Caption saves on blur, the same interaction the product alt editor uses. */
function CaptionEditor({ row, onSaved }) {
  const [value, setValue] = useState(row.caption || '')
  const [state, setState] = useState('idle')

  const save = async () => {
    setState('saving')
    try {
      await updateGalleryImage(row.id, { caption: value.trim() })
      setState('saved')
      onSaved?.()
    } catch {
      setState('error')
    }
  }

  return (
    <label className="admin-field admin-alt-editor">
      <span>Caption</span>
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setState('idle') }}
        onBlur={() => value.trim() !== (row.caption || '') && save()}
        placeholder="Optional line under the image"
      />
      <small className="admin-hint" aria-live="polite">
        {state === 'saving' && 'Saving…'}
        {state === 'saved' && 'Saved'}
        {state === 'error' && 'Could not save the caption'}
        {state === 'idle' && !row.mediaAsset.altText && 'This image still has no alt text.'}
      </small>
    </label>
  )
}
