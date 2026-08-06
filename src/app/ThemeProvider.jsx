import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} })

// The initial theme is resolved by the bootstrap script in index.html so the
// first painted frame is already correct. Reading it back off the element
// (rather than re-reading localStorage) keeps one source of truth and avoids a
// storage hit on every render - the previous non-lazy useState argument ran
// localStorage.getItem on each one.
const initialTheme = () => document.documentElement.dataset.theme || 'light'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Storage is unavailable in sandboxed frames and when cookies are blocked;
    // losing the preference is acceptable, throwing during render is not.
    try { localStorage.setItem('solstice-theme', theme) } catch { /* ignore */ }
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }
