import { useEffect, useState } from 'react'
import { getAdminProduct, createProduct, updateProduct } from '../../features/admin/index.js'
import { goTo } from '../../app/router.js'

const BLANK = {
  slug: '', name: '', type: '', image: '', description: '',
  season: '', origin: '', packaging: '',
  trade: 'EXPORT', status: 'DRAFT', placeholder: false,
  hsCode: '', moqValue: '', moqUnit: '', shelfLifeDays: '',
  storageTempC: '', storageHumidity: '', seoTitle: '', seoDescription: '',
  incoterms: [], portsOfLoading: [],
  varieties: [], packOptions: [], certifications: []
}

const INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP']

// The eight fields that carry real data today. Everything else is aspirational
// and must never block a save - no product has any of it yet, and a schema that
// demands data nobody has is a launch blocker of our own making.
const REQUIRED = ['slug', 'name', 'type', 'description', 'season', 'origin', 'packaging']

function Field({ label, hint, error, children }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint && !error && <small className="admin-hint">{hint}</small>}
      {error && <small className="admin-error" role="alert">{error}</small>}
    </label>
  )
}

/**
 * Certification rows. Marking one verifiable is a two-step action, not a toggle
 * flip: docs/website-strategy.md records that claiming a certification without a
 * producible certificate reference is a legal exposure in destination markets,
 * so the UI makes that friction felt rather than hiding it behind a switch. The
 * server enforces the same rule independently.
 */
function CertificationRows({ rows, onChange }) {
  const [pending, setPending] = useState(null) // index awaiting confirmation

  const patch = (i, key, value) => onChange(rows.map((r, x) => (x === i ? { ...r, [key]: value } : r)))

  const confirmVerifiable = (i) => {
    patch(i, 'verifiable', true)
    setPending(null)
  }

  return (
    <div className="admin-repeater">
      {rows.length === 0 && <p className="admin-meta">No certifications recorded.</p>}

      {rows.map((row, i) => (
        <div
          key={i}
          className={row.verifiable ? 'admin-repeater-row is-verified' : 'admin-repeater-row is-unverified'}
        >
          <Field label="Certification">
            <input value={row.name} onChange={(e) => patch(i, 'name', e.target.value)} required/>
          </Field>

          <Field label="Certificate reference" hint="Required before this can be marked verifiable.">
            <input
              value={row.reference ?? ''}
              onChange={(e) => patch(i, 'reference', e.target.value)}
              placeholder="e.g. GGN 4049928123456"
            />
          </Field>

          <div className="admin-verify-cell">
            {row.verifiable ? (
              <>
                <span className="admin-chip is-verified">Verifiable</span>
                <button type="button" className="admin-btn" onClick={() => patch(i, 'verifiable', false)}>
                  Mark unverified
                </button>
              </>
            ) : (
              <>
                <span className="admin-chip is-unverified">Claimed — not verifiable</span>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={!String(row.reference ?? '').trim()}
                  onClick={() => setPending(i)}
                >
                  Mark verifiable…
                </button>
              </>
            )}
          </div>

          {pending === i && (
            <div className="admin-danger-panel admin-verify-confirm" role="alertdialog"
                 aria-labelledby={`vc-${i}`}>
              <h4 id={`vc-${i}`}>Confirm this certification is verifiable</h4>
              <p>
                You are stating that Solstice can produce certificate{' '}
                <strong>{row.reference}</strong> for <strong>{row.name || 'this certification'}</strong> on
                request. Claiming a certification you cannot evidence is a legal
                exposure in several destination markets.
              </p>
              <div className="admin-danger-actions">
                <button type="button" className="admin-btn" onClick={() => setPending(null)}>Cancel</button>
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => confirmVerifiable(i)}>
                  Yes, we can produce this certificate
                </button>
              </div>
            </div>
          )}

          <button type="button" className="admin-btn admin-btn-danger-quiet"
                  onClick={() => onChange(rows.filter((_, x) => x !== i))}>
            Remove certification
          </button>
        </div>
      ))}

      <button type="button" className="admin-btn"
              onClick={() => onChange([...rows, { name: '', reference: '', verifiable: false }])}>
        Add certification
      </button>
    </div>
  )
}

