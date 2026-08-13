import { useEffect, useMemo, useState } from 'react'
import { useAdminProducts, deleteProduct } from '../../features/admin/index.js'
import { goTo } from '../../app/router.js'
import { DangerConfirm } from '../../components/admin/DangerConfirm.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { unsplashAt } from '../../lib/images.js'

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' }
]

// Small enough that a page is a screenful and large enough that eight products
// still fit on one - the boundary only starts mattering as the catalogue grows.
const PER_PAGE = 10

/**
 * The row thumbnail deliberately reuses the public delivery helper rather than
 * pointing an <img> straight at row.primaryImage.url. unsplashAt() appends width
 * parameters to an Unsplash URL and passes anything else through untouched, so
 * the six seeded remote photographs are fetched at thumbnail size instead of at
 * 1000px, and an uploaded /api/uploads/... WebP is served exactly as stored.
 * That is the same helper ProductCard uses; there is no second image path.
 */
function Thumb({ product }) {
  const url = product.primaryImage?.url
  if (!url) {
    return (
      <span className="admin-thumb is-empty" role="img"
            aria-label={`${product.name} - no image set`}>
        <Icon name="image" size={16}/>
      </span>
    )
  }
  return (
    <img className="admin-thumb" src={unsplashAt(url, 120)}
         alt={product.primaryImage.altText || ''} loading="lazy" decoding="async"/>
  )
}

export default function AdminProductsPage() {
  const { products, status, error, reload } = useAdminProducts()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Filtering client-side: the whole catalogue is already in memory and small.
  // The API accepts ?search= for when that stops being true.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    })
  }, [products, search, statusFilter])

  const pageCount = Math.max(1, Math.ceil(visible.length / PER_PAGE))
  // Filtering down to fewer pages while sitting on page 3 would otherwise show
  // an empty table with no explanation.
  useEffect(() => { setPage((p) => Math.min(p, pageCount)) }, [pageCount])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const start = (page - 1) * PER_PAGE
  const rows = visible.slice(start, start + PER_PAGE)

  const confirmDelete = async () => {
    setBusy(true); setDeleteError('')
    try {
      await deleteProduct(confirming.id)
      setConfirming(null)
      await reload(search)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h2 className="admin-page-h2">Products</h2>
          <p className="admin-meta">
            {products.length} in the catalogue
            {visible.length !== products.length && ` · ${visible.length} matching`}
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => goTo('admin/product/new')}>
          New product
        </button>
      </header>

      <div className="admin-head-actions">
        <label className="admin-search">
          <span className="admin-visually-hidden">Search products by name or slug</span>
          <input
            type="search" placeholder="Search by name or slug…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="admin-field admin-filter">
          <span className="admin-visually-hidden">Filter by status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {status === 'loading' && <p className="admin-skeleton" role="status">Loading products…</p>}

      {status === 'error' && (
        <div className="admin-danger-panel" role="alert">
          <h3>Could not load products</h3>
          <p>{error}</p>
          <button className="admin-btn" onClick={() => reload(search)}>Try again</button>
        </div>
      )}

      {status === 'ready' && visible.length === 0 && (
        <div className="admin-empty">
          <h3>{search || statusFilter ? 'No products match' : 'No products yet'}</h3>
          <p>
            {search || statusFilter
              ? 'Clear the search and status filter to see the full catalogue.'
              : 'Products created here appear on the public catalogue once published.'}
          </p>
        </div>
      )}

      {status === 'ready' && visible.length > 0 && (
        <>
          <table className="admin-table">
            <caption className="admin-visually-hidden">Product catalogue</caption>
            <thead>
              <tr>
                <th scope="col"><span className="admin-visually-hidden">Image</span></th>
                <th scope="col">Name</th>
                <th scope="col">Trade</th>
                <th scope="col">Status</th>
                <th scope="col">Certifications</th>
                <th scope="col"><span className="admin-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const unverified = p.certifications.filter((c) => !c.verifiable).length
                return (
                  <tr key={p.id}>
                    <td className="admin-thumb-cell"><Thumb product={p}/></td>
                    <td>
                      <button className="admin-link" onClick={() => goTo(`admin/product/${p.id}`)}>{p.name}</button>
                      <span className="admin-meta">/{p.slug}</span>
                    </td>
                    <td><span className="admin-chip">{p.trade === 'IMPORT' ? 'Import' : 'Export'}</span></td>
                    <td>
                      <span className={p.status === 'PUBLISHED' ? 'admin-chip is-published' : 'admin-chip is-draft'}>
                        {p.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      {p.certifications.length === 0 && <span className="admin-meta">None</span>}
                      {unverified > 0 && (
                        <span className="admin-chip is-unverified">{unverified} unverified</span>
                      )}
                      {unverified === 0 && p.certifications.length > 0 && (
                        <span className="admin-chip is-verified">{p.certifications.length} verified</span>
                      )}
                    </td>
                    <td className="admin-row-actions">
                      <button className="admin-btn" onClick={() => goTo(`admin/product/${p.id}`)}>Edit</button>
                      <button
                        className="admin-btn admin-btn-danger-quiet"
                        onClick={() => { setConfirming(p); setDeleteError('') }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <nav className="admin-pagination" aria-label="Product pages">
            <p className="admin-meta" role="status">
              Showing {start + 1}–{Math.min(start + PER_PAGE, visible.length)} of {visible.length}
            </p>
            {/* Rendered only when there is more than one page. A permanently
                disabled pager on a catalogue of eight is decoration pretending
                to be a control. */}
            {pageCount > 1 && (
              <div className="admin-pages">
                <button className="admin-btn" disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}>Previous</button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={n === page ? 'admin-btn admin-page-num is-current' : 'admin-btn admin-page-num'}
                    aria-current={n === page ? 'page' : undefined}
                    aria-label={`Page ${n} of ${pageCount}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button className="admin-btn" disabled={page === pageCount}
                        onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </nav>
        </>
      )}

      {confirming && (
        <DangerConfirm
          title={`Delete “${confirming.name}”?`}
          body={`This removes the product, its ${confirming.varieties.length} varieties and its ${confirming.certifications.length} certification records. It cannot be undone.`}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          busy={busy} error={deleteError}
          onCancel={() => setConfirming(null)} onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}
