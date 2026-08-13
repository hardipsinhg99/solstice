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
- [Pages and typed sections](#pages-and-typed-sections)
- [The admin shell](#the-admin-shell)
- [Dashboard](#dashboard)
- [Gallery](#gallery)
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

A NestJS + Prisma + PostgreSQL API lives in `server/`. It owns the product catalogue (which used to be a hardcoded array in `src/data/products.js`), the Home/About/Team page content, the team members, the gallery, the site's contact settings and the enquiries the public form receives. The admin UI is **not a separate application** - it is a set of routes inside the existing Vite SPA (`#admin/*`), guarded by a JWT check, rendering *instead of* the marketing shell. The public Products, Home and Product Detail pages now fetch from the API instead of importing the static file. One admin account, no roles.

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

`vite.config.js` proxies `/api` 🠖 `http://localhost:3001`, so the frontend and API are same-origin in development and CORS never applies locally. Override the target with `VITE_API_PROXY_TARGET` if the API runs elsewhere.

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
├── features/gallery/
│   └── useGallery.js            admin CRUD + the public read, through useApiResource
├── features/pages/
│   ├── sectionTypes.js          THE section contract - server seed, editor and page read it
│   ├── usePagesApi.js           admin draft/publish + the public usePage(slug) read
│   └── useTeamApi.js            team CRUD + the public usePublicTeam()
├── components/admin/
│   ├── AdminSidebar.jsx         grouped, collapsible, localStorage-persisted
│   ├── AdminTopBar.jsx          title, notification bell, account menu
│   ├── RichTextEditor.jsx       TipTap - the one planned frontend dependency
│   ├── SectionFields.jsx        the six field kinds the section config drives
│   └── DangerConfirm.jsx        the ONE destructive-confirmation component
├── pages/admin/
│   ├── AdminApp.jsx             shell + route guard
│   ├── AdminDashboardPage.jsx   stat cards, warning panel, activity list
│   ├── AdminGalleryPage.jsx     upload, caption, reorder, hide, delete
│   ├── AdminPageEditor.jsx      ONE editor for every page, driven by sectionTypes.js
│   └── sections/TeamMembersManager.jsx
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

`Product` and all three child tables carry `updatedById 🠖 Admin`. There is **no role column and no role table** - see [Auth](#auth). The foreign keys exist from day one specifically so that adding roles later needs no data migration; backfilling who-did-what is the expensive half of retrofitting RBAC.

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
| `GET` | `/api/gallery` | - | **Published rows only.** `max-age=60` |
| `GET` | `/api/gallery/admin` | JWT | Every row, including hidden ones |
| `POST` | `/api/gallery` | JWT | Multipart upload - **the same `MediaService` pipeline products use** |
| `PATCH` | `/api/gallery/order` | JWT | Full-list reorder |
| `PATCH` | `/api/gallery/:id` | JWT | Caption and published flag |
| `DELETE` | `/api/gallery/:id` | JWT | Removes the row **and the bytes** |
| `GET` | `/api/dashboard` | JWT | Stats + notifications + activity, one request |
| `GET` | `/api/dashboard/notifications` | JWT | The bell alone |
| `GET` | `/api/pages/:slug` | - | **PUBLISHED pages, `publishedData` only.** `max-age=0, must-revalidate` |
| `GET` | `/api/pages/admin/:slug` | JWT | Draft + published, with `hasUnpublishedChanges` per section |
| `PATCH` | `/api/pages/admin/:slug/section/:key` | JWT | Saves the **draft**. Never touches published |
| `POST` | `/api/pages/admin/:slug/publish` | JWT | Copies every draft onto published, in one transaction |
| `POST` | `/api/pages/admin/:slug/unpublish` | JWT | Off the public site. Drafts kept |
| `POST` | `/api/pages/admin/:slug/discard` | JWT | Draft back to what is live |
| `GET` | `/api/team` | - | Published members only |
| `POST` `PATCH` `DELETE` | `/api/team[/:id]` | JWT | Full CRUD, plus `/order` and `/:id/photo` |
| `POST` | `/api/media/assets` | JWT | An unattached asset - section image fields and TipTap image insert |

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

## Pages and typed sections

`#admin/page-home`, `#admin/page-about`, `#admin/page-team`. **One editor component**,
`AdminPageEditor`, parametrized by slug and by the section config in
`src/features/pages/sectionTypes.js`. Three near-identical editor files would have repeated
the mistake `useApiResource` already fixed once in this project.

### Fixed typed sections, not freeform blocks

A section's `type` selects a known field set that a real React component already consumes.
An editor picks values inside a section the site has a component for; they cannot invent a
section, or drag a hero into the middle of the footer. That was the blueprint's whole
argument against drag-and-drop page building, and `sectionTypes.js` is where it is enforced.

`data` is `Json` rather than columns because the shape genuinely differs per type - a
repeater of four cards and a two-CTA hero have nothing in common. **The type is the
contract; the JSON is only its storage.**

### Draft and published are separate payloads

This is the one place the Page model deliberately does **not** copy Product. Product has a
single status flag, and an edit to a published product goes live instantly. That cannot
express *"save this wording but do not ship it yet"*, which is exactly what an editor needs.

- `PageSection.draftData` - what the admin edits
- `PageSection.publishedData` - what `/api/pages/:slug` returns, and nothing else
- **Publish** copies draft onto published for every section, in one transaction

An unpublished edit is not hidden by the UI; it is not in the public response. Verified by
saving a section, reading the public endpoint (unchanged), publishing, and reading again.

`hasUnpublishedChanges` is **computed** by comparing the two payloads, never stored - a
stored flag is one more thing that can drift out of step with what it describes.

**Publishing is blocked while a section has unsaved edits on screen**, because publishing
then would silently ship the previous wording.

### The cache header is `must-revalidate`, not `max-age=60`

A minute of staleness is harmless on a catalogue. This is the endpoint an editor refreshes
*the instant* they press Publish, and serving them their own pre-publish copy reads as
"publishing is broken". Express still emits an ETag, so an unchanged page costs one 304.
This shipped as a real bug during Phase 1e and was caught by the acceptance test.

### Team members

Records, not section JSON, because they need individual CRUD, ordering and a photograph
through the media pipeline - the same three things `GalleryImage` needs. They publish
immediately: someone who has left should come off the site when they are removed, not when
somebody remembers to publish the page.

**`name` did not exist before Phase 1e.** The live page rendered three *anonymous* role
cards - the array was `[role, copy, image]` - each illustrated with a stock Unsplash
portrait of a stranger. `docs/website-strategy.md` §2.5 calls that a falsifiable trust
claim, and it was the longest-standing flag in the original audit. The stock photographs
were **not** migrated; a member without a photograph renders an initials monogram, the same
treatment the founders' cards use.

### Rich text

TipTap arrived here, exactly as the blueprint deferred it to. `sanitizeRichText()` in
`common/sanitize.ts` is an **allowlist**, never a blocklist: the set of things that can
execute script in HTML is open-ended, so the only defensible position is to name what is
permitted and drop everything else. `ALLOWED_URI_REGEXP` is what stops `javascript:` and
`data:` in an `href` or `src`.

The editor cannot produce hostile markup either, but **the editor is a convenience and the
endpoint is the control** - an attacker POSTs to the endpoint and never opens the editor.
Verified by POSTing `<script>`, `onerror=`, `javascript:`, `<iframe>`, `<svg onload>`,
`onclick=` and `<style>` directly, and reading back what was stored.

Which keys are rich text is named explicitly in `PagesService` (`body`, `bio`). A default of
"treat everything as rich text" would let markup into a plain field the day somebody adds
one, so the safe direction is the default.

### Adding a page later

1. A row in `PAGE_CONFIG` in `sectionTypes.js` with its section types and fields.
2. A seed row in `prisma/seed-pages.ts` carrying the copy that is live today.
3. The public component calls `usePage(slug, FALLBACK)`.

No new admin file, no schema change, **and no sidebar edit** - `AdminSidebar` and the
top-bar titles are derived from `PAGE_CONFIG`.

Phase 1e claimed this was already true and it was not: `AdminSidebar` and `AdminApp` each
carried their own hardcoded page list, so a new page was three touchpoints. Services closed
that. It is the kind of gap that only shows up the first time somebody actually uses the
generalization, which is the argument for adding the fourth page rather than assuming.

### The globe plots from the page's own list

Both globes - Home's "A truly global footprint" and About's "Our Global Presence" - read
their markers from the same editable list the legend beside them renders. Adding a country
in the admin moves the pin; `src/data/globe.js` is now only the pre-fetch fallback.

Each location row carries `lat`, `lng` and an `hq` toggle. Arcs radiate from whichever row
is flagged headquarters (the first plotted row stands in if none is). **A row with no
coordinates is still listed, just not plotted** - an editor adding an office before anyone
has looked up its latitude should not have the location silently vanish from the text, and
inventing a coordinate to avoid a gap would be inventing a fact.

The opening rotation is derived, not fixed. The globe used to open on the Americas with
every Solstice office on the far side, which is a poor look for a section titled "Our
Global Presence". `phiForMarkers()` centres the mean longitude of the plotted markers,
averaged **on the unit circle** - a plain numeric mean of 170 and −170 gives 0, the exact
opposite side of the planet. cobe's convention is `phi = −longitude − π/2`; that was
measured by rendering a single marker at three known longitudes and reading back its pixel
centroid, not guessed.

Light theme was also rebalanced: a white sphere with `mapBrightness: 10` on a `#f8f7f1`
page meant both the globe body and its dot map were invisible. The base now sits just below
the page background and the dots are darker than the base, which is the way round a
light-mode map has to be.

### Rich text is targeted by section type and path

`RICH_PATHS` in `PagesService` names the exact `type` + dotted path of every rich-text
field - `about.story 🠖 nodes.body`, `about.missionVision 🠖 items.body`.

The first version keyed off the field NAME (`body`, `bio`) wherever it appeared, and
Services disproved it immediately: its repeaters also use `body`, for plain textareas, and
inherited About's allowlist. Nothing dangerous survived either way - `<script>`, `onerror`,
`javascript:`, `<iframe>`, `<svg onload>`, `onclick` and `<style>` are stripped by both
cleaners - but a plain textarea could store `<img>` and `<a>`, which the page then prints
literally because it renders that field as a string.

Adding a third rich field means an entry here **as well as** in `sectionTypes.js`. That
duplication is deliberate: the server must not infer its security posture from a name it
happens to share with the client.

---

## The admin shell

`AdminSidebar` + `AdminTopBar` + a page, all under `AdminApp`.

### The sidebar is grouped, not flat

```
MAIN      Dashboard · Catalogue ▾ (Products, Enquiries)
CONTENT   Gallery
SETTINGS  Settings
```

A flat list works at four items and stops working at eight. MAIN is what you open the
panel to do, CONTENT is what you edit occasionally, SETTINGS is what you touch twice a year.

**Collapsing hides labels visually, never from the accessibility tree.** The collapsed rail
uses the visually-hidden pattern (`clip: rect(0 0 0 0)`), not `display: none`, so every
button keeps its accessible name. `display: none` here would turn a 64px rail into a column
of unlabelled icons for a screen-reader user.

State lives in `localStorage` under `solstice-admin-nav-collapsed` and
`solstice-admin-nav-catalogue`, matching the precedent `solstice-theme` set. This is a UI
preference belonging to a person and a machine - it has no business in the database.

**The Catalogue group reopens itself when it holds the current page**, so collapsing it can
never hide where you are.

### The top bar is not the reference mockup's top bar

The design this phase was based on mirrored the whole public site navigation - Home, About
us, Services, Products, Team, Gallery, Contact us - across the top of the admin. That was
rejected. An operator editing a product does not navigate to the public About page from
here, and reproducing the marketing nav means a second navigation model to keep in sync
with `data/navigation.js` for a workflow nobody has. The sidebar already carries one
"View site" button for the one time it is wanted.

What it carries instead: the page title (the document's single `<h1>` - every page owns an
`<h2>`), the notification bell, and an account menu.

**The account menu prints no role.** There are no roles. "Administrator" under the name
would imply a permission system that does not exist.

Both menus are native buttons and a plain `<ul>`: no dropdown library, no focus trap. They
are menus, not dialogs - Escape closes, outside pointerdown closes, Tab walks out. **Escape
returns focus to the trigger** when focus was inside the panel; without that the browser
drops focus to `<body>` and a keyboard user is silently returned to the top of the document.

---

## Dashboard

`#admin` and `#admin/dashboard`. Four stat cards, a warning panel, a recent-activity list.

### Every number is a count query

`DashboardService.stats()` runs five `count()` queries in one `Promise.all`. Nothing is
sampled, estimated or derived from a constant.

| Card | Query |
|---|---|
| Total products | `product.count()` |
| Published | `product.count({ status: PUBLISHED })` |
| Unverified claims | `product.count({ certifications: { some: { verifiable: false } } })` - counted over **products**, not certification rows, because the operator acts on a product |
| Open enquiries | `enquiry.count({ status: { not: CLOSED } })` |

### "Exports This Month" was removed, not implemented

The reference mockup carried an *Exports This Month: 12* card. **Nothing in this schema
records an export, a shipment or a dispatch**, so that number could only ever have been
invented - on a panel whose entire job is trustworthy status at a glance. It is replaced by
**Open enquiries**: leads not yet closed, the one figure on the page that means "work
waiting for you".

Open rather than "new in the last 30 days" because the bell already counts NEW; a second
card repeating it would be decoration.

### The bell

`notifications.count` and `notifications.items` come from the same query, so the badge and
the list cannot disagree. **The count is in the button's `aria-label`, not only in the
badge** - a superscript number is invisible to a screen reader. Clicking an item navigates
to `#admin/enquiries/<id>`, which scrolls that row into view and marks it.

### Recent activity

`AuditLog` has been written to since Phase 1a and read by nothing. The last six entries are
surfaced here - one query, no chart, no library. Action strings are mapped to English in
`AdminDashboardPage.jsx`; that is a display concern and does not belong in the database.

---

## Gallery

`#admin/gallery` edits the public `#gallery` page, which until Phase 1d was six Unsplash
URLs in an array at module scope in `GalleryPage.jsx`.

### It is not a second upload system

`GalleryService` depends on **`MediaService`**, the same class `ProductMediaService` uses.
There is no `fs` import anywhere under `server/src/gallery/`, no path construction, and no
second call site for `StorageService.save()`. Uploads get the identical treatment: magic-byte
content validation, 8 MB ceiling, resize to 1600px, WebP re-encode down a quality ladder to
under 400 KB, EXIF stripped, UUID-sharded filename.

### Caption and alt text are two fields

They answer different questions. **Alt text** is what a screen reader hears *instead of* the
photograph. **Caption** is the visible line a sighted visitor reads underneath. Merging them
produces captions that read like alt text and alt text that reads like marketing.

The six migrated photographs carry **no alt text**, because the page they came from rendered
`alt=""` for all six. Inventing descriptions of pictures nobody has looked at would be
fabricating content, so the gap is counted and surfaced in a warning panel instead.

### Reorder is buttons first, drag second

Explicit move-up/move-down buttons on every tile, with native HTML5 drag as the enhancement.
Drag-only reordering is the classic accessibility failure of a media manager. Reorder sends
the **whole list**, not a from/to pair, so a stale client is rejected rather than silently
reshuffling rows somebody else added.

### Deleting removes the bytes

`GalleryService.remove()` calls `MediaService.deleteAsset()`, which unlinks through
`StorageService` and then drops the row - storage first, so a failed unlink leaves a
reachable asset rather than an orphaned file. `EXTERNAL` assets skip the unlink: there is no
file of ours to remove. Remaining rows are compacted so `order` stays dense.

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
| Text | `--ink` 🠖 `--body` 🠖 `--muted` |
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
| **Privacy and Terms** | All that remains of the original IA blocker, and **not a technical gap**. They are specified and do not exist because nobody has written them. The site takes enquiries from EU and UK buyers, so what those pages must say is a decision for the client and likely for counsel. A stub page would make the gap harder to see, not easier - so there is deliberately no `privacy` or `terms` row, no sidebar entry and no placeholder copy anywhere in the codebase |
| **Live / split-view preview** | Still deferred, for the reason the blueprint gave: a naively re-rendering preview iframe would fight the scroll-driven GSAP canvases on Home and Products |
| **"Enquiry Quotes"** | Appeared in the reference mockup's sidebar. It implies a quoting subsystem - line items, pricing logic, PDF generation - that is not specified anywhere and that nothing in the schema supports. Not built, and not stubbed |
| **Charts / analytics** | The dashboard is counts and a list. No chart library, no export or shipment tracking - there is no shipment data to track |
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
