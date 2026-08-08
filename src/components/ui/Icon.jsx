// 15-glyph inline SVG sprite. No icon-library weight, no network request.
export const Icon = ({ name, size = 20 }) => {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    // The left meridian's final pair read `0-18`, mirroring the curve upward out
    // of the circle instead of down to the south pole - the globe rendered with
    // one meridian and a stray arc above it.
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.6 3 14.4 0 18M12 3c-3 3.6-3 14.4 0 18"/></>,
    leaf: <><path d="M20 4C10 4 4 9 4 18c8 0 15-5 16-14Z"/><path d="M4 18c3-4 7-7 12-9"/></>,
    box: <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
    check: <path d="m5 12 4.2 4L19 6.5"/>,
    ship: <><path d="M3 17h18l-3 4H6l-3-4Z"/><path d="M6 17V9h12v8M9 9V5h6v4M2 21c2 .9 4 .9 6 0 2 .9 4 .9 6 0"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.7-.85L4 20l1.35-3.65A7.2 7.2 0 0 1 4 12a7.5 7.5 0 0 1 8-7.5 7.5 7.5 0 0 1 8 7Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-1.5 7 5-2.5 5 2.5-1.5-7"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></>,
    // Down-caret for the nav dropdown trigger. Same 24x24 grid and stroke
    // weight as the rest of the sprite - no second icon system.
    chevron: <path d="m6 9.5 6 6 6-6"/>,
    // Added for the About page's industry set. Same 24x24 grid, same stroke
    // weight and cap style as the rest of the sprite - no second icon system.
    ceramic: <><path d="M9.5 3h5l-.8 3.2c1.9 1 3.3 3 3.3 5.6V18a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3v-6.2c0-2.6 1.4-4.6 3.3-5.6L9.5 3Z"/><path d="M8 13h8"/></>,
    layers: <><path d="m12 3 8.5 4.7L12 12.4 3.5 7.7 12 3Z"/><path d="m3.5 12.3 8.5 4.7 8.5-4.7"/></>,
    factory: <><path d="M3 21V10.5l6 3.6V10.5l6 3.6V7l6 3.6V21Z"/><path d="M7.5 21v-3.4M13 21v-3.4M18 21v-2.6"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