export default function AdminProductEditPage({ productId }) {
  const isNew = !productId || productId === 'new'
  const [form, setForm] = useState(BLANK)
  const [status, setStatus] = useState(isNew ? 'ready' : 'loading')
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    getAdminProduct(productId)
      .then((p) => {
        if (cancelled) return
        setForm({
          ...BLANK, ...p,
          image: p.image ?? '', hsCode: p.hsCode ?? '',
          moqValue: p.moqValue ?? '', moqUnit: p.moqUnit ?? '',
          shelfLifeDays: p.shelfLifeDays ?? '', storageTempC: p.storageTempC ?? '',
          storageHumidity: p.storageHumidity ?? '',
          seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '',
          varieties: p.varieties.map((v) => ({ ...v, grade: v.grade ?? '', calibreMin: v.calibreMin ?? '', calibreMax: v.calibreMax ?? '' })),
          packOptions: p.packOptions.map((o) => ({
            ...o, cartonWeightKg: o.cartonWeightKg ?? '',
            cartonsPerPallet: o.cartonsPerPallet ?? '', palletsPerReefer: o.palletsPerReefer ?? '',
            cartonsPerReefer: o.cartonsPerReefer ?? '', notes: o.notes ?? ''
          })),
          certifications: p.certifications.map((c) => ({ ...c, reference: c.reference ?? '' }))
        })
        setStatus('ready')
      })
      .catch((err) => { if (!cancelled) { setSaveError(err.message); setStatus('error') } })
    return () => { cancelled = true }
  }, [productId, isNew])

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setSaved('') }

  // Client-side validation exists for fast feedback only. The server validates
  // independently and assumes this was bypassed.
  const validate = () => {
    const next = {}
    for (const key of REQUIRED) if (!String(form[key] ?? '').trim()) next[key] = 'Required'
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      next.slug = 'Lowercase letters, digits and single hyphens only'
    }
    if (form.hsCode && !/^\d{6,10}$/.test(form.hsCode)) next.hsCode = 'HS code is 6–10 digits'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const num = (v) => (String(v).trim() === '' ? null : Number(v))

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaveError(''); setSaved('')
    if (!validate()) return
    setStatus('saving')

    const payload = {
      slug: form.slug.trim(), name: form.name.trim(), type: form.type.trim(),
      description: form.description.trim(), season: form.season.trim(),
      origin: form.origin.trim(), packaging: form.packaging.trim(),
      image: form.image.trim() || null,
      trade: form.trade, status: form.status, placeholder: Boolean(form.placeholder),
      hsCode: form.hsCode.trim() || null,
      incoterms: form.incoterms,
      moqValue: num(form.moqValue), moqUnit: form.moqUnit.trim() || null,
      shelfLifeDays: num(form.shelfLifeDays),
      storageTempC: form.storageTempC.trim() || null,
      storageHumidity: form.storageHumidity.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      portsOfLoading: form.portsOfLoading,
      varieties: form.varieties.map((v) => ({
        name: v.name, grade: v.grade || null,
        calibreMin: num(v.calibreMin), calibreMax: num(v.calibreMax)
      })),
      packOptions: form.packOptions.map((o) => ({
        cartonWeightKg: Number(o.cartonWeightKg || 0),
        cartonsPerPallet: num(o.cartonsPerPallet), palletsPerReefer: num(o.palletsPerReefer),
        cartonsPerReefer: num(o.cartonsPerReefer), notes: o.notes || null
      })),
      certifications: form.certifications.map((c) => ({
        name: c.name, verifiable: Boolean(c.verifiable), reference: c.reference || null
      }))
    }

    try {
      const result = isNew ? await createProduct(payload) : await updateProduct(productId, payload)
      setStatus('ready')
      setSaved(`Saved — ${result.status === 'PUBLISHED' ? 'live on the public site' : 'draft, not published'}`)
      if (isNew) goTo(`admin/product/${result.id}`)
    } catch (err) {
      setStatus('ready')
      setSaveError(err.message)
    }
  }

  const repeater = (key, blank, render) => (
    <div className="admin-repeater">
      {form[key].length === 0 && <p className="admin-meta">None yet.</p>}
      {form[key].map((row, i) => (
        <div className="admin-repeater-row" key={i}>
          {render(row, (k, v) => set(key, form[key].map((r, x) => (x === i ? { ...r, [k]: v } : r))))}
          <button type="button" className="admin-btn admin-btn-danger-quiet"
                  onClick={() => set(key, form[key].filter((_, x) => x !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="admin-btn" onClick={() => set(key, [...form[key], blank])}>Add</button>
    </div>
  )

  if (status === 'loading') return <p className="admin-skeleton" role="status">Loading product…</p>

  return (
    <form className="admin-page" onSubmit={onSubmit}>
      <header className="admin-page-head">
        <div>
          <button type="button" className="admin-link" onClick={() => goTo('admin/products')}>← Products</button>
          <h1>{isNew ? 'New product' : form.name || 'Edit product'}</h1>
        </div>
        <div className="admin-head-actions">
          <span className={form.status === 'PUBLISHED' ? 'admin-chip is-published' : 'admin-chip is-draft'}>
            {form.status === 'PUBLISHED' ? 'Published' : 'Draft'}
          </span>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {/* Announced, not just painted. */}
      <div className="admin-live" role="status" aria-live="polite">
        {saved && <span className="admin-saved">{saved}</span>}
      </div>
      {saveError && <p className="admin-error" role="alert">{saveError}</p>}

      <fieldset className="admin-fieldset">
        <legend>Catalogue details</legend>
        <Field label="Name" error={errors.name}>
          <input value={form.name} onChange={(e) => set('name', e.target.value)}/>
        </Field>
        <Field label="Slug" hint="Appears in the URL. Lowercase, hyphens." error={errors.slug}>
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)}/>
        </Field>
        <Field label="Type" hint="e.g. Fresh fruit" error={errors.type}>
          <input value={form.type} onChange={(e) => set('type', e.target.value)}/>
        </Field>
        <Field label="Trade direction">
          <select value={form.trade} onChange={(e) => set('trade', e.target.value)}>
            <option value="EXPORT">Export</option>
            <option value="IMPORT">Import</option>
          </select>
        </Field>
        <Field label="Image URL" hint="Optional — placeholder products have none.">
          <input value={form.image} onChange={(e) => set('image', e.target.value)}/>
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)}/>
        </Field>
        <Field label="Season" error={errors.season}>
          <input value={form.season} onChange={(e) => set('season', e.target.value)}/>
        </Field>
        <Field label="Origin" error={errors.origin}>
          <input value={form.origin} onChange={(e) => set('origin', e.target.value)}/>
        </Field>
        <Field label="Packaging" error={errors.packaging}>
          <input value={form.packaging} onChange={(e) => set('packaging', e.target.value)}/>
        </Field>
        <Field label="Publish state">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="DRAFT">Draft — not on the public site</option>
            <option value="PUBLISHED">Published — visible to buyers</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Varieties</legend>
        {repeater('varieties', { name: '', grade: '', calibreMin: '', calibreMax: '' }, (row, patch) => (
          <>
            <Field label="Variety"><input value={row.name} onChange={(e) => patch('name', e.target.value)}/></Field>
            <Field label="Grade"><input value={row.grade} onChange={(e) => patch('grade', e.target.value)}/></Field>
            <Field label="Calibre min"><input type="number" value={row.calibreMin} onChange={(e) => patch('calibreMin', e.target.value)}/></Field>
            <Field label="Calibre max"><input type="number" value={row.calibreMax} onChange={(e) => patch('calibreMax', e.target.value)}/></Field>
          </>
        ))}
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Pack options</legend>
        {repeater('packOptions', { cartonWeightKg: '', cartonsPerPallet: '', palletsPerReefer: '', cartonsPerReefer: '', notes: '' }, (row, patch) => (
          <>
            <Field label="Carton weight (kg)"><input type="number" step="0.01" value={row.cartonWeightKg} onChange={(e) => patch('cartonWeightKg', e.target.value)}/></Field>
            <Field label="Cartons / pallet"><input type="number" value={row.cartonsPerPallet} onChange={(e) => patch('cartonsPerPallet', e.target.value)}/></Field>
            <Field label="Pallets / reefer"><input type="number" value={row.palletsPerReefer} onChange={(e) => patch('palletsPerReefer', e.target.value)}/></Field>
            <Field label="Cartons / reefer"><input type="number" value={row.cartonsPerReefer} onChange={(e) => patch('cartonsPerReefer', e.target.value)}/></Field>
            <Field label="Notes"><input value={row.notes} onChange={(e) => patch('notes', e.target.value)}/></Field>
          </>
        ))}
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Certifications</legend>
        <CertificationRows rows={form.certifications} onChange={(rows) => set('certifications', rows)}/>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Commercial spec <span className="admin-meta">— optional, none of this is required to save</span></legend>
        <Field label="HS code" hint="6–10 digits. Buyers' customs brokers search on this." error={errors.hsCode}>
          <input value={form.hsCode} onChange={(e) => set('hsCode', e.target.value)}/>
        </Field>
        <Field label="Incoterms">
          <div className="admin-checks">
            {INCOTERMS.map((term) => (
              <label key={term} className="admin-check">
                <input
                  type="checkbox" checked={form.incoterms.includes(term)}
                  onChange={(e) => set('incoterms', e.target.checked
                    ? [...form.incoterms, term]
                    : form.incoterms.filter((t) => t !== term))}
                />
                <span>{term}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="MOQ value"><input type="number" step="0.01" value={form.moqValue} onChange={(e) => set('moqValue', e.target.value)}/></Field>
        <Field label="MOQ unit" hint="MT, cartons, containers"><input value={form.moqUnit} onChange={(e) => set('moqUnit', e.target.value)}/></Field>
        <Field label="Shelf life (days)"><input type="number" value={form.shelfLifeDays} onChange={(e) => set('shelfLifeDays', e.target.value)}/></Field>
        <Field label="Storage temp (°C)" hint="A range, e.g. 2-4"><input value={form.storageTempC} onChange={(e) => set('storageTempC', e.target.value)}/></Field>
        <Field label="Storage humidity"><input value={form.storageHumidity} onChange={(e) => set('storageHumidity', e.target.value)}/></Field>
      </fieldset>
    </form>
  )
}
