import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Header } from './components/layout/Header.jsx'
import { Footer } from './components/layout/Footer.jsx'
import { ChatWidget } from './features/chat/index.js'
import { products } from './data/products.js'
import HomePage from './pages/home/HomePage.jsx'
import AboutPage from './pages/about/AboutPage.jsx'
import ServicesPage from './pages/services/ServicesPage.jsx'
import ProductsPage from './pages/products/ProductsPage.jsx'
import ProductDetailPage from './pages/products/ProductDetailPage.jsx'
import TeamPage from './pages/team/TeamPage.jsx'
import GalleryPage from './pages/gallery/GalleryPage.jsx'
import ContactPage from './pages/contact/ContactPage.jsx'
import { NavigationProvider } from './app/navigation.js'
import './styles/index.css'

const goTo = (route) => { window.location.hash = route === 'home' ? '' : route }

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('solstice-theme') || 'light')
  const [route, setRoute] = useState(location.hash.slice(1) || 'home')

  useEffect(() => {
    const sync = () => setRoute(location.hash.slice(1) || 'home')
    addEventListener('hashchange', sync)
    return () => removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('solstice-theme', theme)
  }, [theme])

  useEffect(() => { window.scrollTo(0, 0) }, [route])

  const selectProduct = (slug) => goTo(`product/${slug}`)
  const product = route.startsWith('product/') ? products.find(p => p.slug === route.split('/')[1]) : null
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
    <Header route={route.startsWith('product/') ? 'products' : route} theme={theme} setTheme={setTheme}/>
    <main>{route.startsWith('product/') ? <ProductDetailPage product={product} selectProduct={selectProduct}/> : (pages[route] || pages.home)}</main>
    <Footer/>
    <ChatWidget/>
  </NavigationProvider>
}

createRoot(document.getElementById('root')).render(<App />)
