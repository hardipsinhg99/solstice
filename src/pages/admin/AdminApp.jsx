import { useEffect, useRef } from 'react'
import { useAdminAuth, useDashboard } from '../../features/admin/index.js'
import { goTo, adminSection, adminParam } from '../../app/router.js'
import { AdminSidebar } from '../../components/admin/AdminSidebar.jsx'
import { AdminTopBar } from '../../components/admin/AdminTopBar.jsx'
import AdminLoginPage from './AdminLoginPage.jsx'
import AdminDashboardPage from './AdminDashboardPage.jsx'
import AdminProductsPage from './AdminProductsPage.jsx'
import AdminProductEditPage from './AdminProductEditPage.jsx'
import AdminEnquiriesPage from './AdminEnquiriesPage.jsx'
import AdminGalleryPage from './AdminGalleryPage.jsx'
import AdminPageEditor from './AdminPageEditor.jsx'
import AdminSettingsPage from './AdminSettingsPage.jsx'

// The <h1> lives in the top bar, so each page owns an <h2> and the document has
// exactly one first-level heading rather than one per section.
const TITLES = {
  dashboard: 'Dashboard',
  products: 'Products',
  product: 'Product',
  enquiries: 'Enquiries',
  gallery: 'Gallery',
  settings: 'Site settings',
  'page-home': 'Home',
  'page-about': 'About us',
  'page-team': 'Team'
}

// The guard. Any #admin/* route except #admin/login requires a valid token; the
// token is validated against /auth/me on boot rather than trusted because it
// merely exists, so a stale or revoked one lands on the login screen instead of
// an admin page that then 401s on every request.
export default function AdminApp({ route }) {
  const auth = useAdminAuth()
  const section = adminSection(route)
  const param = adminParam(route)
  const authed = auth.state === 'authenticated'
  const mainRef = useRef(null)

  // The bell must not go stale while the operator sits on the Products page for
  // ten minutes, and the dashboard counts must not lag an edit made two screens
  // away. Refetching on every section change is the cheapest correct answer -
  // one count query per navigation, no polling, no websocket.
  const dashboard = useDashboard()
  const { reload } = dashboard
  useEffect(() => { if (authed) reload() }, [section, authed, reload])

  // Same reasoning as the public shell: moving focus to the new region is what
  // tells a screen reader the page changed under hash routing.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    mainRef.current?.focus()
  }, [section, param])

  if (auth.state === 'checking') {
    return <div className="admin-shell"><p className="admin-skeleton" role="status">Checking session…</p></div>
  }

  if (!authed) return <AdminLoginPage auth={auth}/>

  return (
    <div className="admin-shell">
      <AdminSidebar section={section} admin={auth.admin} onSignOut={auth.logout}/>

      <div className="admin-frame">
        <AdminTopBar
          title={TITLES[section] ?? 'Dashboard'}
          admin={auth.admin}
          notifications={dashboard.data?.notifications}
          onSignOut={auth.logout}
          onOpenEnquiry={(id) => goTo(`admin/enquiries/${id}`)}
        />

        <main className="admin-main" id="admin-main" ref={mainRef} tabIndex={-1}>
          {/* Dashboard is the fallback now: adminSection() defaults to
              'dashboard', so a bare #admin and any unknown section land there
              rather than deep in the catalogue. */}
          {section === 'product' ? <AdminProductEditPage productId={param}/>
            : section === 'products' ? <AdminProductsPage/>
              : section === 'enquiries' ? <AdminEnquiriesPage highlightId={param}/>
                : section === 'gallery' ? <AdminGalleryPage/>
                  : section.startsWith('page-') ? <AdminPageEditor slug={section.slice(5)}/>
                    : section === 'settings' ? <AdminSettingsPage/>
                      : <AdminDashboardPage dashboard={dashboard}/>}
        </main>
      </div>
    </div>
  )
}
