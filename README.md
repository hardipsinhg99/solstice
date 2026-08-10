# Solstice Trading International LLP — website

Lead-generation website for an India-headquartered exporter of fresh fruit, vegetables, spices and
food staples.

The visitor is an overseas importer, wholesaler or retail sourcing manager who found the company via
search or a trade portal, will spend roughly **90 seconds** deciding whether this is a real operation,
and will then either send an enquiry or leave. Every decision in this repo serves that, not brand
expression. Specifications, certifications, packing and loadability outrank mission statements.

---

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Admin CMS](#admin-cms)
- [How the app fits together](#how-the-app-fits-together)
- [Project structure](#project-structure)
- [Request flow](#request-flow)
- [Editing content](#editing-content)
- [Styling and theming](#styling-and-theming)
- [Accessibility](#accessibility-wcag-22-aa)
- [The hero video](#the-hero-video)
- [The globe](#the-globe)
- [Build and deploy](#build-and-deploy)
- [Verification](#verification)
- [Branches](#branches)
- [Roadmap: the Astro rebuild](#roadmap-the-astro-rebuild)
- [Conventions](#conventions)
- [Gotchas](#gotchas)

---

## Quick start

**Requires Node `^20.19.0 || >=22.12.0`** (Vite 8's engine range). Verified on Node 24.18.1 / npm 11.16.0.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with React Fast Refresh |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the built `dist/` locally |

Output is a **static folder** — the public site still builds and deploys as one.

> **There is now a backend**, added in Phase 1a: a NestJS + Prisma + PostgreSQL API in `server/`
> that owns the product catalogue. The public site *fetches* products from it rather than importing
> a static file, so **`npm run dev` alone will show a catalogue error state** until the API is
> running. See [Admin CMS](#admin-cms).

---

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. `.env.local` is gitignored.

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `VITE_FORM_ENDPOINT` | Where the enquiry form POSTs. Formspree URL, or `https://api.web3forms.com/submit`. |
| `VITE_FORM_ACCESS_KEY` | Web3Forms public access key. Leave empty for Formspree. |

> **Every `VITE_`-prefixed variable is inlined into the client bundle and is public.**
> Only ever put a form provider's *public* form id or access key here — never a private API key,
> SMTP credential or anything you would not print on the page.

**With no endpoint configured the form still works safely**: it reports a clear error and offers a
`mailto:` fallback pre-filled with everything the buyer typed. A lead is never silently discarded.

The API has its **own, separate** environment file at `server/.env` (`DATABASE_URL`, `JWT_SECRET`,
`ADMIN_SEED_*`, `CORS_ORIGIN`). Those are server-side secrets and must **never** be given a `VITE_`
prefix — see [`docs/admin.md`](docs/admin.md#environment-variables).

---

## Admin CMS

Phase 1a shipped a database-backed admin panel. **Full manual: [`docs/admin.md`](docs/admin.md).**
Design rationale: [`docs/admin-cms-blueprint.md`](docs/admin-cms-blueprint.md).

| | |
|---|---|
| **API** | NestJS 10 + Prisma 5 + PostgreSQL, in `server/` |
| **Admin UI** | Routes *inside this SPA* at `#admin/*`, not a separate app |
| **Scope today** | Products only. Pages and Enquiries are designed, not built |
| **Auth** | Single admin, JWT, no roles |

```bash
docker run -d --name solstice-cms-pg -e POSTGRES_USER=solstice \
  -e POSTGRES_PASSWORD=solstice_dev_pw -e POSTGRES_DB=solstice_cms \
  -p 55432:5432 postgres:16-alpine

cd server && npm install && cp .env.example .env   # then fill it in
npx prisma generate && npx prisma migrate dev && npm run seed
npm run start:dev                                  # :3001

npm run dev                                        # repo root, :5173
```

Admin at `http://localhost:5173/#admin/products`. `vite.config.js` proxies `/api` → `:3001`, so the
two are same-origin locally and CORS never applies in development.

> **`src/data/products.js` is no longer the live source.** It is kept only so `npm run seed` can
> bootstrap a fresh database. Editing it changes nothing on the site — edit products in the admin.

---

## How the app fits together

Vite 8 + React 19 SPA, hash-routed, no router library, no state library, no CSS framework.

```
Browser
  └─ index.html                      <head>: SEO meta, OG/Twitter cards, favicons
       └─ src/main.jsx               mount only (10 lines)
            └─ ThemeProvider         data-theme + localStorage
                 └─ App              route switch, scroll reset
                      ├─ Header      sticky, shrinks 82→68px on scroll
                      ├─ <main>      the current page
                      ├─ Footer
                      └─ ChatWidget
```

**Dependencies are deliberately minimal** — `react`, `react-dom`, `vite`, `@vitejs/plugin-react`,
and `cobe` (the WebGL globe). All pinned to exact versions. That keeps the bundle at ~80 kB gzipped
and means there is very little to keep upgrading before the rebuild.

---

## Project structure

`src/` is decomposed page-wise. **This is the target structure for the Astro rebuild**, not a
temporary arrangement — migrating should mean swapping the shell and router, not redesigning the tree.

```
src/
├── app/
│   ├── App.jsx              shell, route switch, scroll reset
│   ├── router.js            hash routing — the one file the migration deletes
│   ├── navigation.js        the navigation seam (framework-agnostic)
│   └── ThemeProvider.jsx    data-theme, localStorage 'solstice-theme'
│
├── components/
│   ├── ui/                  Icon · Button · Eyebrow · Card    (zero domain knowledge)
│   ├── layout/              Header · Nav · Footer · PageTitle
│   └── motion/              Reveal · useInView
│
├── features/                domain logic, used across pages (one index.js barrel each)
│   ├── products/            ProductCard · ProductGrid · ProductFilter · RelatedProducts
│   ├── enquiry/             EnquiryForm · useEnquirySubmit
│   ├── globe/               Globe · useGlobeTheme
│   └── chat/                ChatWidget
│
├── pages/                   one folder per route, sections/ colocated
│   ├── home/                HomePage + sections/HeroMedia
│   ├── about/ services/ team/ gallery/
│   ├── products/            ProductsPage · ProductDetailPage
│   └── contact/             ContactPage + sections/Faq
│
├── data/                    products · navigation · faqs · globe   ← the seam a CMS plugs into
├── lib/                     constants.js
├── styles/                  see "Styling and theming"
└── main.jsx                 createRoot only
```

### Import direction is one-way

```
pages → features → components → lib
                        ↘  data  ↙        (leaf: imported by anything, imports nothing)
```

- A `features/` module must **never** import from `pages/`.
- A `components/ui` primitive must **never** import domain data.
- If you hit a case where this seems impossible, raise it — that's a design smell, not something to
  route around.

### Where new code goes

| It is… | It goes in |
|---|---|
| A primitive with no domain knowledge | `components/ui/` |
| Site chrome (header, footer, nav) | `components/layout/` |
| Domain logic used by **2+ pages** | `features/<domain>/` |
| Used by exactly **one** page | `pages/<page>/sections/` |

**Promote to `features/` only when a second page actually consumes it.** Never speculatively.

**No barrel files except one per `features/` folder** — barrels at every level hurt HMR and
tree-shaking for no ergonomic gain at this size.

**Named exports everywhere except pages**, which are default exports.

---

## Request flow

Routing is hash-based, about eight lines, in `src/app/router.js`.

```
#            → home            #team              → team
#about       → about           #gallery           → gallery
#services    → services        #contact           → contact
#products    → products        #product/<slug>    → product detail
```

Product slugs: `mangoes`, `pomegranates`, `grapes`, `onions`, `okra`, `mixed-vegetables`.

An unknown hash falls back to the home page. Every route change fires `window.scrollTo(0, 0)`.

### Navigation never couples to the router

Components call `useNavigate()` from `app/navigation.js` and receive a `(route: string) => void`.
**Only `app/router.js` knows routing is hash-based.**

```jsx
import { useNavigate } from '../../app/navigation.js'

function Something() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('contact')}>Enquire</button>
}
```

Do **not** import `goTo` into a component. This indirection is the whole reason the rebuild only has
to replace one file.

---

## Editing content

Content splits in two since Phase 1a:

- **Products live in PostgreSQL** and are edited in the admin panel — see [Admin CMS](#admin-cms).
- **Everything else still lives in `src/data/` as plain JS**, and that folder remains the seam the
  rest of the CMS plugs into.

`src/data/products.js` is still on disk because the seed script reads it to bootstrap a fresh
database, but **editing it no longer changes the site**.

| File | Holds |
|---|---|
| `products.js` | **Seed source only** — the 8 products the database is bootstrapped from. Not read at runtime |
| `navigation.js` | Header nav and (via `.slice()`) the footer columns |
| `faqs.js` | `contactFaq` (contact page accordion) and `chatFaq` (chat widget), exported separately |
| `globe.js` | Globe markers and arcs (lat/lng) |

**To add a product**, use the admin panel (`#admin/products` → New product). Everything downstream —
catalogue, filter, detail page, related products and home feature cards — derives from the API
response, mapped to the historical flat shape at the fetch boundary.

> ⚠️ **Never invent a certification, figure or credential.** Product copy is read by buyers whose
> compliance teams will ask for the certificate. See `docs/website-strategy.md` for the full product
> schema an importer actually needs — the current 9 fields are a subset of the ~30 target fields.

---

## Styling and theming

~700 lines of hand-written CSS, split across `src/styles/`. No framework, no CSS Modules.

```
tokens.css        :root + html[data-theme] custom properties
base.css          reset, typography, scroll reveal, film-grain overlay
layout.css        brand + header
components.css    buttons and links
pages.css         hero → FAQ
footer.css        footer + chat
responsive.css    all media queries (780 / 480 / 390px)
index.css         imports the above, in cascade order
```

### The cascade-order rule

**Each file is a *contiguous slice* of the original single stylesheet, and `index.css` imports them in
that exact order.** Specificity resolution is therefore unchanged from before the split.

- Add a rule to the file whose **cascade position** it belongs to — not the file whose *name* matches
  the component.
- **Never reorder the imports in `index.css`.**
- Do not convert to CSS Modules. On a hand-written cascade that is where regressions live, and it is a
  rebuild-phase decision.

`footer.css` and `responsive.css` exist because "Footer & chat" and the media queries sit *after* every
page rule in the original cascade; folding them into `layout.css` would silently reorder them.

### Design system

Light and dark themes via `:root` + `html[data-theme='dark']` custom properties, persisted to
`localStorage` under `solstice-theme`. Both themes are art-directed — the hero photograph and the
globe's colour triples swap too, they are not an inverted palette.

- **Type**: DM Sans (body) · Playfair Display italic (accents) · DM Mono (eyebrows)
- **Tokens**: `--bg --surface --ink --muted --line --line-strong --green --deep --lime --gold --soft`
- `--line` is **decorative** (hairlines, dividers). `--line-strong` is for **interactive borders** and
  is the one that must clear 3:1.
- `color-mix()` for derived surfaces, `clamp()` for fluid type
- A `feTurbulence` film-grain overlay at 3.5% opacity — one inline SVG data-URI, no network request

---

## Accessibility (WCAG 2.2 AA)

AA is a **requirement, not a phase**. Measured, not asserted:

| Check | Light | Dark | Required |
|---|---|---|---|
| Body text `--muted` on `--bg` | 5.85:1 | 8.82:1 | 4.5:1 |
| Interactive borders `--line-strong` | 3.75:1 | 3.79:1 | 3.0:1 |
| Hero copy over the brightest video frame | 5.97:1 | 7.64:1 | 4.5:1 |

Also load-bearing:

- **Cards are keyboard-operable.** Product, related-product and list cards use `role="button"` +
  `tabIndex={0}` + Enter/Space. The arrow inside is a non-focusable `.card-cue` span so each card is a
  **single tab stop**.
- **Dual-tone focus ring** — dark inner + light outer (inverted in dark theme), so one edge always
  clears 3:1 on any backdrop, including the photographic hero and the deep-green footer.
- **`prefers-reduced-motion` is honoured including continuous loops** — the reveals, the 30s `heroZoom`
  and the looping `scrollDot` all stop, and the hero video is never even requested.
- Form has real labels, `autocomplete` attributes, `role="status"` / `role="alert"` live regions, and an
  unticked-by-default consent checkbox.

> When changing tokens, re-measure. `--muted` on `--soft` was already failing at 4.34:1 before anyone
> noticed — contrast bugs do not announce themselves.

---

## The hero video

A decorative video is layered **over** the existing hero poster image, never replacing it.

```
.hero-media::before   the CSS background image  ← the poster, and the universal fallback
.hero-media > video   the hero video            ← fades in only on `canplay`
.hero-media::after    the scrim gradient        ← keeps the copy legible
```

Paint order inside `.hero-media` is `::before` → children → `::after`, so this works with **no
`z-index`**. The video starts at `opacity: 0` and transitions to `1` over `--hero-video-fade` (600ms)
only once `canplay` fires.

**The consequence: there is no new failure mode.** Every degradation path is the existing hero.

### Gating — decided in React, not CSS

`display: none` still downloads the file; a component that never renders does not.

| Condition | Video in DOM? | User sees |
|---|---|---|
| Desktop, fast connection, motion OK | yes | poster, then video fades in |
| `prefers-reduced-motion: reduce` | **no** | poster only |
| Viewport ≤ 780px | **no** | poster only |
| `navigator.connection.saveData` | **no** | poster only |
| `effectiveType` `2g` / `slow-2g` | **no** | poster only |
| 404 / bad codec / autoplay blocked | yes, never plays | poster only |
| Scrolled out of view or tab hidden | yes | **paused** |

Pausing uses a dedicated `IntersectionObserver` plus a `visibilitychange` listener. It deliberately does
**not** reuse `useInView`, which unobserves on first intersection and so can report "seen" but never
"left".

### Re-encoding the source

Masters live in `media-source/` (gitignored, never shipped). Only the encoded file in `public/hero/`
is committed.

```bash
ffmpeg -i media-source/<source>.mp4 \
  -an -vf "crop=iw:ih*0.95:0:0,scale=1280:-2" \
  -c:v libx264 -crf 28 -preset slow -profile:v main -pix_fmt yuv420p \
  -movflags +faststart \
  public/hero/hero.mp4
```

`-an` strips audio (it is muted anyway — no reason to ship the bytes). `+faststart` puts the moov atom
first so playback can begin before the file finishes. The current asset is **0.94 MB for 8s at
1280×684**, down from a 11.98 MB master.

> Anything placed in `public/` is copied into `dist/` **verbatim and uncompressed**. Do not put video
> masters there.

---

## The globe

`features/globe/` wraps [`cobe`](https://github.com/shuding/cobe) — a WebGL globe with markers for
India (HQ), the UAE, Vietnam and China, and arcs radiating from India. Momentum drag, theta clamped to
±0.4 so the poles can't flip, DPR capped at 2.

**`useGlobeTheme` is memoised, and that matters.** The globe's effect dependencies include its colour
arrays. Built inline they get a new identity on every render, so *any* parent re-render tore down and
re-created the WebGL context — measured at **+857ms of script evaluation**. Two defences:

1. `useGlobeTheme(theme)` returns a `useMemo`'d object.
2. `HeroMedia` owns its own gating state so resolving it never re-renders `HomePage`.

If you add state to `HomePage`, verify the globe still initialises **once** per mount.

---

## Build and deploy

```bash
npm run build     # → dist/
npm run preview   # serve dist/ locally
```

Current output: **~256 kB JS (80 kB gzip)**, **~42 kB CSS (9.4 kB gzip)**, plus `public/` assets.

Deploy `dist/` to any static host — Cloudflare Pages, Netlify, Vercel, S3, GitHub Pages. Hash routing
means **no rewrite rules or SPA fallback configuration are needed**; that is its one real advantage,
and the reason it survived Phase 0.

### Before you deploy

- [ ] Set `VITE_FORM_ENDPOINT` in the host's environment (it is baked in at **build** time, not runtime)
- [ ] Confirm the production origin in `index.html` — `canonical`, `og:url` and `og:image` currently
      assume `https://solsticetrading.com/`. **A wrong canonical is worse than none.** The file carries
      a comment block marking this.
- [ ] Configure SPF, DKIM and DMARC on the sending domain, or enquiry autoresponses land in spam

---

## Verification

There is **no test runner by design** — see [Conventions](#conventions). Changes are verified against a
real browser over the Chrome DevTools Protocol: screenshots for visual diffs, `Network` for request
gating, `Input.dispatchKeyEvent` for genuine keyboard traversal, Lighthouse for Core Web Vitals.

When changing anything in the hero, the globe, the form or the tokens, verify:

1. All 7 routes plus a product detail page, in **both** themes — nothing shifts by a pixel
2. `npm run build` succeeds and the bundle has not grown meaningfully
3. Globe effect initialises once per mount
4. Form submits, **and fails correctly** with the endpoint unreachable
5. Every card reachable and activatable by keyboard; focus ring visible in both themes
6. `prefers-reduced-motion: reduce` → zero video requests, `heroZoom` and `scrollDot` static
7. Theme persists across reload

Lighthouse numbers move a lot run-to-run under software rendering — **take a median of 3**, not a
single run.

---

## Branches

| Branch | State |
|---|---|
| `master` | **Production.** Everything through the release integration — hero composite, four-field enquiry form, colour ramp, WhatsApp FAB, back-to-top, Google Translate, Products dropdown |
| `feat/admin-cms-phase1` | **Current work.** Admin CMS Phase 1a — `server/` API, admin routes, public catalogue wired to the API. Not merged |
| `release/production` | The integration branch `master` was fast-forwarded from |
| `feat/hero-video` | **Superseded** by the hero composite. Kept for reference; merging it would hide the composite hero |

Older feature branches (`feat/trade-nav`, `feat/nav-dropdown`, `feat/products-trade-filter`,
`fix/contact-form-fields`, `feat/hero-image`, `feat/light-mode-color-system`, `feat/whatsapp-fab`,
`feat/back-to-top`) are all merged and pushed; they remain on the remote as history.

---

## Roadmap: the Astro rebuild

**Decided, not started.** Blocked on content and photography, not on engineering.

Read **`docs/website-strategy.md` before proposing structural work.** It holds the agreed information
architecture, the full product spec-sheet schema, the SEO roadmap, the RFQ design, and 13 open
questions. Do not re-derive those decisions.

**What ports over:** `styles/` in full, `Globe.jsx`, the `Icon` sprite, the `Reveal` system, all page
copy, the visual language, and the folder structure above.

**What gets replaced:** the hash router, the single-file content model, and client-only rendering. Real
paths and pre-rendered HTML are the precondition for everything in the SEO roadmap — under hash routing
all seven routes are one URL to a crawler, one Search Console entry, and one link preview.

Four of the 13 open questions block *code* rather than content:

1. Confirmed production domain — gates canonical, OG, sitemap and redirects
2. Prices published, or quote-only — gates the `Offer` schema and the RFQ design
3. Whether UAE/Vietnam/China are markets shipped to or offices — gates `/markets/<country>/`
4. Whether spices / dried fruit / pastes are sellable now — gates category hubs

---

## Conventions

Ask before adding **TypeScript, Tailwind, a router library, a test runner or a linter.** Their absence
is a deliberate scope decision for a codebase whose shell is being replaced, not an oversight.

- One component per file, named for the file
- Named exports; default exports only for pages
- Don't self-host or swap the Unsplash imagery — a rebuild decision, pending real photography
- **Never commit a form key or secret**
- Design work goes through the `ui-ux-pro-max` skills in `.claude/skills/` — see `CLAUDE.md`
- Product pages are **spec sheets, not e-commerce pages**: no cart, no price, quote-only
- One primary CTA per viewport

---

## Gotchas

Things that have already cost someone an hour:

- **`vite preview` returns `index.html` with HTTP 200 for unknown paths.** A missing asset does not 404
  — it silently returns HTML. Test missing-file behaviour with request blocking, not by renaming.
- **`VITE_*` variables are baked in at build time.** Changing one on the host without rebuilding does
  nothing.
- **`.env.local` changes require a dev-server restart.**
- **Navigating `/` → `/#products` is a same-document navigation.** The page does not reload, so
  `localStorage` is not re-read. Force a real reload when testing theme persistence.
- **`prefers-reduced-motion` overrides must sit *after* the base rule they override.** At equal
  specificity the later declaration wins — an override placed earlier in the file silently does nothing.
- **Anything in `public/` ships uncompressed into `dist/`.**
- **The `ChatWidget` is not a chatbot.** Four hardcoded answers with a simulated typing delay. Removal
  is decided; it goes with the rebuild.

---

## Known placeholder content

Not bugs — awaiting real answers from the business:

- `[Founder Name]` and "Founder photo coming soon" on `/about`
- Homepage stats `3+ / 50+ / 10+ / 2410` read as provisional; "2410 Products delivered" is unverifiable
- **The team page shows stock photographs of people who do not work here.** It should ship with real
  people or not at all — a buyer performing due diligence may reverse-image search it.
