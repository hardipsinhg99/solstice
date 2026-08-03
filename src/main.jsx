import { createRoot } from 'react-dom/client'
import { App } from './app/App.jsx'
import { ThemeProvider } from './app/ThemeProvider.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App/>
  </ThemeProvider>
)
