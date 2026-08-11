import { useEffect, useRef } from 'react'
import { Header } from '../components/layout/Header.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { WhatsAppFab } from '../components/layout/WhatsAppFab.jsx'
import { BackToTop } from '../components/layout/BackToTop.jsx'
import { ChatWidget } from '../features/chat/index.js'
import { useProductCatalogue } from '../features/products/index.js'
import HomePage from '../pages/home/HomePage.jsx'
import AboutPage from '../pages/about/AboutPage.jsx'
import ServicesPage from '../pages/services/ServicesPage.jsx'
import ProductsPage from '../pages/products/ProductsPage.jsx'
import ProductDetailPage from '../pages/products/ProductDetailPage.jsx'
import TeamPage from '../pages/team/TeamPage.jsx'
import GalleryPage from '../pages/gallery/GalleryPage.jsx'
import ContactPage from '../pages/contact/ContactPage.jsx'
import { NavigationProvider } from './navigation.js'
import { useTheme } from './ThemeProvider.jsx'
import { goTo, useHashRoute, isProductRoute, productSlug, isProductsRoute, productsTrade, isAdminRoute } from './router.js'
import AdminApp from '../pages/admin/AdminApp.jsx'

export function App() {
  const { theme, setTheme } = useTheme()
  const route = useHashRoute()
  const [products] = useProductCatalogue()
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
  // The catalogue's direction lives in the route, so the header dropdown and the
  // on-page switch read from one source and cannot disagree, and a filtered view
  // is a shareable URL.
  const onProducts = isProductsRoute(route)
  const trade = productsTrade(route)
  const pages = {
    home: <HomePage selectProduct={selectProduct} theme={theme}/>,
    about: <AboutPage/>,
    services: <ServicesPage/>,
    team: <TeamPage/>,
    gallery: <GalleryPage/>,
    contact: <ContactPage/>
  }

  // The admin renders instead of the marketing shell, not inside it: it has its
  // own chrome and must not inherit the site header, footer, chat widget or the
  // floating corner column.
  if (isAdminRoute(route)) return <AdminApp route={route}/>

  return <NavigationProvider value={goTo}>
    {/* A <button>, not an <a href="#main-content">: the router owns location.hash,
        so an in-page anchor would be read as a navigation to a "main-content"
        route and bounce the user to the home page. */}
    <button className="skip-link" onClick={() => mainRef.current?.focus()}>Skip to content</button>
    <Header route={onProduct ? 'products' : route} theme={theme} setTheme={setTheme}/>
    <main id="main-content" ref={mainRef} tabIndex={-1}>
      {onProduct
        ? <ProductDetailPage product={product} selectProduct={selectProduct}/>
        : onProducts
          // key remounts on a direction change, which resets the category chips.
          // Carrying "Fresh fruit" from one direction into another that has no
          // fruit would strand the grid empty for a reason nobody chose.
          ? <ProductsPage key={trade ?? 'all'} trade={trade} selectProduct={selectProduct}/>
          : (pages[route] || pages.home)}
    </main>
    <Footer/>
    <ChatWidget/>
    <WhatsAppFab/>
    {/* Shares the skip link's target so 'top of the page' means one place. */}
    <BackToTop targetRef={mainRef}/>
  </NavigationProvider>
}
