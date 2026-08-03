import { createContext, useContext } from 'react'

// The navigation seam. Components call useNavigate() and receive a
// (route: string) => void - they never learn how routing is implemented.
// app/router.js supplies the hash implementation today; the Astro rebuild
// swaps in a real one without any leaf component changing.
const NavigationContext = createContext(() => {})

export const NavigationProvider = NavigationContext.Provider
export function useNavigate() { return useContext(NavigationContext) }
