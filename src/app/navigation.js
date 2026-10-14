import { createContext, useContext } from 'react'

// The navigation seam. Components call useNavigate() and receive a
// (route: string) => void - they never learn how routing is implemented.
// app/router.js supplies the hash implementation today; the Astro rebuild
// swaps in a real one without any leaf component changing.
const NavigationContext = createContext(() => {})

export const NavigationProvider = NavigationContext.Provider
export function useNavigate() { return useContext(NavigationContext) }

/* The URL for a route, so a link can carry a real href. Crawlers - Google
   included - discover pages only through <a href>; a <button> that navigates in
   a click handler is invisible to them. Supplied by App from app/router.js, so
   components still never learn how routes map to URLs. */
const HrefContext = createContext((route) => `/${route}`)

export const HrefProvider = HrefContext.Provider
export function useHref() { return useContext(HrefContext) }
