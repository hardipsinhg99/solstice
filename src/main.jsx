import { createRoot } from 'react-dom/client'
import { migrateLegacyHash } from './app/router.js'
import { beginPrerenderBoot } from './lib/prerender.js'
import { App } from './app/App.jsx'
import { ThemeProvider } from './app/ThemeProvider.jsx'
import './styles/index.css'

/* Before render, not inside an effect. An indexed or bookmarked
   solsticellp.com/#about must arrive at /about without the app first painting
   Home and then correcting itself - a visible flash, and a redirect a crawler
   would have to execute JavaScript to observe. */
migrateLegacyHash()

const container = document.getElementById('root')

/* A prerendered page arrives with #root already full. Say so before React
   renders over it, so the motion code can keep its first frame identical to
   the static one - see lib/prerender.js. An empty #root is an ordinary
   client-rendered load and nothing changes. */
if (container.firstElementChild) beginPrerenderBoot()

createRoot(container).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)
