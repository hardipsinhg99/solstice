import { lazy, Suspense, useEffect, useRef } from 'react'
import { Header } from '../components/layout/Header.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { WhatsAppFab } from '../components/layout/WhatsAppFab.jsx'
import { BackToTop } from '../components/layout/BackToTop.jsx'
import { useScrollAway } from '../components/motion/useScrollAway.js'
import { useProductCatalogue } from '../features/products/index.js'
import HomePage from '../pages/home/HomePage.jsx'
import AboutPage from '../pages/about/AboutPage.jsx'
import ServicesPage from '../pages/services/ServicesPage.jsx'
import ProductsPage from '../pages/products/ProductsPage.jsx'
import ProductDetailPage from '../pages/products/ProductDetailPage.jsx'
import TeamPage from '../pages/team/TeamPage.jsx'
import NetworkPage from '../pages/network/NetworkPage.jsx'
import GalleryPage from '../pages/gallery/GalleryPage.jsx'
import ContactPage from '../pages/contact/ContactPage.jsx'
import { NavigationProvider } from './navigation.js'
import { useTheme } from './ThemeProvider.jsx'
import { goTo, usePathRoute, isKnownRoute, isProductRoute, productSlug, isProductsRoute, productsTrade, productsCategory, isAdminRoute } from './router.js'
import { NotFound } from '../components/layout/NotFound.jsx'
import { setCanonical } from '../lib/head.js'

/* Split out of the main bundle, not out of the app.
 *
 * The admin is ~3,500 lines a buyer never runs, and it was being downloaded on
 * every visit - on the Indian mobile connections this site is read on, that is
 * real money and real seconds. It is safe to defer because no admin route is
 * prerendered: there is no static content for a Suspense fallback to replace,
 * so nothing can flash.
 *
 * The public pages stay eager for exactly that reason. They DO arrive as
 * prerendered HTML, and React replaces that DOM on boot: a lazy page would
 * blank the finished content a visitor is already reading while its chunk
 * downloads. Code splitting is worth seconds; that would cost the first
 * impression.
 *
 * The chat widget is deferred as a floating control that is not part of the
 * page's content and appears a beat later than the page.
 */
const AdminApp = lazy(() => import('../pages/admin/AdminApp.jsx'))
const ChatWidget = lazy(() => import('../features/chat/index.js').then((m) => ({ default: m.ChatWidget })))

// Routes whose first section is a dark full-bleed hero.
const HERO_ROUTES = new Set(['home', 'about', 'network'])

