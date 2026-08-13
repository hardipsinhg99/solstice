# Admin CMS Blueprint — Solstice Trading International LLP

**Status:** proposal, pre-implementation
**Scope:** a standalone admin application and API replacing the hardcoded content in `src/data/` with a database, so staff can edit products and page content without a deploy.

---

## 0. Read this first — what this document actually is

**This is the rebuild-phase decision being made.** Every execution prompt on this project so far has explicitly deferred backend and CMS work as "a rebuild-phase decision." This blueprint is that deferral ending. It should be presented to the client that way — as the start of a new workstream with its own budget, timeline and hosting commitment — not as an incremental extension of the marketing site.

Three framing points that follow from it:

**This is genuinely greenfield.** The PRIM AI CMS blueprint extended a live system: it inherited JWT auth, a `sharp` upload pipeline, a DOMPurify config and an admin shell, so its "new work" list was short. Here there is **no backend at all**. No auth, no upload pipeline, no sanitization, no admin shell, no database. Everything in §5 is built from zero. Estimates carried over from the PRIM AI project will be wrong in this direction.

**The backend is decoupled from the Astro question.** `CLAUDE.md` records a decided-but-unstarted migration to Astro, blocked on content and photography. That decision does **not** gate this work and is not invalidated by it. A NestJS + Prisma + PostgreSQL API is a data source over HTTP; the current Vite SPA can fetch from it today and an Astro frontend can fetch or build-time-query the same endpoints later. **Nothing in this blueprint is wasted by, or waiting on, the frontend migration.** The one place the two intersect is SEO — see §6, which is the most important section in this document.

**The no-new-dependency rule doesn't apply here.** Prior prompts forbade adding dependencies. That rule protects the *public bundle a buyer downloads*. The admin panel is a separate application on a separate route that never ships to a buyer's browser, so NestJS, Prisma, TipTap and server-side DOMPurify are all fair. The public-site discipline is unchanged: nothing in this document adds a byte to what the marketing site serves.

### What Step 0 changed

Two Step 0 findings contradict the brief and change scope:

- **Team and Gallery are live.** `docs/website-strategy.md` §2.5 recommends cutting both, and specifies `/privacy/` and `/terms/`. The shipped app does the opposite: `team` and `gallery` are routes in `App.jsx` and items in `navigation.js`; Privacy and Terms don't exist. **The strategy doc is a plan that was never executed.** Scoping the Pages module to "Home, About, Services" would leave two live pages uneditable. See Open Q4 — this needs resolving before Pages is built, not during.
- **The enquiry form has no backend at all.** Not Formspree, not Web3Forms — `VITE_FORM_ENDPOINT` is unset with no `.env` file present, so submissions currently fall through to a `mailto:` draft. There is no external service to dual-write against, which makes Open Q1 a simpler decision than framed: this is a greenfield choice, not a migration.

---

## 1. Tech Stack Recommendation

### The API

**NestJS 10 + Prisma 5 + PostgreSQL.** The justification here is not technical merit in isolation — it is that **the client already runs this exact stack on the PRIM AI Institute project.** One developer maintains both. A second stack means a second set of deployment scripts, a second migration workflow and a second thing to remember at 2am. Consistency across the client's own toolset is the deciding factor.

### Rich text

**TipTap, with `@tiptap/extension-image` included from day one.** The PRIM AI audit found that project shipped TipTap *without* an image extension — its sanitizer allowed `<img>` and its upload endpoint returned URLs, but the editor had no node to insert one, so images in rich text were impossible. That gap took a blueprint to notice. Build it in here rather than repeating it.

### Admin frontend

**React + Vite + TypeScript**, a separate app in the same repo (`admin/`), sharing **Solstice's own token file** — not a UI kit, and explicitly **not PRIM AI's navy/electric-cyan/orange palette.** Importing another company's brand colours onto Solstice's internal tool is the wrong kind of reuse. The right reuse is the *structural* pattern PRIM AI's blueprint proved out — typed sections, split-view preview, single admin, no RBAC — applied to Solstice's own dark theme. This is the same discipline used when the globe component was reused earlier in the project: take the pattern, not the skin.

