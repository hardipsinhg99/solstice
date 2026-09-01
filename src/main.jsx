import { createRoot } from 'react-dom/client'
import { migrateLegacyHash } from './app/router.js'
import { App } from './app/App.jsx'
import { ThemeProvider } from './app/ThemeProvider.jsx'
import './styles/index.css'

/* Before render, not inside an effect. An indexed or bookmarked
   solsticellp.com/#about must arrive at /about without the app first painting
   Home and then correcting itself - a visible flash, and a redirect a crawler
   would have to execute JavaScript to observe. */
migrateLegacyHash()

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)
