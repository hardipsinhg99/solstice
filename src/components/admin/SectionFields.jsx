import { useRef, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { RichTextEditor } from './RichTextEditor.jsx'
import { uploadAsset } from '../../features/admin/useMediaAssets.js'

/**
 * The field renderers the section config drives. One switch, six kinds - not a
 * bespoke form per section type. This is the same lesson useApiResource taught:
 * the second near-duplicate is the moment to generalise, and Home, About and
 * Team would have been the third, fourth and fifth.
 */

const setIn = (obj, name, value) => ({ ...obj, [name]: value })

/* Mirrors server/src/media/media.constants.ts. Duplicated deliberately: the
   server still validates by CONTENT, which is the check that matters and the
   one a browser cannot be trusted to do. This copy exists only so an operator
   who picks a 30MB camera JPEG gets told immediately instead of waiting for the
   upload to reach a 413. If the server cap moves, this is cosmetic drift, not a
   hole. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

function ImageField({ field, value, onChange, id }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Absent flag = published. See visibleImage() - images stored before this
  // toggle existed must not vanish the moment it ships.
  const published = value?.published !== false

  const pick = async (file) => {
    if (!file) return
    setError(''); setNotice('')

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('That file is not a JPG, PNG or WebP. Pick one of those.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1)
      setError(`That image is ${mb}MB. The limit is 8MB - export it smaller and try again.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const replacing = Boolean(value?.url)
    setBusy(true)
    try {
      // Same pipeline as every other upload on this site.
      const asset = await uploadAsset(file, '')
      onChange({
        id: asset.id, url: asset.url, alt: asset.altText || '',
        width: asset.width, height: asset.height,
        // A replacement inherits the visibility of what it replaced; a first
        // upload is visible. Uploading a picture and having nothing appear
        // would read as a broken uploader.
        published: replacing ? published : true
      })
      setNotice(replacing ? 'Image replaced. Save the section to publish it.'
                          : 'Image uploaded. Save the section to publish it.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-field admin-image-field">
      <span id={`${id}-label`}>{field.label}</span>

      {value?.url && (
        <figure className="admin-image-preview" data-hidden={!published || undefined}>
          <img src={value.url} alt={value.alt || ''}/>
          <figcaption>
            <input
              value={value.alt || ''} placeholder="Alt text - what the photograph shows"
              aria-label={`Alt text for ${field.label}`}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />

            {/* Publish state is stored ON the image rather than as a sibling
                field, so it travels with the value through the repeater, the
                draft/publish round-trip and Remove - there is no way to leave
                an orphan flag behind pointing at an image that is gone. */}
            <label className="admin-toggle-row">
              <input type="checkbox" checked={published}
                     onChange={(e) => onChange({ ...value, published: e.target.checked })}/>
              <span>{published ? 'Published - visible on the site' : 'Unpublished - hidden from the site'}</span>
            </label>

            {confirming ? (
              <span className="admin-verify-cell">
                <span className="admin-hint">Remove this image from the section?</span>
                <button type="button" className="admin-btn admin-btn-danger-quiet"
                        onClick={() => { setConfirming(false); setNotice(''); onChange(null) }}>
                  Yes, remove
                </button>
                <button type="button" className="admin-btn"
                        onClick={() => setConfirming(false)}>Cancel</button>
              </span>
            ) : (
              <button type="button" className="admin-btn admin-btn-danger-quiet"
                      onClick={() => setConfirming(true)}>Remove</button>
            )}
          </figcaption>
        </figure>
      )}

      {/* Replacing is not destructive - the previous asset stays in the media
          library and can be picked again - so it gets a plain control while
          Remove gets the confirmation. */}
      <input ref={inputRef} id={id} type="file" accept={ACCEPT}
             disabled={busy} aria-labelledby={`${id}-label`}
             onChange={(e) => pick(e.target.files?.[0])}/>

      {busy && <span className="admin-hint" role="status">Uploading and converting…</span>}
      {notice && !busy && <span className="admin-hint admin-ok" role="status">{notice}</span>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {field.help && <small className="admin-hint">{field.help}</small>}
    </div>
  )
}