TypeScript here even though the public site is plain JS. The public site's JS is a deliberate constraint on a small, visual, hand-tuned codebase; an admin app is form-heavy, schema-driven CRUD where types pay for themselves immediately — and the Prisma client generates them for free.

### Why build custom rather than adopt Payload / Strapi / Sanity

`docs/website-strategy.md` raised Payload as one option. **Recommendation: build custom on NestJS/Prisma.** Reasons, in order of weight:

1. **The Product model is the whole point, and it is not a blog post.** Solstice's core content type carries HS codes, Incoterm arrays, calibre ranges, cartons-per-pallet and harvest calendars, with real validation rules (an HS code is 6–10 digits; MOQ interacts with pack format). Generic CMSes model this as loose field groups. The bespoke validation that makes this data trustworthy is the actual work, and a CMS doesn't remove it.
2. **One stack, one deploy.** Adopting Payload means the client runs NestJS for PRIM AI and Payload for Solstice. See above.
3. **The API is the deliverable, not the admin UI.** Whatever consumes this — today's Vite SPA, tomorrow's Astro build step — wants a clean typed HTTP API. That is NestJS's core competence; in a CMS it's a secondary surface.
4. Honest counterweight: **a hosted CMS would be faster to Phase 1 and would hand over auth, uploads, drafts and version history for free** — the bulk of §5. If the client's priority is "editable this quarter, cheapest path," Payload is a legitimate answer and this recommendation should be revisited. It is rejected here on *consistency and modelling fit*, not because it wouldn't work.

---

## 2. Database Schema Design

Sketch, not migration-ready. Follows Prisma conventions already used on PRIM AI (`cuid()` ids, `@@map("snake_case")`).

### Product — the highest-value model

Replaces `src/data/products.js` (8 records, 11 loose fields). Field set from `docs/website-strategy.md` §line 111, **which is aspirational: none of these spec fields exist in the codebase today.** Populating them is content work, not just schema work, and should be sized separately.

```prisma
enum TradeDirection { EXPORT IMPORT }
enum ProductStatus  { DRAFT PUBLISHED }
enum Incoterm       { EXW FOB CFR CIF DAP DDP }

model Product {
  id            String          @id @default(cuid())
  slug          String          @unique
  name          String
  trade         TradeDirection                    // already in products.js
  category      String                            // "Fresh fruit" | "Fresh vegetable" | …
  status        ProductStatus   @default(DRAFT)

  description   String          @db.Text
  heroImageUrl  String?
  galleryUrls   String[]

  // Commercial spec — the RFQ-critical block
  hsCode        String?                           // 6–10 digits, validated
  incoterms     Incoterm[]
  moqValue      Decimal?        @db.Decimal(10,2)
  moqUnit       String?                           // "MT" | "cartons" | "containers"
  shelfLifeDays Int?
  storageTempC  String?                           // "2-4" — a range, so String
  portsOfLoading String[]                         // "Mundra", "Nhava Sheva"

  varieties     ProductVariety[]
  packOptions   ProductPackOption[]
  certifications ProductCertification[]
  harvestMonths Int[]                             // 1–12; simpler than a calendar table

  seoTitle       String?
  seoDescription String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  updatedById   String?
  updatedBy     Admin?    @relation(fields: [updatedById], references: [id])

  @@index([trade, status])
  @@map("products")
}

model ProductVariety {
  id        String  @id @default(cuid())
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  name      String                                 // "Alphonso"
  grade     String?                                // "Extra Class" | "Class I"
  calibreMin Int?                                  // grams or count/kg
  calibreMax Int?
  order     Int     @default(0)
  @@map("product_varieties")
}

model ProductPackOption {
  id               String  @id @default(cuid())
  product          Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId        String
  cartonWeightKg   Decimal @db.Decimal(6,2)
  cartonsPerPallet Int?
  palletsPerReefer Int?
  cartonsPerReefer Int?
  notes            String?
  order            Int     @default(0)
  @@map("product_pack_options")
}

model ProductCertification {
  id         String  @id @default(cuid())
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId  String
  name       String                                // "GlobalG.A.P."
  verifiable Boolean @default(false)               // strategy doc §line 167
  reference  String?                               // certificate number, if verifiable
  @@map("product_certifications")
}
```

