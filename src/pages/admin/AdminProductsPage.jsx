import { useMemo, useState } from 'react'
import { useAdminProducts, deleteProduct } from '../../features/admin/index.js'
import { goTo } from '../../app/router.js'
import { DangerConfirm } from '../../components/admin/DangerConfirm.jsx'

export default function AdminProductsPage() {
  const { products, status, error, reload } = useAdminProducts()
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Filtering client-side: 8 records, already in memory. The API accepts a
  // ?search= param for when that stops being true.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
  }, [products, search])

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
          <h1>Products</h1>
          <p className="admin-meta">{products.length} in the catalogue</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => goTo('admin/product/new')}>
          New product
        </button>
      </header>

      <label className="admin-search">
        <span className="admin-visually-hidden">Search products by name or slug</span>
        <input
          type="search" placeholder="Search by name or slug…"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </label>

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
          <h3>{search ? 'No products match that search' : 'No products yet'}</h3>
          <p>
            {search
              ? 'Clear the search to see the full catalogue.'
              : 'Products created here appear on the public catalogue once published.'}
          </p>
        </div>
      )}

      {status === 'ready' && visible.length > 0 && (
        <table className="admin-table">
          <caption className="admin-visually-hidden">Product catalogue</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Trade</th>
              <th scope="col">Status</th>
              <th scope="col">Certifications</th>
              <th scope="col"><span className="admin-visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const unverified = p.certifications.filter((c) => !c.verifiable).length
              return (
                <tr key={p.id}>
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
      )}

      {confirming && (
        <DangerConfirm
          title={`Delete \u201c${confirming.name}\u201d?`}
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
