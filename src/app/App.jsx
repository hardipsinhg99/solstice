import { useEffect } from 'react'
import { Header } from '../components/layout/Header.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { ChatWidget } from '../features/chat/index.js'
import { products } from '../data/products.js'
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
import { goTo, useHashRoute, isProductRoute, productSlug } from './router.js'

export function App() {
  const { theme, setTheme } = useTheme()
  const route = useHashRoute()

  useEffect(() => { window.scrollTo(0, 0) }, [route])

  const selectProduct = (slug) => goTo(`product/${slug}`)
  const onProduct = isProductRoute(route)
  const product = onProduct ? products.find(p => p.slug === productSlug(route)) : null
  const pages = {
    home: <HomePage selectProduct={selectProduct} theme={theme}/>,
    about: <AboutPage/>,
    services: <ServicesPage/>,
    products: <ProductsPage selectProduct={selectProduct}/>,
    team: <TeamPage/>,
    gallery: <GalleryPage/>,
    contact: <ContactPage/>
  }

  return <NavigationProvider value={goTo}>
    <Header route={onProduct ? 'products' : route} theme={theme} setTheme={setTheme}/>
    <main>{onProduct ? <ProductDetailPage product={product} selectProduct={selectProduct}/> : (pages[route] || pages.home)}</main>
    <Footer/>
    <ChatWidget/>
  </NavigationProvider>
}