**`verifiable` is not decoration.** `docs/website-strategy.md` §line 167 is explicit: claiming a certification without a producible certificate number is a legal exposure in several destination markets and an instant credibility loss when a buyer's compliance team asks. The admin UI must make an unverifiable claim visibly second-class — see §4.4.

**Varieties and pack options are child tables, not JSON**, unlike page sections. They are queried and filtered independently ("show me everything available FOB Mundra in 4kg cartons"), which is exactly the criterion that earns a relational table.

### Page / PageSection — structurally identical to the PRIM AI design

```prisma
enum PageStatus { DRAFT PUBLISHED }

enum PageSectionType {
  HERO  INTRO  BUYER_PATH  PRODUCT_FEATURE  MANIFESTO  CTA        // Home
  ABOUT_HERO  STORY  TIMELINE  FOUNDERS  MISSION_VISION  PRESENCE  // About
  SERVICE_LIST  PROCESS  TRUST  CERT_STRIP                         // Services
  RICH_TEXT  FAQ                                                   // shared
}

model Page {
  id             String     @id @default(cuid())
  slug           String     @unique          // "home" | "about" | "services"
  title          String
  status         PageStatus @default(DRAFT)
  metaTitle      String?
  metaDescription String?
  ogImageUrl     String?
  canonicalPath  String?
  sections       PageSection[]
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  updatedById    String?
  updatedBy      Admin?     @relation(fields: [updatedById], references: [id])
  @@map("pages")
}

model PageSection {
  id          String          @id @default(cuid())
  page        Page            @relation(fields: [pageId], references: [id], onDelete: Cascade)
  pageId      String
  type        PageSectionType
  order       Int
  status      PageStatus      @default(DRAFT)
  content     Json                            // shape keyed by `type`, validated at the boundary
  revisions   PageSectionRevision[]
  updatedById String?
  updatedBy   Admin?          @relation(fields: [updatedById], references: [id])
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  @@unique([pageId, order])
  @@map("page_sections")
}

model PageSectionRevision {
  id          String      @id @default(cuid())
  section     PageSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  sectionId   String
  content     Json                            // full snapshot; keep last 5
  createdAt   DateTime    @default(now())
  createdById String?
  createdBy   Admin?      @relation(fields: [createdById], references: [id])
  @@index([sectionId, createdAt])
  @@map("page_section_revisions")
}
```

Typed enum as the safety rail, JSON as the payload, **validated per type at the API boundary** (Zod or `class-validator`) so a bad shape fails at write time where an editor can act on it. The section types above are read off the *actual* components in `src/pages/*/sections/`, not invented — `BUYER_PATH`, `MANIFESTO`, `TIMELINE`, `PRESENCE` and `CERT_STRIP` all exist as built sections today.

### Enquiry — conditional on Open Q1

```prisma
enum EnquiryStatus { NEW READ RESPONDED ARCHIVED }

model Enquiry {
  id          String        @id @default(cuid())
  name        String
  email       String
  phone       String?
  message     String        @db.Text
  productSlug String?                          // if raised from a product page
  status      EnquiryStatus @default(NEW)
  sourceIp    String?
  userAgent   String?
  createdAt   DateTime      @default(now())
  @@index([status, createdAt])
  @@map("enquiries")
}
```

Field names mirror the existing form exactly (`name`, `email`, `phone`, `message` — plus the `company_website` honeypot, which is **checked and discarded, never stored**).

### Admin — one model, no role table

```prisma
model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  @@map("admins")
}

model AuditLog {
  id         String   @id @default(cuid())
  entityType String                            // "Product" | "Page" | "PageSection" | "Setting"
  entityId   String
  action     String                            // created | updated | published | unpublished | deleted | reverted
  actorId    String?
  actor      Admin?   @relation(fields: [actorId], references: [id])
  summary    String?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId, createdAt])
  @@map("audit_log")
}
```