function ListField({ field, value, onChange, idBase }) {
  const items = Array.isArray(value) ? value : []
  const label = field.itemLabel ?? 'Item'

  const update = (index, next) => onChange(items.map((it, i) => (i === index ? next : it)))
  const move = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange(next)
  }
  // A new row starts from each field's declared default, falling back to
  // false for a toggle and '' for everything else.
  //
  // This existed because every toggle defaulted to false, which is right for
  // "Flag as unverified" and exactly wrong for "Published": pressing "Add
  // certificate" created a certificate that was invisible, with nothing on
  // screen explaining why. The default belongs to the field, not to the kind.
  const blank = Object.fromEntries(field.fields.map((f) => [
    f.name,
    f.default !== undefined ? f.default : f.kind === 'toggle' ? false : ''
  ]))

  return (
    <fieldset className="admin-fieldset admin-repeater-set">
      <legend>{field.label}</legend>
      <div className="admin-repeater">
        {items.map((item, index) => (
          <div className="admin-repeater-row" key={index}>
            <div className="admin-repeater-head">
              <strong>{label} {index + 1}</strong>
              {/* Move buttons, not drag-only: a repeater an editor cannot
                  reorder from the keyboard is a repeater half the operators
                  cannot reorder. */}
              <div className="admin-repeater-actions">
                <button type="button" className="admin-btn" disabled={index === 0}
                        aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                        onClick={() => move(index, index - 1)}>↑</button>
                <button type="button" className="admin-btn" disabled={index === items.length - 1}
                        aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                        onClick={() => move(index, index + 1)}>↓</button>
                <button type="button" className="admin-btn admin-btn-danger-quiet"
                        aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                        onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button>
              </div>
            </div>
            {field.fields.map((sub) => (
              <Field
                key={sub.name} field={sub} value={item[sub.name]}
                idBase={`${idBase}-${index}`}
                onChange={(v) => update(index, setIn(item, sub.name, v))}
              />
            ))}
          </div>
        ))}
      </div>
      <button type="button" className="admin-btn" onClick={() => onChange([...items, blank])}>
        Add {label.toLowerCase()}
      </button>
    </fieldset>
  )
}

export function Field({ field, value, onChange, idBase }) {
  const id = `${idBase}-${field.name}`
  const helpId = field.help ? `${id}-help` : undefined

  if (field.kind === 'list') return <ListField field={field} value={value} onChange={onChange} idBase={id}/>
  if (field.kind === 'image') return <ImageField field={field} value={value} onChange={onChange} id={id}/>

  if (field.kind === 'rich') {
    return (
      <div className="admin-field">
        <span id={`${id}-label`}>{field.label}</span>
        <RichTextEditor value={value || ''} onChange={onChange} id={id} describedBy={helpId}/>
        {field.help && <small className="admin-hint" id={helpId}>{field.help}</small>}
      </div>
    )
  }

  if (field.kind === 'toggle') {
    return (
      <label className="admin-check admin-toggle-field">
        <input type="checkbox" checked={Boolean(value)} aria-describedby={helpId}
               onChange={(e) => onChange(e.target.checked)}/>
        <span>{field.label}</span>
        {field.help && <small className="admin-hint" id={helpId}>{field.help}</small>}
      </label>
    )
  }

  return (
    <label className="admin-field" htmlFor={id}>
      <span>{field.label}</span>
      {field.kind === 'textarea'
        ? <textarea id={id} rows={4} value={value ?? ''} aria-describedby={helpId}
                    onChange={(e) => onChange(e.target.value)}/>
        : <input id={id} type={field.kind === 'number' ? 'number' : 'text'}
                 value={value ?? ''} aria-describedby={helpId}
                 onChange={(e) => onChange(
                   field.kind === 'number'
                     ? (e.target.value === '' ? null : Number(e.target.value))
                     : e.target.value
                 )}/>}
      {field.help && <small className="admin-hint" id={helpId}>{field.help}</small>}
    </label>
  )
}

export { Icon }
