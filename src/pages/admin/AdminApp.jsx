import { useAdminAuth } from '../../features/admin/index.js'
import { goTo, adminSection, adminParam } from '../../app/router.js'
import AdminLoginPage from './AdminLoginPage.jsx'
import AdminProductsPage from './AdminProductsPage.jsx'
import AdminProductEditPage from './AdminProductEditPage.jsx'
import AdminEnquiriesPage from './AdminEnquiriesPage.jsx'
import AdminSettingsPage from './AdminSettingsPage.jsx'

// The guard. Any #admin/* route except #admin/login requires a valid token; the
// token is validated against /auth/me on boot rather than trusted because it
// merely exists, so a stale or revoked one lands on the login screen instead of
// an admin page that then 401s on every request.
export default function AdminApp({ route }) {
  const auth = useAdminAuth()
  const section = adminSection(route)
  const param = adminParam(route)

  if (auth.state === 'checking') {
    return <div className="admin-shell"><p className="admin-skeleton" role="status">Checking session…</p></div>
  }

  if (auth.state !== 'authenticated') {
    return <AdminLoginPage auth={auth}/>
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Admin">
        <span className="admin-brand">Solstice admin</span>
        <button
          className={section === 'products' || section === 'product' ? 'admin-nav-link is-active' : 'admin-nav-link'}
          onClick={() => goTo('admin/products')}
        >
          Products
        </button>
        <button
          className={section === 'enquiries' ? 'admin-nav-link is-active' : 'admin-nav-link'}
          onClick={() => goTo('admin/enquiries')}
        >
          Enquiries
        </button>
        <button
          className={section === 'settings' ? 'admin-nav-link is-active' : 'admin-nav-link'}
          onClick={() => goTo('admin/settings')}
        >
          Settings
        </button>
        <div className="admin-nav-foot">
          <span className="admin-meta">{auth.admin?.email}</span>
          <button className="admin-btn" onClick={auth.logout}>Sign out</button>
          <button className="admin-btn" onClick={() => goTo('home')}>View site</button>
        </div>
      </nav>

      <main className="admin-main">
        {/* Products stays the fallback: adminSection() defaults to 'products',
            so a bare #admin and any unknown section land on the catalogue. */}
        {section === 'product' ? <AdminProductEditPage productId={param}/>
          : section === 'enquiries' ? <AdminEnquiriesPage/>
            : section === 'settings' ? <AdminSettingsPage/>
              : <AdminProductsPage/>}
      </main>
    </div>
  )
}
