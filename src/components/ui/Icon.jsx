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
    factory: <><path d="M3 21V10.5l6 3.6V10.5l6 3.6V7l6 3.6V21Z"/><path d="M7.5 21v-3.4M13 21v-3.4M18 21v-2.6"/></>,
    // Added for the admin shell. Same 24x24 grid, same 1.8 stroke, same cap and
    // join as every glyph above - extending the sprite, not starting a second
    // icon system, and still no icon-library weight in the bundle. These five
    // are the only ones the sidebar, the bell and the gallery manager needed;
    // Products reuses `box` and the collapse toggle reuses `menu`.
    grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 17 5-4.5 4 3.2 3-2.4 4 3.7"/></>,
    // Sliders rather than a cog. A minimal cog at 17px is a small circle with
    // eight radial ticks, which is pixel-for-pixel the `sun` glyph above - and
    // `sun` is the public site's theme toggle. Two icons that mean different
    // things must not look the same at the size they are actually used.
    sliders: <><path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2.2"/><circle cx="9" cy="16" r="2.2"/></>,
    bell: <><path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/></>,
    // Footer contact + social. Outline marks, not the brands' filled logos: the
    // whole sprite is fill:none / stroke 1.8, and `instagram` above was already
    // drawn that way. A filled Facebook "f" beside an outlined Instagram is two
    // icon systems in one row, which is exactly what this sprite exists to avoid.
    phone: <><path d="M7 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5.5 5.7 2 2 0 0 1 7.5 3.5Z"/></>,
    whatsapp: <><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6L4 20Z"/><path d="M9 9.2c.3 1 .9 2 1.7 2.8.8.8 1.8 1.4 2.8 1.7l1-1.2 1.8.8v1.4c-.6.4-1.4.4-2.2.2a8.6 8.6 0 0 1-5.5-5.5c-.2-.8-.2-1.6.2-2.2h1.4l.8 1.8L9 9.2Z"/></>,
    facebook: <><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M15 8h-1.5A1.5 1.5 0 0 0 12 9.5V12m-1.6 0h3.8M13 12v5"/></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 10.5V17M8 7.6v.01M12 17v-3.6a2 2 0 0 1 4 0V17"/></>
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
