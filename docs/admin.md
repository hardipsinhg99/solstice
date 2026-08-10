# Admin CMS — how it works and how to run it

Operational and architectural reference for the Solstice admin panel and its API.

- **Design rationale** — why this shape rather than another — is [`docs/admin-cms-blueprint.md`](./admin-cms-blueprint.md). That document is the decision record; this one is the manual.
- **Public site** conventions are in [`../README.md`](../README.md) and [`../CLAUDE.md`](../CLAUDE.md).

**Status: Phase 1a shipped — Products only.** Pages, Enquiries and live preview are designed but not built. See [What is deliberately not built](#what-is-deliberately-not-built).

---

## Contents

- [The one-paragraph version](#the-one-paragraph-version)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Where the code lives](#where-the-code-lives)
- [Data flow](#data-flow)
- [Database schema](#database-schema)
- [API surface](#api-surface)
- [Auth](#auth)
- [The shape boundary](#the-shape-boundary)
- [Design system](#design-system)
- [Decisions worth knowing before you change anything](#decisions-worth-knowing-before-you-change-anything)
- [What is deliberately not built](#what-is-deliberately-not-built)
- [Gotchas](#gotchas)
- [Extending it](#extending-it)

---

## The one-paragraph version

A NestJS + Prisma + PostgreSQL API lives in `server/`. It owns the product catalogue, which used to be a hardcoded array in `src/data/products.js`. The admin UI is **not a separate application** — it is a set of routes inside the existing Vite SPA (`#admin/*`), guarded by a JWT check, rendering *instead of* the marketing shell. The public Products, Home and Product Detail pages now fetch from the API instead of importing the static file. One admin account, no roles.

---

## Running it locally

Three processes: Postgres, the API, the frontend.

### 1. Postgres

Any Postgres 14+ works. A disposable container is the quickest:

```bash
docker run -d --name solstice-cms-pg -e POSTGRES_USER=solstice -e POSTGRES_PASSWORD=solstice_dev_pw -e POSTGRES_DB=solstice_cms -p 55432:5432 postgres:16-alpine
```

> Port **55432**, not 5432, to avoid colliding with an existing local Postgres. If you use your own instance, change `DATABASE_URL` to match.
> Restart an existing container with `docker start solstice-cms-pg`; remove it with `docker rm -f solstice-cms-pg`.

### 2. API

```bash
cd server
npm install
cp .env.example .env        # then fill it in — see Environment variables
npx prisma generate
npx prisma migrate dev
npm run seed
npm run start:dev           # http://localhost:3001
```

`npm run seed` is **idempotent and non-destructive**: it creates the admin only if no admin row exists, and skips any product whose slug is already present. Safe to re-run.

### 3. Frontend

```bash
npm run dev                 # repo root — http://localhost:5173
```

Admin at **`http://localhost:5173/#admin/products`**, using the credentials you put in `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.

`vite.config.js` proxies `/api` → `http://localhost:3001`, so the frontend and API are same-origin in development and CORS never applies locally. Override the target with `VITE_API_PROXY_TARGET` if the API runs elsewhere.

### Server scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | Nest in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build (`dist/src/main.js`) |
| `npm run prisma:migrate` | Create + apply a migration in development |
| `npm run prisma:deploy` | Apply existing migrations — **this is the production command** |
| `npm run seed` | Seed admin + import products from `src/data/products.js` |

---

## Environment variables

`server/.env` — **server-side only, never `VITE_`-prefixed.** Vite inlines every `VITE_*` variable into the public browser bundle; a `JWT_SECRET` with that prefix would ship to every visitor.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs the admin token. Generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `ADMIN_SEED_EMAIL` | Email for the single admin, used only by the seed |
| `ADMIN_SEED_PASSWORD` | Password for that admin, used only by the seed |
| `CORS_ORIGIN` | Comma-separated allowlist of frontend origins. **Never `*`** — this API issues credentials |
| `PORT` | API port, default `3001` |

`server/.env` is gitignored. `server/.env.example` is the committed template.

---

## Where the code lives

```
server/
├── prisma/
│   ├── schema.prisma            Product, children, Admin, AuditLog
│   ├── migrations/              committed — never hand-edit an applied one
│   └── seed.ts                  admin + import of the 8 real products
└── src/
    ├── auth/                    JWT strategy, guard, login, @CurrentAdmin
    ├── products/                controller, service, DTOs (validation lives here)
    ├── prisma/                  PrismaService (global module)
    ├── common/sanitize.ts       server-side DOMPurify wrapper
    └── main.ts                  helmet, global /api prefix, ValidationPipe, CORS

src/                             (frontend — admin routes inside the existing SPA)
├── features/admin/
│   ├── useAdminAuth.js          login, token, guard state, apiFetch wrapper
│   ├── useProductsApi.js        CRUD calls + toStaticShape() boundary mapper
│   └── index.js                 barrel
├── features/products/
│   └── useProductCatalogue.js   public read + module-scope cache
├── pages/admin/
│   ├── AdminApp.jsx             shell + route guard
│   ├── AdminLoginPage.jsx
│   ├── AdminProductsPage.jsx    list, search, delete confirmation
│   └── AdminProductEditPage.jsx create/edit, repeaters, certification friction
└── styles/admin.css             imported last in styles/index.css
```

Routing helpers (`isAdminRoute`, `adminSection`, `adminParam`) are in `src/app/router.js` alongside the existing hash-route helpers. `App.jsx` returns `<AdminApp/>` early when `isAdminRoute(route)` — the admin never mounts the site header, footer, chat widget or corner column.

---

## Data flow

```
                    ┌──────────────── admin (authenticated) ────────────────┐
                    │                                                       │
  AdminProductEditPage ──► useProductsApi ──► PUT /api/products/:id ──► ProductsService
                                                  (Bearer JWT)              │
                                                                            ▼
                                                                       PostgreSQL
                                                                            │
  ProductsPage / HomePage / ProductDetailPage                               │
        │                                                                   │
        └──► useProductCatalogue ──► GET /api/products ◄────────────────────┘
                     │                (public, PUBLISHED only)
                     └──► toStaticShape() ──► ProductCard / ProductGrid / ProductFilter
```

Two rules hold this together:

1. **The public endpoint returns `PUBLISHED` rows only**, and that filter is applied in `ProductsService`, never taken from a client query parameter. A `DRAFT` product is invisible to the public site by construction.
2. **`toStaticShape()` is the only place the API shape meets the display components.** See [The shape boundary](#the-shape-boundary).

---

## Database schema

Six tables. Full definitions in `server/prisma/schema.prisma`.

| Model | Notes |
|---|---|
| `Product` | The catalogue. `slug` unique. `status` DRAFT/PUBLISHED. `trade` EXPORT/IMPORT |
| `ProductVariety` | Child table — name, grade, calibre min/max, order |
| `ProductPackOption` | Child table — carton weight, cartons/pallet, pallets/reefer, notes |
| `ProductCertification` | Child table — name, **`verifiable`**, reference |
| `Admin` | Single row in practice. Email, bcrypt hash, name, lastLoginAt |
| `AuditLog` | entityType, entityId, action, actorId, summary, createdAt |

### Field groups on `Product`

**Required** (the fields that carry real data today): `slug`, `name`, `type`, `description`, `season`, `origin`, `packaging`.

**Nullable but real**: `image` — the two import placeholder records genuinely have `image: null`, so a NOT NULL column would make existing data unrepresentable.

**`placeholder: Boolean`** — flags the "awaiting details" import slots. `ProductCard` renders a distinct placeholder card off it. Do not drop this field; without it two stubs silently become apparently-real products.

**Aspirational spec — all nullable, none blocks creation**: `hsCode`, `incoterms[]`, `moqValue`, `moqUnit`, `shelfLifeDays`, `storageTempC`, `storageHumidity`, `portsOfLoading[]`, `seoTitle`, `seoDescription`. **No product carries any of these yet.** Populating them is content work, not engineering work, and requiring them would have blocked product creation on data nobody has.

### `updatedById` everywhere

`Product` and all three child tables carry `updatedById → Admin`. There is **no role column and no role table** — see [Auth](#auth). The foreign keys exist from day one specifically so that adding roles later needs no data migration; backfilling who-did-what is the expensive half of retrofitting RBAC.

---

## API surface

Global prefix `/api`. Public routes are unguarded; every mutating route requires a Bearer JWT.

| Method | Path | Guard | Notes |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Rate-limited **5/min/IP** |
| `GET` | `/api/auth/me` | JWT | Validates a stored token on boot |
| `GET` | `/api/products` | — | **PUBLISHED only.** `?trade=export\|import`. `Cache-Control: public, max-age=60` |
| `GET` | `/api/products/slug/:slug` | — | PUBLISHED only |
| `GET` | `/api/products/admin/all` | JWT | All statuses. `?search=` matches name or slug |
| `GET` | `/api/products/admin/:id` | JWT | Single product with children |
| `POST` | `/api/products` | JWT | Create |
| `PUT` | `/api/products/:id` | JWT | Update — **replaces child collections wholesale** |
| `PATCH` | `/api/products/:id/status` | JWT | Publish / unpublish |
| `DELETE` | `/api/products/:id` | JWT | Cascades to children |

### Validation is not a mirror of the client

`server/src/products/dto.ts` assumes the client was bypassed entirely. Verified behaviour:

| Input | Result |
|---|---|
| `slug: "Not A Slug"` | `400` — regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `hsCode: "12"` | `400` — must be 6–10 digits |
| Undeclared field (e.g. `isAdmin: true`) | `400` — `forbidNonWhitelisted` |
| `name: "<img src=x onerror=alert(1)>Lime"` | Stored as `"Lime"` — sanitized server-side |
| `verifiable: true` with no `reference` | Stored as `verifiable: false` |

The global `ValidationPipe` runs `whitelist: true, forbidNonWhitelisted: true`, so `status` in particular **cannot** be set through create/update — only through the dedicated `PATCH /status` route.

---

## Auth

**JWT bearer, single admin, no refresh rotation.** An 8-hour token then a re-login is the accepted Phase 1a trade.

- Password hashed with **bcrypt, cost 12**.
- Login compares against a dummy hash when the email is unknown, so a wrong email and a wrong password take the same time — otherwise response latency enumerates valid admin addresses.
- **Rate limit 5/min/IP** on login. A single-admin system is exactly one credential to brute-force; this is the only meaningful lock on the front door.
- `JwtStrategy.validate()` **re-reads the admin from the database on every request** rather than trusting the token payload, so a deleted admin's unexpired token stops working immediately.
- Token stored in **`sessionStorage`**, not `localStorage` — it dies with the tab, the right default for a shared laptop.
- The guard calls `/auth/me` on boot rather than trusting that a token merely exists, so a stale token lands on the login screen instead of an admin page that 401s on every request.

### No roles, deliberately

Solstice is ~10 people with one operator. Multi-role RBAC is 100% new work with no current justification. Add roles when there is a named second editor who genuinely must not see something — not before. The `updatedById`/`actorId` columns already record who did what.

---

## The shape boundary

The API speaks Prisma: uppercase enums, `varieties` and `certifications` as arrays of row objects. The display components — `ProductCard`, `ProductGrid`, `ProductFilter`, `ProductDetailPage` — were built and tested against the flat shape of `src/data/products.js`.

`toStaticShape()` in `src/features/admin/useProductsApi.js` maps between them:

| API | Static shape |
|---|---|
| `trade: "IMPORT"` | `trade: "import"` |
| `varieties: [{ name: "Kesar", … }]` | `varieties: ["Kesar"]` |
| `certifications: [{ name, … }, …]` | `certification: "A · B"` (joined) |
| `placeholder: false` | key omitted |

**Keep the mapping here.** If a future field needs to reach the public components, extend `toStaticShape()` rather than changing the components — they are not what changed, and destabilising them to save a mapping function is a bad trade.

---

## Design system

The admin has **no second palette.** Every value comes from `src/styles/tokens.css` — the same tokens the marketing site uses, applied at higher density (13px base vs the site's 15–16px, because this is a table-and-form tool used for minutes at a time).

| Role | Token |
|---|---|
| Page background | `--bg` |
| Cards, sidebar, table | `--surface` |
| Hairlines | `--border` |
| Control boundaries | `--line-strong` (`--border` is too faint for controls) |
| Text | `--ink` → `--body` → `--muted` |
| Primary action / active nav | `--green-600` with `--on-green` |
| Hover | `--green-700` |
| **Destructive / error** | `--danger`, `--danger-bg`, `--on-danger` |

### The danger tokens were added by this work

The palette had **no error colour at all** before Phase 1a — unsurprising for a marketing site with nothing to destroy. Added semantically beside the green ramp, in both themes, measured not eyeballed:

| | light | dark |
|---|---|---|
| `--danger` | `#A3231B` | `#FF9E96` |
| `--danger-bg` | `#FBEDEC` | `#3A1714` |
| `--on-danger` | `#ffffff` | `#12211B` |
| `--danger` on `--surface` | 7.40:1 | 7.64:1 |
| `--on-danger` on `--danger` | 7.46:1 | 8.41:1 |

> `--danger-bg` is only ~1.1:1 against `--surface`. **A danger panel must always carry a `--danger` border** — the tint alone is not a visible boundary.

### State is never colour alone

Every chip carries a text label: "Published" / "Draft", "Verifiable" / "Claimed — not verifiable". Colour reinforces; it never carries the meaning by itself.

---

## Decisions worth knowing before you change anything

### Certification `verifiable` is a legal control, not a checkbox

`docs/website-strategy.md` records that claiming a certification without a producible certificate reference is a **legal exposure in several destination markets** and an instant credibility loss when a buyer's compliance team asks.

So marking one verifiable is deliberately awkward:

1. The "Mark verifiable…" button is **disabled** until a certificate reference is entered.
2. Clicking it opens a confirmation panel naming the certificate and stating the consequence. A single click cannot flip the flag.
3. The **server enforces the same rule independently** — `verifiable` is only persisted when a reference is present.
4. Unverified certifications render in the danger treatment, in the list and in the editor, in both themes.

If you make this easier, you are removing a control that exists for a legal reason.

### Delete is a real panel, never `window.confirm()`

The browser dialog cannot be styled, cannot carry the danger token, gives no room to name what is about to be destroyed, and is modal to the whole tab — which blocks the live region announcing the result. The panel names the product and its child-record counts, and **focus lands on Cancel**, not on the destructive button.

### Child collections are replaced wholesale on update

`PUT /api/products/:id` deletes and re-creates varieties, pack options and certifications inside one transaction. Diffing three child collections by id buys nothing at 8 products and is where lost-update bugs live. This does mean **child row ids are not stable across saves** — do not build anything that depends on them persisting.

### Server-side sanitization from day one

`server/src/common/sanitize.ts` strips every tag on write, even though nothing accepts rich text yet. Sanitizing only at render leaves hostile content in the database for the next consumer to forget about — and the next consumer here is a public marketing site. When rich text arrives with Pages, add a *second* function with an explicit tag allowlist; leave this one alone.

### Seeded content is PUBLISHED

The seed imports the 8 live products as `PUBLISHED`, everything else defaults to `DRAFT`. Importing live content as draft would have emptied the public catalogue at cutover.

---

## What is deliberately not built

| Not built | Why |
|---|---|
| **Pages / PageSection CRUD** | Blocked on an open question: `docs/website-strategy.md` says cut Team and Gallery, but both are **live** in the shipped app, and Privacy/Terms are specified but don't exist. Scoping Pages before that is resolved would ship a module that cannot edit two live pages |
| **Enquiries persistence** | Blocked on a decision — the form currently has *no* backend at all (`VITE_FORM_ENDPOINT` unset), so it falls through to a `mailto:` draft. Nothing is being captured today |
| **Split-view live preview** | Phase 2. Non-trivial here because the Products page runs a scroll-driven GSAP explode sequence that a naively re-rendering preview iframe would fight |
| **Rich text (TipTap)** | Arrives with Pages. Product descriptions are a plain textarea |
| **Image upload** | Products take an image **URL**. No upload pipeline exists yet |
| **Roles / RBAC** | See [Auth](#auth) |
| **Refresh token rotation** | 8h expiry then re-login is the accepted Phase 1a trade |
| **Cache invalidation from the admin** | An editor must reload the public site to see a change. Acceptable for products; will need solving when Pages has live preview |

---

## Gotchas

- **`src/data/products.js` still exists and is still the seed source.** Editing it does **not** change the site any more — the site reads the API. It is kept so `npm run seed` can bootstrap a fresh database. Do not delete it; do not expect edits to it to appear.
- **`start:prod` runs `dist/src/main.js`, not `dist/main.js`.** `tsconfig.json` includes `prisma/`, so Nest emits under `dist/src/`.
- **The Prisma postinstall may be blocked** by npm's script allowlist. If `@prisma/client` errors about a missing engine, run `npx prisma generate` explicitly.
- **`admin.css` is imported last** in `styles/index.css`. Anything you add there outranks the marketing cascade — which is why it must **not** contain an `outline: none` reset; that would beat the global `:focus-visible` ring in `base.css` and strip focus from every form control. (This shipped as a bug once and was fixed.)
- **The Google Translate widget container is a sibling of `#root`** and is present on admin routes too. It stays `display:none` there because `useTranslateSlot` never finds its header slot, but it is in the DOM.
- **The public site makes one request per resource.** Products is one fetch today. When Pages lands, that becomes two waterfalled fetches on first paint — the point to consider a combined bootstrap endpoint.

---

## Extending it

**To add a field to `Product`:**

1. `server/prisma/schema.prisma` — add the column. Make it **nullable** unless real data exists for every row.
2. `npx prisma migrate dev --name add_<field>`
3. `server/src/products/dto.ts` — add the validator. `@IsOptional()` for anything aspirational.
4. `server/src/products/products.service.ts` — add it to `scalars()`, sanitizing if it is text.
5. `src/pages/admin/AdminProductEditPage.jsx` — add the form field and include it in the submit payload.
6. Only if the public site needs it: `toStaticShape()` in `useProductsApi.js`, then the display component.

**To add a new admin section** (e.g. Pages):

1. New NestJS module under `server/src/`, copying the public/admin controller split from `products`.
2. New page component under `src/pages/admin/`.
3. One `<button>` in the `AdminApp` sidebar and one branch in its section switch.
4. `adminSection()` already parses `#admin/<section>/<param>` — no router change needed.

**Before building Pages**, read [`docs/admin-cms-blueprint.md`](./admin-cms-blueprint.md) §2 and §3 — the `Page`/`PageSection` model, the typed-sections-over-drag-and-drop argument, and the SEO gap are all worked through there and should not be re-derived.