**No `role` column, no role table** — carried over from the PRIM AI finding and stronger here: Solstice is ~10 people and this project has only ever established a single admin. `updatedById`/`actorId` are captured from day one so roles can be added later **without a data migration** — the expensive part of retrofitting RBAC is backfilling who-did-what, and that's solved by recording it now.

### Settings

A `Setting` model (`key` unique, `value` Json, `updatedAt`) for the small global set currently in `navigation.js` and `lib/constants.js` — contact email, WhatsApp number and prefilled message, social links, nav labels. **`value` is `Json`, not `String`.** The PRIM AI audit found a JSON blob crammed into a `String` column there; don't inherit that.

This also fixes a live production bug: `WHATSAPP_NUMBER` currently ships as the literal placeholder `[WHATSAPP_NUMBER]`, so every WhatsApp click on the site hits an invalid-number error. Moving it to `Setting` means it becomes editable rather than a rebuild.

---

## 3. Feature Roadmap

### Phase 1 — Core CRUD, Products first

Products lead because they are the highest-value replacement: 8 records with a spec sheet a buyer actually reads, currently requiring a developer and a deploy to change a harvest month.

**Order within Phase 1:** ① API skeleton (NestJS, Prisma, Postgres, migrations, health check) 🠖 ② auth (§5.1) 🠖 ③ `Product` CRUD + media upload 🠖 ④ admin shell + Products screens 🠖 ⑤ public site reads products from the API 🠖 ⑥ `Page`/`PageSection` CRUD + Pages screens 🠖 ⑦ `Setting`.

**All new.** There is nothing to reuse — that is the defining difference from the PRIM AI project. The only carried-over asset is the token file at `src/styles/tokens.css`, and the section-type list, which is read off existing components.

**Demoable as:** "change a product's MOQ in the admin, refresh the public site, see it."

**Step 6 has a prerequisite:** the Team/Gallery contradiction (Open Q4) must be resolved before Pages is scoped, or the module ships unable to edit two live pages.

### Phase 2 — Editorial UX

**Split-view live preview** — form left, the real public page right in a same-origin iframe, updated by `postMessage` on a ~300 ms debounce. The preview must render the **actual public components**, not an admin approximation; an approximation drifts from production and becomes a lie. §4.1.

**Autosave-to-draft, explicit publish.** Autosave every ~30 s into a draft revision as a crash net; publishing stays a deliberate, consequence-labelled action.

**Version history — last 5 revisions per section**, snapshot-on-save with prune-in-transaction. Restore copies an old `content` back as a new draft. No diff UI.

Note a real complication the PRIM AI blueprint didn't face: **the Vite SPA is client-rendered and GSAP-driven.** The homepage journey sequence and the products explode sequence are scroll-driven canvases. A preview iframe re-rendering on every keystroke will fight those animations. Mitigation: preview mounts sections in a **static preview mode** that skips scroll-sequence initialisation — same components, animations disabled. Size this properly; it is the one genuinely novel piece of engineering in Phase 2.

### Phase 3 — Stretch, on evidence

Section reordering by drag (the `order` column exists; needs `PATCH /pages/:slug/reorder` in a transaction, **plus keyboard move-up/down — drag-only reordering is the classic page-builder accessibility failure**); product duplication for seasonal variants; Enquiries dashboard analytics **only if volume justifies it** — at RFQ volumes a sortable list is likely sufficient forever, and a chart of 6 enquiries a month is theatre.

**Freeform drag-and-drop block composition is deliberately absent.** PRIM AI's codebase had run both experiments — a 2,014-line freeform JSONB editor at one extreme, 100+ ungrouped string keys at the other — and typed sections sat between both observed failure modes. Solstice has *three* editable pages and a smaller team, so the argument is stronger, not weaker. The ceiling matters: with a fixed palette, the worst an editor can do is write bad copy, never break a layout the GSAP sequences depend on.

---

## 4. UI/UX Guidelines

