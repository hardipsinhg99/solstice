# Solstice Trading International LLP - website

Lead-generation site for an Indian fresh-produce exporter (fruit, vegetables, spices, staples).
The buyer is an overseas importer deciding in ~90 seconds whether this is a real operation
worth sending an RFQ to. Every design and content decision serves that, not brand expression.

## Current state

- **Stack today:** Vite 8 + React 19 SPA, hash routing, hand-written CSS split across
  `src/styles/` in cascade order. Per-page components under `src/pages/` (the single-file
  `main.jsx` era is over - it is mount-only now). GSAP drives the homepage journey sequence.
- **There is now a backend.** `server/` holds a NestJS 10 + Prisma 5 + PostgreSQL API added in
  Phase 1a. It owns the **product catalogue**, the **site contact settings** and the **enquiries**
  the contact form receives; the public site fetches products and settings from it rather than
  importing `src/data/products.js` or `src/lib/constants.js`. The enquiry form posts to
  `/api/enquiries` - there is no `VITE_FORM_ENDPOINT` any more. Admin UI is routes *inside this SPA* at `#admin/*`.
  **`npm run dev` alone shows a catalogue error state until the API is running.**
  **Read `docs/admin.md` before touching anything under `server/`, `src/pages/admin/` or
  `src/features/admin/`** - it documents the schema, the auth model, the shape boundary and the
  decisions that look arbitrary but are not. `docs/admin-cms-blueprint.md` is the rationale.
- **Decided:** migrate the design system, rebuild the shell in Astro. The styles, `Globe.jsx`,
  the `Icon` sprite and the `Reveal` system port over. The hash router and client-only rendering
  do not. **Not started** - blocked on content and photography.
- **Read `docs/website-strategy.md` before proposing structural work.** It holds the agreed IA,
  the product spec-sheet schema, the SEO roadmap, the RFQ design and 13 open questions.
  Do not re-derive those decisions.

## Architecture

`src/` is decomposed page-wise. This is the **target structure for the Astro rebuild**, not an
intermediate - migrating should mean swapping the shell and router, not redesigning the tree.

```
src/
├── app/          App.jsx · router.js (hash - the one file the migration deletes)
│                 navigation.js (the seam) · ThemeProvider.jsx
├── components/   ui/ (Icon, Button, Eyebrow, Card) · layout/ (Header, Nav, Footer, PageTitle)
│                 admin/ (AdminSidebar, AdminTopBar, DangerConfirm)
│                 motion/ (Reveal, useInView)
├── features/     products/ · enquiry/ · globe/ · chat/ · admin/ · settings/ · api/
│                 pages/ (sectionTypes.js is the section contract) · gallery/
│                 (one index.js barrel each; api/useApiResource.js is the shared GET cache)
├── pages/        <page>/<Page>Page.jsx + optional sections/
│                 admin/ - AdminApp (guard) + login, product list/edit, enquiries, settings
├── data/         navigation · faqs · globe · about-content   (still the CMS seam)
│                 products.js - SEED SOURCE ONLY, not read at runtime
├── lib/          constants.js
├── styles/       tokens · base · layout · components · pages · footer · responsive
└── main.jsx      mount only (10 lines)

server/          separate app, TypeScript, never ships to a buyer's browser
├── prisma/      schema.prisma · migrations/ · seed.ts
└── src/         auth/ · products/ · media/ · storage/ · settings/ · enquiries/
                 gallery/ · dashboard/ · pages/ · team/ · prisma/
                 common/sanitize.ts · main.ts
```

**The admin renders *instead of* the marketing shell**, not inside it - `App.jsx` returns
`<AdminApp/>` early on `isAdminRoute(route)`, so the admin inherits no header, footer, chat widget
or corner column. `#admin/*` cannot collide with `product/` or `products/`.

**Import direction is one-way: `pages → features → components → lib`.** A `features/` module must
never import from `pages/`. A `components/ui` primitive must never import domain data. If you need
to break this, stop and raise it - it's a design smell, not something to route around.

**Where new code goes.** Zero domain knowledge → `components/ui`. Site chrome → `components/layout`.
Domain logic used by more than one page → `features/<domain>`. Used by exactly one page →
`pages/<page>/sections/`. **Promote to `features/` only when a second page actually consumes it**,
never speculatively.

**No barrel files except one per `features/` folder.** Barrels at every level hurt HMR and
tree-shaking for no ergonomic gain at this size.

**Named exports everywhere except pages**, which are default exports. One component per file, named
for the file.

**Navigation never couples to the router.** Components call `useNavigate()` from `app/navigation.js`
and receive a `(route) => void`. Only `app/router.js` knows routing is hash-based. Do not import
`goTo` into a component.

**CSS splits by cascade order, not by component.** Each file in `styles/` is a *contiguous* slice of
the original single stylesheet, and `index.css` imports them in that exact order. Adding a rule means
putting it in the file whose cascade position it belongs to - never reordering the imports, and never
converting to CSS Modules (a rebuild-phase decision on a hand-written cascade).

## Design work: use the UI/UX Pro Max skills

The `ui-ux-pro-max` skill set is installed in `.claude/skills/`. **Consult it before making
visual, layout, interaction or accessibility decisions - do not design from memory.**

| Task | Skill |
|---|---|
| Layout, styles, colour, typography, UX patterns, a11y, charts | `ui-ux-pro-max` |
| Building/adjusting components, Tailwind or shadcn work | `ui-styling` |
| Tokens, component specs, systematic design | `design-system` |
| Brand voice, visual identity, messaging | `brand` |
| Logos, corporate identity, mockups | `design` |
| Social/ad/hero banner artwork | `banner-design` |
| HTML/Chart.js presentations | `slides` |

Query the database directly when a targeted answer is faster than loading a whole skill:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux --stack astro
# domains: style color chart landing product ux typography icons gsap react web google-fonts
```

If a query returns no match, say so explicitly rather than quietly falling back to generic defaults.

## Constraints that override any skill suggestion

1. **The existing design system stays.** Token architecture (`:root` + `html[data-theme]`),
   `color-mix()`, `clamp()` type, DM Sans / Playfair Display italic / DM Mono, the
   `IntersectionObserver` reveals and the film-grain overlay are assets. Sharpen, do not replace.
   A from-scratch redesign needs an argument for why the current system is insufficient.
2. **WCAG 2.2 AA is a requirement, not a phase.** `--line-strong` (not `--line`) on interactive
   borders, ≥4.5:1 body text in both themes, keyboard-operable cards, dual-tone focus ring,
   and `prefers-reduced-motion` honoured including continuous loops.
3. **Evidence over adjectives.** Specs, certifications, loadability and registration numbers
   outrank mission statements. Never invent a certification, figure or credential.
4. **Restraint.** One primary CTA per viewport. Cut decoration competing with evidence.
5. **Product pages are spec sheets, not e-commerce pages.** No cart, no price, quote-only.

## House rules

- Don't add TypeScript, Tailwind, a router library, a test runner or a linter without asking.
  **This applies to the public bundle.** `server/` is TypeScript because that is idiomatic Nest and
  never reaches a buyer's browser; the same reasoning admits server-side dependencies there.
- Don't self-host or swap the Unsplash imagery; that is a rebuild decision pending real photography.
- Never commit a form key or secret. `VITE_*` vars are inlined into the client bundle and are public
  - **no server secret may ever carry a `VITE_` prefix.** `server/.env` is the separate, gitignored
  home for `DATABASE_URL`, `JWT_SECRET`, the admin seed credentials and the `SMTP_*` mail settings.
  The public bundle currently needs no `VITE_*` variables at all.
- The palette gained `--danger` / `--danger-bg` / `--on-danger` in both themes with Phase 1a, for
  destructive actions and validation errors. Use them; don't introduce a second error colour.
- Certification claims carry `verifiable`. Making one verifiable is deliberately a two-step,
  reference-gated action, enforced on the server too - it guards a legal exposure in destination
  markets, not a UI preference. See `docs/admin.md`.