export function App() {
  // Keeps the fixed corner stack from sitting on headings mid-scroll. See the
  // hook for why this is behaviour rather than a layout inset.
  useScrollAway()

  const { theme, setTheme } = useTheme()
  const route = usePathRoute()
  const [products, catalogueStatus] = useProductCatalogue()
  const mainRef = useRef(null)
  const firstRender = useRef(true)

  useEffect(() => {
    // `behavior: 'instant'` overrides html{scroll-behavior:smooth}. Without it,
    // navigating from the foot of a long page animated a multi-second scroll
    // through the whole document before the new page was readable.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // Moving focus to the new <main> is what makes hash routing usable without a
    // mouse: nothing else tells a screen reader the page changed, and keyboard
    // focus would otherwise stay on the nav button that was just activated.
    // Skipped on the very first render so a deep link does not steal focus from
    // the document start.
    if (firstRender.current) { firstRender.current = false; return }
    mainRef.current?.focus()
  }, [route])


  const selectProduct = (slug) => goTo(`product/${slug}`)
  const onProduct = isProductRoute(route)
  const product = onProduct ? products.find(p => p.slug === productSlug(route)) : null
  // A slug no published product has is a 404, not a page. Only once the
  // catalogue has actually loaded: while it is in flight every slug looks
  // unknown, and flashing Not Found at a buyer following a real link - then
  // replacing it with the product - is worse than a moment of nothing.
  // Unresolved it is a soft 404: /products/anything-at-all answered 200 with
  // the full export listing, which is an unbounded supply of indexable URLs
  // all carrying the same content.
  const unknownProduct = onProduct && catalogueStatus === 'ready' && !product

  // The canonical follows the URL, not the render: it must be right on the
  // first paint of a deep link and after every in-app navigation. Declared
  // after the product lookup it reads - a hook may sit anywhere, the value it
  // closes over may not. Admin pages and unknown products get none: the first
  // are noindex at the server, the second do not exist.
  useEffect(() => {
    setCanonical(isAdminRoute(route) || unknownProduct ? null : window.location.pathname)
  }, [route, unknownProduct])
  // The catalogue's direction lives in the route, so the header dropdown and the
  // on-page switch read from one source and cannot disagree, and a filtered view
  // is a shareable URL.
  const onProducts = isProductsRoute(route)
  const trade = productsTrade(route)
  // Optional category pre-selection, e.g. from a Home feature card.
  const category = productsCategory(route)
  const pages = {
    home: <HomePage theme={theme}/>,
    about: <AboutPage/>,
    services: <ServicesPage/>,
    team: <TeamPage/>,
    network: <NetworkPage/>,
    gallery: <GalleryPage/>,
    contact: <ContactPage/>
  }

  // The admin renders instead of the marketing shell, not inside it: it has its
  // own chrome and must not inherit the site header, footer, chat widget or the
  // floating corner column.
  if (isAdminRoute(route)) {
    return (
      <Suspense fallback={<p className="admin-skeleton" role="status">Loading the admin…</p>}>
        <AdminApp route={route}/>
      </Suspense>
    )
  }

  return <NavigationProvider value={goTo}>
    {/* A <button>, not an <a href="#main-content">: the router owns location.hash,
        so an in-page anchor would be read as a navigation to a "main-content"
        route and bounce the user to the home page. */}
    <button className="skip-link" onClick={() => mainRef.current?.focus()}>Skip to content</button>
    {/* A category list is still its direction's page, so the header's Export or
        Import item stays highlighted on 'products/export/fresh-fruit', and a
        whole-catalogue one ('products/all/fresh-fruit') reads as Products. */}
    <Header route={onProduct ? 'products' : (onProducts ? (trade ? `products/${trade}` : 'products') : route)} theme={theme} setTheme={setTheme}/>
    {/* data-hero says whether this route paints a dark hero behind the fixed
        header, deciding both the header's transparency and whether <main>
        offsets the header height.
    
        It comes from the ROUTE, which is known at first paint. The CSS used
        :has(.network-hero), and that hero renders only once its CMS section
        arrives - so <main> started at padding-top:82px and dropped to 0 when the
        data landed. An 82px shift every load: measured CLS 0.70 on GTN against
        0.05 before. Layout must never depend on content still in flight. */}
    <main id="main-content" ref={mainRef} tabIndex={-1}
          data-hero={HERO_ROUTES.has(route) ? '' : undefined}>
      {unknownProduct
        ? <NotFound/>
        : onProduct
        ? <ProductDetailPage product={product} selectProduct={selectProduct}/>
        : onProducts
          // key remounts on a direction change, which resets the category chips.
          // Carrying "Fresh fruit" from one direction into another that has no
          // fruit would strand the grid empty for a reason nobody chose. The
          // category is in the key too, so arriving from a Home card at a
          // different category applies it rather than keeping the old chip.
          ? <ProductsPage key={`${trade ?? 'all'}/${category ?? ''}`} trade={trade} category={category} selectProduct={selectProduct}/>
          : (pages[route] ?? <NotFound/>)}
    </main>
    <Footer/>
    <Suspense fallback={null}><ChatWidget/></Suspense>
    <WhatsAppFab/>
    {/* Shares the skip link's target so 'top of the page' means one place. */}
    <BackToTop targetRef={mainRef}/>
  </NavigationProvider>
}