### 4.1 Split-view live preview is the feature

Today, changing a product spec means editing `products.js`, committing, and deploying. Even after Phase 1, a plain form-then-save-then-check-the-site loop means alt-tabbing and a hard refresh to discover the description is too long for the card. Split view collapses that to zero. For **product** editing specifically, preview should show the **product detail page and the catalogue card side by side** — the same copy has to work in both, and the card is where it usually breaks. Below ~1280 px, collapse to an Edit | Preview toggle rather than shrinking both into uselessness.

### 4.2 Establishing the shell from scratch, on Solstice's own tokens

Unlike PRIM AI there is no sidebar to slot into — this is a clean start, which means the discipline has to come from the token file instead of from precedent. Five items: **Dashboard, Enquiries, Products, Pages, Settings.**

Map directly onto `tokens.css` dark values, no new palette: page background `--deep` `#0a1510`; sidebar and cards `--surface` `#152a21`; hairlines `--border` `#31473c`; interactive boundaries `--line-strong` `#688674` (it exists precisely because `--border` is too faint for controls); primary text `--ink`, body `--body`, meta `--muted`; the active nav item and primary actions `--green-600` `#8AD6AB` with `--on-green` `#12211B` as its label — that pair is already contrast-verified at 9.76:1 in dark.

**One genuine gap Step 0 found: there is no danger/error colour in either theme.** A dashboard with destructive actions and validation errors needs one. Add `--danger` / `--danger-ink` to `tokens.css` as part of Phase 1 — a semantic addition to the existing system, not a second palette. `--gold-text` can serve as warning; `--green-600` as success.

### 4.3 Empty and first-run states

Products opens on 8 migrated records, so its empty state is nearly unreachable — but **Pages will open with sections that exist and are empty**, which is the real first-run surface. Any empty section renders a visibly-marked placeholder in the preview pane showing the shape being filled, not a blank box. Enquiries genuinely starts empty and should say what will populate it ("RFQ submissions from the contact form appear here") rather than "No data." Per-field hints do more than a help page: "HS code — 6 to 10 digits, no spaces. Buyers' customs brokers search on this."

### 4.4 Draft vs published, and verifiable vs claimed

Four reinforcing signals for publish state, because colour alone fails for roughly 8% of male users and doubly so in a dark theme: a persistent chip with a **text label** (`--gold-text` "Draft" / `--green-600` "Published"); an "Unsaved" dot on edited sections; a publish control that states the consequence — **"Publish — visible to buyers"**, not "Save"; and a persistent banner in the preview pane while it shows unpublished content.

**Solstice-specific, and higher-stakes than anything in the PRIM AI equivalent:** `ProductCertification.verifiable` needs its own visual state. A certification without a reference number renders in the admin with a warning treatment and the words "Claimed — no certificate reference." An editor should feel friction publishing an unverifiable claim, because the strategy doc identifies it as a legal exposure in destination markets, not a content preference.

### 4.5 Practical accessibility for daily internal use

Operability, not public-site polish. Every control keyboard-reachable; the product list navigable without a mouse. **Visible focus rings** — the public site's dual-tone ring pattern (2px ring plus a contrasting halo) already exists and transfers directly; default browser outlines vanish against `--deep`. Real `<button>`/`<label>`/`<fieldset>` semantics so field labels are announced with inputs. Save and publish results announced through a polite live region, since a purely visual toast is missed by a screen-reader user and by anyone whose eyes are on the preview pane. Phase 3 drag reordering ships with keyboard equivalents or doesn't ship.

**Not gold-plating:** no full WCAG 2.2 AA audit for the admin, no reduced-motion work beyond respecting the OS setting, no screen-reader QA matrix. That bar is for the public site, where the audience is unknown; here it is known and small.

---

## 5. Security Checklist

**Everything below is new.** Nothing is inherited.

