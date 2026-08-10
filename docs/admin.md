# Admin CMS - how it works and how to run it

Operational and architectural reference for the Solstice admin panel and its API.

- **Design rationale** - why this shape rather than another - is [`docs/admin-cms-blueprint.md`](./admin-cms-blueprint.md). That document is the decision record; this one is the manual.
- **Public site** conventions are in [`../README.md`](../README.md) and [`../CLAUDE.md`](../CLAUDE.md).

**Status: Phase 1c shipped - Products, Product media, Site settings, Enquiries.** Pages/typed sections and live preview are designed but not built. See [What is deliberately not built](#what-is-deliberately-not-built).

---

## Contents

- [The one-paragraph version](#the-one-paragraph-version)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Where the code lives](#where-the-code-lives)
- [Data flow](#data-flow)
- [Database schema](#database-schema)
- [API surface](#api-surface)
- [Site settings](#site-settings)
- [Enquiries](#enquiries)
- [Auth](#auth)
- [The shape boundary](#the-shape-boundary)
- [Design system](#design-system)
- [Decisions worth knowing before you change anything](#decisions-worth-knowing-before-you-change-anything)
- [What is deliberately not built](#what-is-deliberately-not-built)
- [Gotchas](#gotchas)
- [Extending it](#extending-it)

---

## The one-paragraph version

A NestJS + Prisma + PostgreSQL API lives in `server/`. It owns the product catalogue (which used to be a hardcoded array in `src/data/products.js`), the site's contact settings and the enquiries the public form receives. The admin UI is **not a separate application** - it is a set of routes inside the existing Vite SPA (`#admin/*`), guarded by a JWT check, rendering *instead of* the marketing shell. The public Products, Home and Product Detail pages now fetch from the API instead of importing the static file. One admin account, no roles.

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
cp .env.example .env        # then fill it in - see Environment variables
npx prisma generate
npx prisma migrate dev
npm run seed
npm run start:dev           # http://localhost:3001
```

`npm run seed` is **idempotent and non-destructive**: it creates the admin only if no admin row exists, and skips any product whose slug is already present. Safe to re-run.

### 3. Frontend

```bash
npm run dev                 # repo root - http://localhost:5173
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
| `npm run prisma:deploy` | Apply existing migrations - **this is the production command** |
| `npm run seed` | Seed admin + import products from `src/data/products.js` |

---

## Environment variables

`server/.env` - **server-side only, never `VITE_`-prefixed.** Vite inlines every `VITE_*` variable into the public browser bundle; a `JWT_SECRET` with that prefix would ship to every visitor.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs the admin token. Generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `ADMIN_SEED_EMAIL` | Email for the single admin, used only by the seed |
| `ADMIN_SEED_PASSWORD` | Password for that admin, used only by the seed |
| `CORS_ORIGIN` | Comma-separated allowlist of frontend origins. **Never `*`** - this API issues credentials |
| `UPLOAD_DIR` / `UPLOAD_PUBLIC_PREFIX` | Where `LocalDiskStorageService` writes, and the URL prefix it serves under |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Enquiry-notification transport. **Optional** - if `SMTP_HOST` is unset the API logs a warning at boot, enquiries are still saved, and only the email is skipped |
| `SMTP_FROM` | Envelope sender for that notification |
| `NOTIFY_EMAIL` | Where new-enquiry notifications land |
| `PORT` | API port, default `3001` |

**There is no longer a `VITE_FORM_ENDPOINT`.** The public enquiry form posts to this API's own `/api/enquiries`, so no third-party form provider is in the path and the root `.env.example` is now empty of variables.

`server/.env` is gitignored. `server/.env.example` is the committed template.

---

## Where the code lives

```
server/
├── prisma/
│   ├── schema.prisma            Product, children, media, SiteSettings, Enquiry, Admin, AuditLog
│   ├── migrations/              committed - never hand-edit an applied one
│   └── seed.ts                  admin + import of the 8 real products
└── src/
    ├── auth/                    JWT strategy, guard, login, @CurrentAdmin
    ├── products/                controller, service, DTOs (validation lives here)
    ├── media/ · storage/        upload pipeline + the StorageService seam
    ├── settings/                the singleton row: dto, service, controller
    ├── enquiries/               controller, service, dto, mail.service.ts
    ├── prisma/                  PrismaService (global module)
    ├── common/sanitize.ts       server-side DOMPurify wrapper
    └── main.ts                  helmet, global /api prefix, ValidationPipe, CORS

src/                             (frontend - admin routes inside the existing SPA)
├── features/api/
│   └── useApiResource.js        keyed public-GET cache - one fetch per key, shared
├── features/admin/
│   ├── useAdminAuth.js          login, token, guard state, apiFetch wrapper
│   ├── useProductsApi.js        CRUD calls + toStaticShape() boundary mapper
│   ├── useSettingsApi.js        admin read + PATCH, invalidates the public cache
│   ├── useEnquiriesApi.js       list, status, delete
│   └── index.js                 barrel
├── features/products/
│   └── useProductCatalogue.js   thin wrapper over useApiResource('products')
├── features/settings/
│   └── useSiteSettings.js       public read, constants as fallback, wa.me helpers
├── pages/admin/
│   ├── AdminApp.jsx             shell + route guard
│   ├── AdminLoginPage.jsx
│   ├── AdminProductsPage.jsx    list, search, delete confirmation
│   ├── AdminProductEditPage.jsx create/edit, repeaters, certification friction
│   ├── AdminEnquiriesPage.jsx   list, filter, status, delete
│   └── AdminSettingsPage.jsx    the one-record form
└── styles/admin.css             imported last in styles/index.css
```

Routing helpers (`isAdminRoute`, `adminSection`, `adminParam`) are in `src/app/router.js` alongside the existing hash-route helpers. `App.jsx` returns `<AdminApp/>` early when `isAdminRoute(route)` - the admin never mounts the site header, footer, chat widget or corner column.

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

Full definitions in `server/prisma/schema.prisma`.

| Model | Notes |
|---|---|
| `Product` | The catalogue. `slug` unique. `status` DRAFT/PUBLISHED. `trade` EXPORT/IMPORT |
| `ProductVariety` | Child table - name, grade, calibre min/max, order |
| `ProductPackOption` | Child table - carton weight, cartons/pallet, pallets/reefer, notes |
| `ProductCertification` | Child table - name, **`verifiable`**, reference |
| `Admin` | Single row in practice. Email, bcrypt hash, name, lastLoginAt |
| `MediaAsset` / `ProductMedia` | Phase 1b. Uploaded images and their ordered join to a product |
| `SiteSettings` | **One row, id `singleton`.** Named columns, not key/value - see [Site settings](#site-settings) |
| `Enquiry` | Submissions from the public contact form. NEW / CONTACTED / CLOSED |
| `AuditLog` | entityType, entityId, action, actorId, summary, createdAt |

### Field groups on `Product`

**Required** (the fields that carry real data today): `slug`, `name`, `type`, `description`, `season`, `origin`, `packaging`.

**Nullable but real**: `image` - the two import placeholder records genuinely have `image: null`, so a NOT NULL column would make existing data unrepresentable.

**`placeholder: Boolean`** - flags the "awaiting details" import slots. `ProductCard` renders a distinct placeholder card off it. Do not drop this field; without it two stubs silently become apparently-real products.

**Aspirational spec - all nullable, none blocks creation**: `hsCode`, `incoterms[]`, `moqValue`, `moqUnit`, `shelfLifeDays`, `storageTempC`, `storageHumidity`, `portsOfLoading[]`, `seoTitle`, `seoDescription`. **No product carries any of these yet.** Populating them is content work, not engineering work, and requiring them would have blocked product creation on data nobody has.

### `updatedById` everywhere

`Product` and all three child tables carry `updatedById → Admin`. There is **no role column and no role table** - see [Auth](#auth). The foreign keys exist from day one specifically so that adding roles later needs no data migration; backfilling who-did-what is the expensive half of retrofitting RBAC.

---

## API surface

Global prefix `/api`. Public routes are unguarded; every mutating route requires a Bearer JWT.

| Method | Path | Guard | Notes |
|---|---|---|---|
| `POST` | `/api/auth/login` | - | Rate-limited **5/min/IP** |
| `GET` | `/api/auth/me` | JWT | Validates a stored token on boot |
| `GET` | `/api/products` | - | **PUBLISHED only.** `?trade=export\|import`. `Cache-Control: public, max-age=60` |
| `GET` | `/api/products/slug/:slug` | - | PUBLISHED only |
| `GET` | `/api/products/admin/all` | JWT | All statuses. `?search=` matches name or slug |
| `GET` | `/api/products/admin/:id` | JWT | Single product with children |
| `POST` | `/api/products` | JWT | Create |
| `PUT` | `/api/products/:id` | JWT | Update - **replaces child collections wholesale** |
| `PATCH` | `/api/products/:id/status` | JWT | Publish / unpublish |
| `DELETE` | `/api/products/:id` | JWT | Cascades to children |
| `GET` | `/api/settings` | - | Public: `whatsappNumber`, `whatsappMessage`, `contactEmail` only. `max-age=60` |
| `GET` | `/api/settings/admin` | JWT | Adds `updatedAt` / `updatedById` |
| `PATCH` | `/api/settings` | JWT | Partial update of the singleton |
| `POST` | `/api/enquiries` | - | **The only unguarded write on the API.** Rate-limited **5/min/IP** |
| `GET` | `/api/enquiries` | JWT | Newest first. `?search=` matches name/email/message, `?status=` filters |
| `PATCH` | `/api/enquiries/:id/status` | JWT | NEW / CONTACTED / CLOSED |
| `DELETE` | `/api/enquiries/:id` | JWT | Permanent |

### Validation is not a mirror of the client

`server/src/products/dto.ts` assumes the client was bypassed entirely. Verified behaviour:

| Input | Result |
|---|---|
| `slug: "Not A Slug"` | `400` - regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `hsCode: "12"` | `400` - must be 6–10 digits |
| Undeclared field (e.g. `isAdmin: true`) | `400` - `forbidNonWhitelisted` |
| `name: "<img src=x onerror=alert(1)>Lime"` | Stored as `"Lime"` - sanitized server-side |
| `verifiable: true` with no `reference` | Stored as `verifiable: false` |

The global `ValidationPipe` runs `whitelist: true, forbidNonWhitelisted: true`, so `status` in particular **cannot** be set through create/update - only through the dedicated `PATCH /status` route.

---

## Site settings

`#admin/settings` edits **one row**, `SiteSettings` with the literal id `singleton`.

### Named columns, not a key/value table

This is the one design decision here worth defending. The obvious shape is
`settings(key, value)` - it needs no migration to add a setting. It is also the exact
pattern that made the PRIM AI panel unusable: a hundred-plus ungrouped rows, every one
a free-text `value`, with no way for the server to know that one of them is a phone
number and another is an email.

Named columns buy three things a key/value table cannot:

1. **Real validation.** `whatsappNumber` is checked against `/^[1-9]\d{7,14}$/` on the
   server. wa.me does not reject a malformed number with an error - it silently resolves
   to *"phone number shared via url is invalid"*, so the failure only ever appears on a
   buyer's screen. A generic `value` column could not check that.
2. **Labels in the operator's language.** The form says "WhatsApp number", not `wa.number`.
3. **A typed client.** `useSiteSettings()` returns an object with known keys.

The cost is one migration per new setting. At the rate this site adds settings, that is
the cheaper side of the trade. **Do not convert this to key/value** to avoid a migration.

### What is in it, and what is not

`whatsappNumber`, `whatsappMessage`, `contactEmail`. That is all, because that is all the
codebase actually had: `src/lib/constants.js` held exactly these three values and nothing
else. **There is no `contactPhone` and no address**, because no phone number, postal
address or social link exists anywhere in the site today - adding columns for them would
be inventing content.

### The constants did not go away

`ENQUIRY_EMAIL`, `WHATSAPP_NUMBER` and `WHATSAPP_MESSAGE` remain in `src/lib/constants.js`
and are now the **fallback** in `features/settings/useSiteSettings.js`. If the API is
unreachable the footer still renders a real address instead of `mailto:undefined`.

### The WhatsApp FAB hides itself

`WhatsAppFab` renders `null` unless the saved number passes the same digits-only test the
server applies. The seeded value is the literal string `[WHATSAPP_NUMBER]`, so **the FAB
does not appear until a real number is saved at `#admin/settings`.** That is deliberate:
the previous behaviour handed every buyer a link that WhatsApp answers with "phone number
shared via url is invalid".

---

## Enquiries

`#admin/enquiries` is a **record of leads, not an inbox.**

### The model matches the form, not the strategy document

`docs/website-strategy.md` specifies a rich RFQ - product, quantity, destination port,
Incoterm, target date. **The live form does not collect any of it.** Its actual fields are
`name`, `email`, `phone`, `message`, `consent` and a `company_website` honeypot, so those
are the columns. Modelling the RFQ schema now would produce a table that is 80% null.
Expanding the form is a content and conversion decision; when it is taken, add the columns
then.

### Flow

1. The form POSTs to `/api/enquiries` - same origin, no third-party provider.
2. A tripped honeypot is answered **200 with nothing stored**. Returning an error just
   teaches the bot which field gave it away.
3. The row is written, sanitized, with `consentAt` timestamped from the checkbox.
4. `MailService` sends a plain-text notification with the **buyer's address as `Reply-To`**.
   Reply from your own mail client - that is the whole workflow, and it is why no
   send-mail UI exists here.
5. `notifiedAt` is set **only if the SMTP server accepted the message.** A null
   `notifiedAt` is surfaced in the list as "Not emailed": the lead arrived, nobody was told.

**The notification can never fail the submission.** Persist first, notify second, swallow
and log any SMTP error. Losing a lead because a mail host was briefly unreachable would be
the worst possible trade on a lead-generation site.

### The `mailto:` fallback is still there

If the API itself is unreachable, `useEnquirySubmit` still hands the buyer a prefilled mail
draft carrying everything they typed, addressed to the `contactEmail` from settings. The
three-state (`submitting` / `success` / `error`) handling and the reset-on-edit rule are
unchanged from before the API existed.

---

## Auth

**JWT bearer, single admin, no refresh rotation.** An 8-hour token then a re-login is the accepted Phase 1a trade.

- Password hashed with **bcrypt, cost 12**.
- Login compares against a dummy hash when the email is unknown, so a wrong email and a wrong password take the same time - otherwise response latency enumerates valid admin addresses.
- **Rate limit 5/min/IP** on login. A single-admin system is exactly one credential to brute-force; this is the only meaningful lock on the front door.
- `JwtStrategy.validate()` **re-reads the admin from the database on every request** rather than trusting the token payload, so a deleted admin's unexpired token stops working immediately.
- Token stored in **`sessionStorage`**, not `localStorage` - it dies with the tab, the right default for a shared laptop.
- The guard calls `/auth/me` on boot rather than trusting that a token merely exists, so a stale token lands on the login screen instead of an admin page that 401s on every request.

### No roles, deliberately

Solstice is ~10 people with one operator. Multi-role RBAC is 100% new work with no current justification. Add roles when there is a named second editor who genuinely must not see something - not before. The `updatedById`/`actorId` columns already record who did what.

---

## The shape boundary

The API speaks Prisma: uppercase enums, `varieties` and `certifications` as arrays of row objects. The display components - `ProductCard`, `ProductGrid`, `ProductFilter`, `ProductDetailPage` - were built and tested against the flat shape of `src/data/products.js`.

`toStaticShape()` in `src/features/admin/useProductsApi.js` maps between them:

| API | Static shape |
|---|---|
| `trade: "IMPORT"` | `trade: "import"` |
| `varieties: [{ name: "Kesar", … }]` | `varieties: ["Kesar"]` |
| `certifications: [{ name, … }, …]` | `certification: "A · B"` (joined) |
| `placeholder: false` | key omitted |

**Keep the mapping here.** If a future field needs to reach the public components, extend `toStaticShape()` rather than changing the components - they are not what changed, and destabilising them to save a mapping function is a bad trade.

---

## Design system

The admin has **no second palette.** Every value comes from `src/styles/tokens.css` - the same tokens the marketing site uses, applied at higher density (13px base vs the site's 15–16px, because this is a table-and-form tool used for minutes at a time).

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

The palette had **no error colour at all** before Phase 1a - unsurprising for a marketing site with nothing to destroy. Added semantically beside the green ramp, in both themes, measured not eyeballed:

| | light | dark |
|---|---|---|
| `--danger` | `#A3231B` | `#FF9E96` |
| `--danger-bg` | `#FBEDEC` | `#3A1714` |
| `--on-danger` | `#ffffff` | `#12211B` |
| `--danger` on `--surface` | 7.40:1 | 7.64:1 |
| `--on-danger` on `--danger` | 7.46:1 | 8.41:1 |

> `--danger-bg` is only ~1.1:1 against `--surface`. **A danger panel must always carry a `--danger` border** - the tint alone is not a visible boundary.

### State is never colour alone

Every chip carries a text label: "Published" / "Draft", "Verifiable" / "Claimed - not verifiable". Colour reinforces; it never carries the meaning by itself.

---

## Decisions worth knowing before you change anything

### Certification `verifiable` is a legal control, not a checkbox

`docs/website-strategy.md` records that claiming a certification without a producible certificate reference is a **legal exposure in several destination markets** and an instant credibility loss when a buyer's compliance team asks.

So marking one verifiable is deliberately awkward:

1. The "Mark verifiable…" button is **disabled** until a certificate reference is entered.
2. Clicking it opens a confirmation panel naming the certificate and stating the consequence. A single click cannot flip the flag.
3. The **server enforces the same rule independently** - `verifiable` is only persisted when a reference is present.
4. Unverified certifications render in the danger treatment, in the list and in the editor, in both themes.

If you make this easier, you are removing a control that exists for a legal reason.

### Delete is a real panel, never `window.confirm()`

The browser dialog cannot be styled, cannot carry the danger token, gives no room to name what is about to be destroyed, and is modal to the whole tab - which blocks the live region announcing the result. The panel names the product and its child-record counts, and **focus lands on Cancel**, not on the destructive button.

### Child collections are replaced wholesale on update

`PUT /api/products/:id` deletes and re-creates varieties, pack options and certifications inside one transaction. Diffing three child collections by id buys nothing at 8 products and is where lost-update bugs live. This does mean **child row ids are not stable across saves** - do not build anything that depends on them persisting.

### Server-side sanitization from day one

`server/src/common/sanitize.ts` strips every tag on write, even though nothing accepts rich text yet. Sanitizing only at render leaves hostile content in the database for the next consumer to forget about - and the next consumer here is a public marketing site. When rich text arrives with Pages, add a *second* function with an explicit tag allowlist; leave this one alone.

### Seeded content is PUBLISHED

The seed imports the 8 live products as `PUBLISHED`, everything else defaults to `DRAFT`. Importing live content as draft would have emptied the public catalogue at cutover.

---

## What is deliberately not built

| Not built | Why |
|---|---|
| **Pages / PageSection CRUD** | Blocked on an open question: `docs/website-strategy.md` says cut Team and Gallery, but both are **live** in the shipped app, and Privacy/Terms are specified but don't exist. Scoping Pages before that is resolved would ship a module that cannot edit two live pages |
| **Split-view live preview** | Phase 2. Non-trivial here because the Products page runs a scroll-driven GSAP explode sequence that a naively re-rendering preview iframe would fight |
| **Rich text (TipTap)** | Arrives with Pages. Product descriptions are a plain textarea |
| **Reply-from-the-admin / inbox UI** | Out of scope by decision. The notification email carries the buyer's address as `Reply-To`, so replying is one click in a real mail client. Building this here would mean owning deliverability, threading and a sent-items store |
| **Virus / malware scanning of uploads** | Explicitly out of scope. Content type is validated by magic bytes and images are re-encoded through sharp, which defeats most polyglots, but nothing scans for malware |
| **A settings UI for anything but contact details** | `SiteSettings` holds only what the codebase actually had. Adding a setting is a migration - that is the accepted cost of named columns |
| **Roles / RBAC** | See [Auth](#auth) |
| **Refresh token rotation** | 8h expiry then re-login is the accepted Phase 1a trade |
| **Cache invalidation from the admin** | An editor must reload the public site to see a change. Acceptable for products; will need solving when Pages has live preview |

---

## Gotchas

- **`src/data/products.js` still exists and is still the seed source.** Editing it does **not** change the site any more - the site reads the API. It is kept so `npm run seed` can bootstrap a fresh database. Do not delete it; do not expect edits to it to appear.
- **`start:prod` runs `dist/src/main.js`, not `dist/main.js`.** `tsconfig.json` includes `prisma/`, so Nest emits under `dist/src/`.
- **The Prisma postinstall may be blocked** by npm's script allowlist. If `@prisma/client` errors about a missing engine, run `npx prisma generate` explicitly.
- **`admin.css` is imported last** in `styles/index.css`. Anything you add there outranks the marketing cascade - which is why it must **not** contain an `outline: none` reset; that would beat the global `:focus-visible` ring in `base.css` and strip focus from every form control. (This shipped as a bug once and was fixed.)
- **The Google Translate widget container is a sibling of `#root`** and is present on admin routes too. It stays `display:none` there because `useTranslateSlot` never finds its header slot, but it is in the DOM.
- **The public site makes one request per resource**, deduped by `features/api/useApiResource.js`: three components asking for `settings` in the same frame produce one GET, and route changes do not refetch. Products and settings are two parallel fetches on first paint today. When Pages lands and it becomes three, that is the point to consider a combined bootstrap endpoint.
- **`clearResource(key)` is the only invalidation.** `updateSettings()` calls it so a save is visible on the public site without a reload; product saves call `clearProductCatalogue()`. Nothing invalidates across browser tabs.

---

## Extending it

**To add a field to `Product`:**

1. `server/prisma/schema.prisma` - add the column. Make it **nullable** unless real data exists for every row.
2. `npx prisma migrate dev --name add_<field>`
3. `server/src/products/dto.ts` - add the validator. `@IsOptional()` for anything aspirational.
4. `server/src/products/products.service.ts` - add it to `scalars()`, sanitizing if it is text.
5. `src/pages/admin/AdminProductEditPage.jsx` - add the form field and include it in the submit payload.
6. Only if the public site needs it: `toStaticShape()` in `useProductsApi.js`, then the display component.

**To add a new admin section** (e.g. Pages):

1. New NestJS module under `server/src/`, copying the public/admin controller split from `products`.
2. New page component under `src/pages/admin/`.
3. One `<button>` in the `AdminApp` sidebar and one branch in its section switch.
4. `adminSection()` already parses `#admin/<section>/<param>` - no router change needed.

**Before building Pages**, read [`docs/admin-cms-blueprint.md`](./admin-cms-blueprint.md) §2 and §3 - the `Page`/`PageSection` model, the typed-sections-over-drag-and-drop argument, and the SEO gap are all worked through there and should not be re-derived.