1. **Auth — build from zero.** JWT bearer, single admin. `argon2id` for the password hash (not bcrypt — it's the current recommendation and there's no legacy hash to stay compatible with). Short-lived access token with a refresh token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie. Rate-limit the login route hard (`@nestjs/throttler`, ~5 attempts / 15 min / IP) — a single-admin system is a single credential to brute-force. No public registration route at all; the first admin is seeded by CLI.
2. **No roles, deliberately.** §2. Revisit when a named second editor exists who must not see Enquiries — Open Q5.
3. **Server-side sanitization from day one.** DOMPurify (`isomorphic-dompurify`) **on write, in the API**, with an explicit tag/attribute allowlist matching what TipTap emits. Sanitize on render too, but the server is the boundary that matters: sanitizing only at render leaves hostile content in the database for the next consumer to forget about. PRIM AI has that exact problem as a legacy artefact; here it costs nothing to get right first. Keep the allowlist narrow — no `style` attribute, which PRIM AI's config permits and now can't easily remove.
4. **File upload validation.** Multer size limits (8 MB images); mime allowlist `image/jpeg|png|webp`; **magic-byte verification, not just the client-supplied `Content-Type` header**; re-encode every image through `sharp` to WebP — which normalises dimensions and strips a payload dressed as an image; generate a random stored filename, never the user's; serve from a path with `Content-Disposition` and no execute permission. No SVG uploads (SVG is a script vector).
5. **CSRF/XSS.** Bearer tokens in an `Authorization` header for API calls, so classic CSRF doesn't apply to them — but the refresh cookie is a cookie, so its rotation endpoint needs `SameSite=Strict` plus an origin check. CORS locked to the admin origin and the public site origin explicitly, never `*`. Helmet on. A strict CSP for the admin app. XSS is covered by (3) plus rendering all non-rich-text fields as React text nodes; `dangerouslySetInnerHTML` restricted to server-sanitized rich-text output.
6. **Audit log.** `AuditLog` (§2) writes one row per create/update/publish/delete with actor, entity and a human summary, surfaced as a reverse-chronological list. Not enterprise-grade: no tamper-proofing, no retention policy. It answers "who changed the Alphonso MOQ last Tuesday," which is the question that actually gets asked.
7. **Secrets.** `DATABASE_URL`, `JWT_SECRET` and mail credentials in the host's environment, never in the repo. Note the existing `.env.example` warning: `VITE_*` variables are inlined into the public bundle and are public. **No admin secret may ever be given a `VITE_` prefix.**

---

## 6. The SEO gap — stated plainly, because this blueprint does not close it

This is the most important section here, and the honest answer is uncomfortable.

`docs/website-strategy.md` identifies the site's client-rendered, un-indexable content as **the single most expensive defect on the whole site.** The brief asks that SEO fields be wired into what actually renders meta tags, not merely stored.

**This blueprint cannot fully close that gap, and it would be dishonest to imply otherwise.**

Here is why. Adding `metaTitle`/`metaDescription`/`ogImageUrl` to `Page` and `Product` stores the data correctly. But the public site is a **client-rendered Vite SPA using hash routing** (`#products/export`, `#product/mangoes`). Two independent problems:

1. **Hash fragments are not sent to the server and do not create distinct URLs for crawlers.** Every route shares one HTML document and one `<title>`. No amount of database SEO metadata changes that — the crawler never requests a URL that could receive it.
2. **Content arrives after JavaScript executes.** Google can render JS, but does so on a deferred budget; other crawlers and most social/link-preview unfurlers do not.

So: **a `Page.metaTitle` in this schema would be stored, editable, and invisible to search engines — exactly the failure the strategy doc named, reproduced in a new form.** Storing it is still correct, because it is the input the eventual fix consumes. Presenting it as *solving* SEO would not be.

What actually closes it, in ascending order of cost:

- **Astro migration (already the decided plan).** Real URLs, real per-page HTML, meta at build or request time. `Page`/`Product` SEO fields feed it directly. This is the intended answer and this blueprint is the prerequisite, not a substitute.
- **Prerendering for bots** — the API serves crawler-detected requests a rendered HTML shell with correct meta. Cheaper, a known pattern, and effective; a genuine option if Astro slips. Worth noting the PRIM AI project solved it exactly this way.
- **Switching the SPA from hash to history routing plus static prerendering at build.** Middle cost, would need hosting rewrite rules — which hash routing was specifically chosen to avoid.

**Recommendation:** ship the SEO fields in Phase 1 as data, and state in writing to the client that **search visibility is delivered by the Astro migration, not by this backend.** The two workstreams are sequential, not alternative. If Astro is deferred past ~2 quarters, bot prerendering should be added to this backend's scope as Phase 2.5 — that is a decision to take deliberately, not to discover later.

---

## Open Questions

**Blockers**

1. **Enquiries: dual-write or full replacement?** Step 0 changes this question. There is *no* live external service — `VITE_FORM_ENDPOINT` is unset with no `.env` file, so the form currently degrades to a `mailto:` draft and **no enquiry is being captured anywhere.** So this isn't a migration: it's a greenfield choice. Recommendation: **the new API owns submissions** (`POST /enquiries` 🠖 row + email notification), which removes a third-party dependency and makes the Enquiries module real rather than decorative. Confirm the client accepts that email delivery becomes this backend's responsibility (needs a transactional provider — Postmark/SES — and a domain with SPF/DKIM). **This is a blocker because it changes Phase 1 scope and adds an external service dependency.**
2. **Hosting.** Where does this run? The client's wider work involves NOC/ISP infrastructure and a Dell head-end server, so self-hosting on infrastructure they already control is plausible — but that means they own Postgres backups, TLS renewal, uptime and OS patching for a system that will hold their sales pipeline. A managed platform (Railway, Fly, Render — PRIM AI's backend already deploys with a `railway.toml`) trades cost for that operational burden. **Blocking because it determines the backup and DR design, which is not a thing to retrofit around a database of RFQs.**
3. **Team and Gallery — the contradiction must be resolved before Pages is built.** The strategy doc says cut both; the shipped site has both live in the nav. Either (a) execute the cut, and Pages covers Home/About/Services as briefed; or (b) keep them, and Pages must cover five pages with section types for each. Also unresolved: `/privacy/` and `/terms/` are specified in the IA and **do not exist** — for GDPR-region buyers and ad platforms that is a live compliance gap independent of this project.

**Important, not blocking**

4. **Is the Astro migration still the plan, and on what timeline?** Not blocking — the API is framework-decoupled. But per §6 it is what actually delivers SEO, so the timeline determines whether bot prerendering enters scope as Phase 2.5.
5. **Who is "the admin" in practice?** Presumably the founders directly. Confirm before the single-user assumption goes deeper than the schema. The schema itself is safe either way — `Admin` is a table, not a constant, and `updatedById` is recorded from day one — but the *UI* assumes no collaboration: no locking, no "someone else is editing this," no conflict resolution. If two founders will both edit, say so now; last-write-wins is fine for one person and silently destructive for two.
6. **Who populates the spec data?** The Product model's value is HS codes, Incoterms, MOQ and pack configurations — **none of which exist in the codebase today.** Someone at Solstice must produce them for 8 products before the model is more than empty columns. That is content work with a real cost and it is not in the engineering estimate.

**Assumptions flagged**

7. **Admin lives in the same repo** (`admin/`) as a second Vite app, sharing `tokens.css` by relative import. Separate repos would mean duplicating or publishing the token file; not worth it at this size.
8. **`Product.storageTempC` is a `String`** (`"2-4"`) because it's a range, not a scalar. If range filtering is ever wanted, it needs splitting into min/max — cheap now, migration later.
9. **`harvestMonths Int[]`** rather than a calendar table, since the requirement is "which months," not per-date availability.
10. **Media is object storage returning URLs**, no `Media` model. Matches how `image` works in `products.js` today. A browsable media library is a legitimate later feature, not a dependency.
11. **No content scheduling** (publish-at). Not asked for, and it needs a scheduler this backend won't otherwise run.
12. **The 8 existing products migrate as `PUBLISHED`**; everything else starts `DRAFT`. Migrating live content into a draft state would silently empty the public catalogue on cutover.
