# Solstice Trading International LLP — Website Strategy & Structural Blueprint

**Document status:** Strategy. No source files were modified in producing this.
**Prepared for:** [COMPANY_NAME] leadership
**Scope:** Information architecture, UX/UI direction, SEO roadmap, conversion model, technology recommendation.

---

## Step 0 — What I found in the repository

1. `package.json` — 5 deps (`react`, `react-dom`, `vite`, `cobe`, `@vitejs/plugin-react`), all pinned to `"latest"`; scripts are only `dev`/`build`/`preview`. There is **no `vite.config.js` anywhere**, so the React plugin is declared but never loaded.
2. `index.html` — 31 lines. `<head>` holds `charset`, `viewport`, `theme-color`, `<title>`. Nothing else: no description, canonical, OG, or favicon.
3. `src/main.jsx` — 820 lines holding everything: the content constants (`products` ×6 with `slug/type/image/description/varieties/season/origin/packaging/certification`, `navItems`, `contactFaq` ×6, `chatFaq` ×4, `globeMarkers` ×4, `globeArcs` ×3), a 15-glyph inline-SVG `Icon` map, the `Reveal`/`useInView` IntersectionObserver system, 7 route components plus `ProductDetail`, and the ~8-line hash router in `App` (lines 783–818).
4. `src/main.jsx:653–671` — the contact form's `onSubmit` is `preventDefault()` then `setSent(true)`; inputs are uncontrolled with no `name` attributes.
5. `src/Globe.jsx` — 174 lines wrapping `cobe`: DPR capped at 2, `mapSamples: 16000`, square canvas sized from `offsetWidth` with a `ResizeObserver` fallback, momentum drag with `velocity *= 0.95`, theta clamped ±0.4, and an unconditional `requestAnimationFrame` loop with no visibility or intersection gate.
6. `src/styles.css` — 656 lines, 17 banner-commented sections, breakpoints at 780/480/390px. Token system on `:root` + `html[data-theme='dark']`, `color-mix()`, `clamp()` type, DM Sans / Playfair Display italic / DM Mono, `feTurbulence` grain at 3.5%.
7. The hero LCP candidate is a **CSS `background-image`** on `.hero-media:before` (styles.css:114), fed by the `--hero-image` token from Unsplash at `w=2000`, with a 30s infinite `heroZoom`.
8. Measured token contrast: ink/bg 14.19:1 light, 15.6:1 dark — strong. But `--muted` on `--bg` is **4.64:1** (bare pass), and `--line` (form input borders, styles.css:419) is **1.22:1** — a WCAG 2.2 SC 1.4.11 failure.

---

# 1. Site Architecture Map

## 1.1 The routing decision, and why it comes first

Hash routing must be replaced with **real, server-addressable paths**. This is not a preference; it is the precondition for every other recommendation in this document, because a URL that a crawler cannot fetch independently cannot rank, cannot be shared with a distinct link preview, and cannot be tracked as a distinct conversion path.

**Replace with:** static path-based routing under a build that pre-renders every route to its own HTML file — `/products/mangoes/` resolves to a real `index.html` containing the full spec sheet in the initial response, not after a JS bundle executes.

**Migration cost against the current Vite setup — honest accounting:**

| Asset | Portability | Effort |
|---|---|---|
| `styles.css` (656 lines) | Ports **verbatim**. Plain CSS with custom properties is framework-agnostic. | ~0 |
| `Globe.jsx` | Ports as a client-side island, unchanged apart from a lazy-mount wrapper. | S |
| The 7 page components | ~80% of their JSX is static markup. Converting to templates is mechanical, not creative. | M |
| Interactive fragments (mobile menu, product filter, gallery lightbox, FAQ accordion) | Each becomes a small isolated island. | M |
| Content constants | Become typed content collections / CMS records. Structure changes, copy does not. | M |
| The hash router (`App`, ~8 lines) | **Deleted.** Replaced by file-based routing. | 0 |

Realistic effort: **3–4 developer-weeks** to reach launch parity plus the Phase 1 additions, assuming content is supplied. The reason this is affordable is that the expensive artefact — the design system in `styles.css` — survives the move intact. Nothing here proposes throwing away work; it proposes changing the shell around it. See §5 for the framework recommendation and §5.5 for the migrate-vs-rebuild position.

One consequence to accept openly: pre-rendered paths require a host that serves real files per path. Cloudflare Pages, Netlify, and Vercel all do this at zero cost. The current `dist/`-on-any-static-host model survives; only the number of HTML files changes.

## 1.2 Sitemap

Phase 1 is the launch scope a 10-person company can actually fill with true content. Phase 2 is the scale architecture. Every Phase 1 URL is designed so that Phase 2 slots into it without a second migration.

### Phase 1 — Launch (14 URLs + 6 spec sheets)

| Path | Purpose | Primary keyword target | Phase |
|---|---|---|---|
| `/` | Establish that this is a real, registered, shippable operation within 90 seconds; route to catalogue or RFQ. | `fresh produce exporter india` | 1 |
| `/products/` | Filterable catalogue index; the hub of the commodity cluster. | `indian fruit and vegetable exporter` | 1 |
| `/products/mangoes/` | Spec sheet — Kesar, Alphonso, Banganapalli. | `indian mango exporter` | 1 |
| `/products/pomegranates/` | Spec sheet — Bhagwa. | `bhagwa pomegranate exporter india` | 1 |
| `/products/grapes/` | Spec sheet — Nashik table grapes. | `indian table grape exporter` | 1 |
| `/products/onions/` | Spec sheet — red onion, mesh bag formats. | `onion exporter india` | 1 |
| `/products/okra/` | Spec sheet. | `fresh okra exporter india` | 1 |
| `/products/seasonal-vegetables/` | Spec sheet — enquiry-led category page. | `indian vegetable exporter` | 1 |
| `/services/` | Single consolidated page: sourcing, QC, packing, export documentation, logistics. **One page, not five** — because there is not yet five pages of true content, and thin pages suppress the whole domain. | `fresh produce sourcing and export services india` | 1 |
| `/quality-compliance/` | The trust page. Certifications actually held, QC protocol, cold-chain handling, documentation issued per shipment. | `apeda registered fresh produce exporter` | 1 |
| `/about/` | Corporate facts: LLP registration, incorporation date, registered office, GST status, team size, leadership. | `solstice trading international llp` | 1 |
| `/request-quote/` | The primary conversion page. Full RFQ form. | `request quote indian produce exporter` | 1 |
| `/contact/` | Registered address, map, phone, WhatsApp, email, office hours in buyer time zones. Distinct from `/request-quote/` because a buyer who wants to verify an address is not the same buyer who wants to transact. | `solstice trading ahmedabad contact` | 1 |
| `/thank-you/` | Post-submission confirmation. `noindex`. Exists as a discrete URL because it is the conversion trigger for analytics. | — | 1 |
| `/privacy/`, `/terms/` | Legal. Required for GDPR-region buyers and for ad platforms. `noindex` optional. | — | 1 |

**Deliberately cut at Phase 1:**

- **`/team/`** — ships only if real photographs of real staff exist. Currently the page shows Unsplash photographs of unidentified strangers under role headings. For a buyer whose entire task is verifying that this is a real operation, a reverse-image search that returns a stock library is a catastrophic trust failure. Better to have no team page than a falsifiable one. Leadership named in text on `/about/` covers Phase 1.
- **`/gallery/`** — six decorative stock produce images serve no RFQ-stage need. It returns in Phase 2 as `/facilities/` with photographs of the actual packhouse, grading line and loading, which *is* evidence.

### Phase 2 — Scale (activated by content velocity, not by calendar)

| Path | Purpose | Primary keyword target | Trigger |
|---|---|---|---|
| `/products/category/[category]/` | `fresh-fruit`, `fresh-vegetables`, `spices`, `dried-fruit`, `fruit-pastes`. Faceted hubs. | `indian spice exporter` | ≥15 SKUs |
| `/markets/[country]/` | Destination-market pages: `/markets/uae/`, `/markets/vietnam/`, `/markets/china/`, plus confirmed targets. Port pairs, transit times, documentation required for that market, seasonal fit. **This is the highest-value Phase 2 asset** — it is where commodity intent and destination intent intersect. | `import indian mangoes to uae` | Confirmed [PRIMARY_MARKET_REGION] list |
| `/services/[slug]/` | Split out only when each has ≥600 words of non-duplicative substance: `private-label`, `packaging-solutions`, `export-documentation`, `contract-farming`. | `private label fruit packing india` | Real case detail exists |
| `/resources/seasonality-calendar/` | Interactive month × commodity availability matrix. Genuine link magnet. | `indian fruit export season calendar` | Phase 2 |
| `/resources/container-loadability/` | Cartons-per-reefer calculator across pack formats. | `how many cartons of mangoes in a 40ft reefer` | Phase 2 |
| `/resources/incoterms-for-perishables/` | FOB vs CFR vs CIF for reefer cargo. | `incoterms for perishable exports` | Phase 2 |
| `/resources/hs-codes/` | HS code reference for the catalogue. | `hs code fresh mangoes india` | Phase 2 |
| `/insights/[slug]/` | Market updates, crop reports, freight-rate commentary. | Long-tail | Sustainable cadence confirmed |
| `/facilities/` | Real packhouse and cold-store photography. | `fruit packhouse gujarat` | Real photography exists |
| `/downloads/product-catalogue/` | Gated PDF; secondary conversion. | — | Phase 2 |

**Explicitly not proposed:** per-certification pages, per-port pages, per-variety pages, or a multilingual tree. Each is a defensible idea at 200 SKUs and a content team. At 6 SKUs and 10 employees they would produce thin, duplicative pages that dilute the domain. The IA above scales to them without restructuring — `/products/category/` and `/markets/` are the extension points.

## 1.3 Product data schema

Product pages are **spec sheets, not e-commerce pages**. There is no cart, no price, no stock counter. The page's job is to let a sourcing manager decide, without a single email, whether this product fits their programme — and to make the RFQ a formality rather than an enquiry.

The current `products` array carries 9 fields. An importer needs roughly 30. This is the target schema:

```ts
interface Product {
  // Identity
  slug: string;                      // URL segment — stable, never re-slug after indexing
  name: string;                      // "Mangoes"
  botanicalName: string;             // "Mangifera indica" — matches trade & phyto documentation
  category: 'fresh-fruit' | 'fresh-vegetable' | 'spice' | 'dried-fruit' | 'fruit-paste';
  hsCode: string;                    // "0804.50.20" — buyers search by this; customs requires it

  // Commercial specification
  varieties: Variety[];
  grades: string[];                  // "Extra Class", "Class I", "Class II"
  sizeCalibre: SizeSpec[];           // count-per-carton or mm calibre bands
  moq: { value: number; unit: 'MT' | 'containers' | 'cartons' };
  incoterms: ('EXW'|'FOB'|'CFR'|'CIF'|'DAP'|'DDP')[];
  pricingModel: 'quote-only';        // see Open Question 5
  portsOfLoading: Port[];            // Mundra, Nhava Sheva, Pipavav — with ICD linkage

  // Packing & loadability — the single most requested data set at RFQ stage
  packaging: PackFormat[];

  // Cold chain
  storageTempC: { min: number; max: number };
  relativeHumidityPct: { min: number; max: number };
  shelfLifeDays: { min: number; max: number; condition: string };
  transitModes: ('reefer-sea' | 'air' | 'controlled-atmosphere')[];
  ethyleneSensitivity?: 'low' | 'medium' | 'high';   // governs mixed-load compatibility

  // Origin & timing
  originRegions: string[];           // "Junagadh, Gujarat" — region, not just state
  availability: MonthAvailability[]; // 12 entries: 'peak' | 'available' | 'limited' | 'none'

  // Compliance
  certifications: CertificationRef[];// links to /quality-compliance/
  documentsIssued: string[];         // Phytosanitary, COO, Packing List, BL, Fumigation

  // Content & SEO
  summary: string;                   // 160 chars — doubles as meta description
  body: string;                      // MDX — buyer-facing narrative, quality notes
  images: ProductImage[];            // self-hosted, AVIF/WebP, with real alt text
  relatedSlugs: string[];            // editorially chosen, not type-matched
  updatedAt: string;                 // ISO — surfaced on-page; freshness is a trust signal
}

interface PackFormat {
  label: string;                     // "4kg telescopic carton"
  netWeightKg: number;
  grossWeightKg: number;
  cartonDimensionsMm: [number, number, number];
  cartonsPerPallet: number;
  palletType: 'euro' | 'standard' | 'loose';
  cartonsPer20ftReefer: number;
  cartonsPer40ftReefer: number;
  palletsPer20ftReefer: number;
  palletsPer40ftReefer: number;
  netWeightPer40ftMT: number;        // pre-computed — do not make the buyer multiply
}

interface Variety   { name: string; notes: string; peakMonths: number[]; }
interface SizeSpec  { grade: string; countPerCarton?: string; calibreMm?: [number, number]; weightG?: [number, number]; }
interface MonthAvailability { month: number; status: 'peak'|'available'|'limited'|'none'; }
interface Port      { name: string; unlocode: string; transitDaysTo?: Record<string, number>; }
interface CertificationRef  { name: string; scope: string; verifiable: boolean; }
interface ProductImage      { src: string; alt: string; caption?: string; type: 'product'|'packing'|'loading'|'grading'; }
```

Three notes on the design of this schema, because each encodes a decision:

- **`cartonsPer40ftReefer` and `netWeightPer40ftMT` are stored, not derived at render time.** Loadability depends on pallet configuration and carton crush strength, not arithmetic. A computed figure that is wrong by two pallets is worse than no figure, because it will be quoted back in a contract.
- **`availability` is a 12-month array, not a prose string.** The current `season: 'April – July (peak season)'` cannot be filtered, cannot render as a calendar, and cannot power `/resources/seasonality-calendar/`. Structured now, it costs nothing; retrofitted at 60 SKUs it is a data-entry project.
- **`certifications` carries `verifiable: boolean`.** Claiming a certification you cannot produce a certificate number for is a legal exposure in several destination markets and an instant credibility loss when a buyer's compliance team asks. See Open Question 2.

---

# 2. UX/UI Design Principles

## 2.0 Verdict on the existing design system

The design system is a genuine asset and should be **kept and sharpened, not replaced**. Specifically, the token architecture (`:root` + `html[data-theme]` custom properties), `color-mix()` for derived surfaces, `clamp()` type, the DM Sans / Playfair Display / DM Mono trio, and the `IntersectionObserver` reveal system with its correct `prefers-reduced-motion` short-circuit represent design work that would cost weeks to reproduce and would not come out better. The editorial restraint — generous whitespace, a single accent family, no card-shadow clutter — already reads as more credible than the gradient-and-stock-photo template most exporters ship.

A from-scratch redesign is not justified, because the failures on this site are **failures of content and structure, not of visual language**. Restyling would not fix a discarded RFQ or a stock team photo.

What changes: the *sequencing* of what the design system is asked to display. Right now it renders mission statements beautifully. It needs to render evidence.

## Pillar 1 — Evidence Density

**Rationale.** The buyer has 90 seconds and one question: *is this a real operation that can actually ship?* Every adjective spends that budget without answering it; every number, document name and registration figure repays it. Trade buyers are professionally sceptical because they have been burned by intermediaries presenting as principals — so unverifiable superlatives actively raise suspicion rather than lowering it.

**Application here.** The homepage currently opens its proof section with `3+ Years of experience / 50+ Global partners / 10+ Countries served / 2410 Products delivered` (main.jsx:191). "2410 Products delivered" is unverifiable and reads as filler; "3+ years" invites the exact doubt it is trying to allay. Replace with facts a buyer can check: **LLP registration number and incorporation date · IEC number · registered office · port of loading · container volume shipped in the last 12 months · number of destination markets served**. The same typographic treatment, different payload. Where a figure cannot be substantiated, remove the tile rather than soften it — four honest tiles outperform six padded ones.

## Pillar 2 — The 90-Second Trust Stack

**Rationale.** Attention decays monotonically; the order of the first three viewports determines the RFQ rate more than anything below them. An importer's implicit checklist runs: *legitimate entity 🠖 relevant commodity 🠖 can they ship to me 🠖 what do I do next.* The current homepage answers commodity first and legitimacy never.

**Application here.** Restructure the first three viewports:

1. **Viewport 1** — Hero. Keep the photographic treatment and the `clamp(56px,6.6vw,93px)` headline; it is genuinely strong. Change the subhead from company self-description to buyer-addressed capability: commodities, origin, destination regions, port of loading. Add a thin credentials strip immediately beneath the CTAs — registration, certifications, port — in DM Mono at a **legible** size (see §2.6; the current `.hero-meta` drops to 6.5px at 480px, which is not readable and cannot be defended).
2. **Viewport 2** — Commodity grid with live seasonality state. Not "what we export" as a concept, but *what is in season this month*, because that is the only version of the question a buyer is actually asking in that moment.
3. **Viewport 3** — Compliance and logistics proof: certifications held, documents issued per shipment, ports, transit lanes.

The globe currently occupies prime homepage real estate to communicate four office locations. That is a weak payload for the most expensive component on the page. Either it earns its position by rendering **trade lanes with transit times to confirmed destination markets**, or it moves below the fold. See §3.7 for the performance argument, which points the same direction.

## Pillar 3 — The Spec Sheet Is the Product Page

**Rationale.** A sourcing manager does not read a product page; they scan it against an internal checklist and then forward it to a colleague. The layout must therefore behave like a **document**, not like a marketing page: stable field order across all SKUs, scannable label-value pairs, and no information that appears on one product but is silently absent on another. Consistency of *structure* across SKUs is itself a competence signal — it says these people work from specifications.

**Application here.** The current detail page renders four `meta-card`s (seasonality, origin, packaging, certifications) in a decorative grid. Rebuild as four fixed blocks in the order the buyer's checklist runs: **Specification 🠖 Packing & Loadability 🠖 Cold Chain & Transit 🠖 Compliance & Documentation**, each a dense definition list rather than cards. Add a loadability table with 20ft and 40ft columns, and a 12-month availability strip. Add "Download spec sheet (PDF)" and ensure `@media print` produces a clean single-page document, because these get printed and attached to internal approval requests. Keep the editorial `<h1>` and the Playfair italic accent — the personality lives in the header, the discipline lives in the body.

## Pillar 4 — Restraint as a Competence Signal

**Rationale.** Density of decoration correlates inversely with perceived operational seriousness in B2B trade. Buyers read a busy site as a company selling itself rather than selling goods. Restraint is not minimalism as taste; it is bandwidth allocation — every element that is not evidence is competing with evidence for the same 90 seconds.

**Application here — specific cuts, each defended:**

- **Cut the fake ChatWidget** (main.jsx:723–781). Full argument in §4.5.
- **Cut the gallery** at Phase 1. Six stock produce photographs are decoration presented as substance.
- **Cut the team page** at Phase 1, or ship it with real people. See §2.5.
- **Cut or merge** the `home-manifesto` block ("Keep the product at the centre", main.jsx:263–279) and the `About` values grid ("Product first / Clear communication / Long-term thinking", main.jsx:305–317). These are three abstractions saying one thing, occupying two full viewports. One of them, phrased as an operating commitment with a number attached, is worth more than all three.
- **Keep** the `feTurbulence` grain at 3.5% (styles.css:46). It costs one inline SVG data-URI, no network request, and it is a large part of why the site reads as designed rather than assembled. This is exactly the kind of detail restraint protects.
- **Keep** the `title-mark` ghost numerals and the mono eyebrows. They are a consistent, cheap signature.

## Pillar 5 — Motion and Theme With a Job

**Rationale.** Motion on a trade site should orient, never entertain: it earns its place by signalling structure (this is a new section) or state (this is loading, this responded). Two themes must be treated as two designs held to identical standards, not as an inverted palette — because roughly half of B2B users on mobile will see the dark one and it is the one nobody art-directs.

**Application here.** The `Reveal` system is well built and already respects reduced-motion; **keep it**, but reduce the stagger from `index * 90ms` to ≤60ms and cap any group at three steps, because on a spec-sheet page a long stagger delays the exact content the buyer came for. The dark theme is already properly art-directed to the point of swapping the hero photograph and re-tuning the globe's RGB triples (main.jsx:131–133) — that is above-average work and should be preserved, and the same care extended to any new component.

**Two motion defects to fix.** The reduced-motion block at styles.css:141 disables only the hero *entrance* animations. The 30-second infinite `heroZoom` on `.hero-media:before` and the looping `scrollDot` continue to run for users who have asked the system to stop motion. Both must be inside the query. Second, the globe's `requestAnimationFrame` loop (Globe.jsx:84–110) has no visibility or intersection gate — it animates while scrolled past and while the tab is backgrounded.

## 2.5 The imagery decision — a design and trust problem, not a technical one

Every image on the site is hot-linked from Unsplash. There are two separate problems here and they need separate answers.

**Product, hero and ambient photography.** The technical fix (self-host, AVIF/WebP, responsive `srcset`) is covered in §3.8. But the design decision is prior to it: stock produce photography is *generic by construction*, and the buyer has seen the same mango on four competitor sites this week. **Commission real photography** — the actual graded fruit, the actual carton with the actual label, the actual pallet configuration, the actual container being stuffed. This is a one-day shoot at the packhouse and it is the single highest-return spend in this entire strategy, because it is simultaneously the trust asset, the differentiation asset, and the loadability documentation. Until it exists, licensed stock is an acceptable placeholder for ambient imagery only — **never for product, packing, or facility shots**, where a generic image actively contradicts the specificity the spec sheet is claiming.

**Team photographs.** Different category, harder line. The `/team/` page presents Unsplash photographs of unidentified people under the heading "The people behind Solstice" (main.jsx:535–561). A buyer performing due diligence on an unfamiliar counterparty — which is precisely what this page invites — may reverse-image search it. Discovery would not read as a placeholder; it would read as fabrication, and it would contaminate every other claim on the site including the true ones. There are three honest options, in order of preference: **(a)** real photographs of real staff, **(b)** no team page, leadership named in text on `/about/`, **(c)** deliberate non-photographic treatment — named roles with monogram or illustrated avatars that are self-evidently not photographs. Option (b) ships this week at zero cost and loses nothing a buyer needs. What is not available is the current state.

## 2.6 WCAG 2.2 AA in the design system

Accessibility is a structural requirement of the design, and in this market it is also commercial: EU and UK buyers increasingly carry procurement accessibility obligations, and the European Accessibility Act raises that from preference to precondition for some counterparties. These are measured against the current code.

| Finding | Measured | Criterion | Fix |
|---|---|---|---|
| Product, related-product and team cards are `<article onClick>` with no `tabIndex`, `role` or key handler (main.jsx:231, 451, 515) | Mouse-only | 2.1.1 Keyboard | Make the card a `<a href="/products/[slug]/">` wrapping the content. This fixes keyboard access, screen-reader semantics, middle-click-to-new-tab, and crawlability in one change — a real link is strictly better than a `div` with a handler. |
| Form input borders use `--line` on `--surface` | **1.22:1** | 1.4.11 Non-text Contrast (needs 3:1) | Introduce `--line-strong` (≥3:1 both themes) for interactive boundaries; keep `--line` for decorative rules. |
| `--muted` body text on `--bg`, light theme | **4.64:1** | 1.4.3 (needs 4.5:1) | Passes, but with 0.14 of headroom — any future palette tweak breaks it. Darken to ≥5.5:1 to build in tolerance. Dark theme is comfortable at 8.82:1. |
| `.hero-meta` at 6.5px (styles.css:618); `.hero-footer` at 7px; form labels at 10px, inputs at 12px | — | 1.4.4 / practical legibility | Floor body-adjacent text at 14px and form inputs at **16px** — below 16px, iOS Safari zooms the viewport on focus, which on the RFQ form is a direct conversion cost as well as an accessibility one. |
| Infinite `heroZoom` and `scrollDot` outside the reduced-motion query (styles.css:141) | — | 2.3.3 Animation from Interactions | Move both inside the query. |
| FAQ accordion sets `aria-expanded` but no `aria-controls`; collapsed content stays in the a11y tree behind `grid-template-rows:0fr` | — | 4.1.2 Name, Role, Value | Add `aria-controls` + `id` pairing and `hidden`/`inert` on the collapsed panel. |
| `:focus-visible{outline:2px solid var(--green);outline-offset:3px}` (styles.css:40) | 5.02:1 on light bg | 2.4.11 Focus Not Obscured / 2.4.13 Focus Appearance | **Already correct and better than most production sites — keep it.** Verify it survives on the dark hero, where green-on-photograph may drop below 3:1; add a white outer stroke there. |
| Sticky header at 68–82px | — | 2.4.11 Focus Not Obscured (AA, new in 2.2) | Add `scroll-margin-top` to all focusable anchors so keyboard focus is never hidden under the sticky header. |

---

# 3. SEO Roadmap

Sequenced. Steps 1–3 are strictly ordered; later steps can parallelise. Effort: S ≤2 days, M ≤2 weeks, L >2 weeks.

**A stated uncertainty up front:** I have no keyword-tool access in this environment. The queries in §3.10 are constructed from trade-buyer search behaviour and the actual catalogue, and they are structurally sound as an intent map — but **volumes and difficulty must be validated** in Ahrefs/Semrush before the content calendar is committed. Treat the grouping as reliable and the prioritisation within groups as provisional.

### 1. Routing migration to real paths — **Effort L · Impact High**
The precondition. Under hash routing all 7 routes are one URL to a crawler, one entry in Search Console, one Open Graph preview, and one analytics landing page. No amount of schema, copy or link building compensates, because there is no addressable document to attach it to. Everything below assumes this is done. Ship with a `_redirects`/`_headers` map from legacy `#products`-style URLs — cheap insurance for any link already shared over WhatsApp or email.

### 2. Rendering strategy: static pre-rendering (SSG) — **Effort M · Impact High**
Pre-render every route at build. Content changes daily at most; there is no personalisation, no auth, no inventory feed. SSG therefore gives full-fidelity HTML in the first response with none of SSR's server cost — and critically **it preserves the existing deployment model**: the output is still a folder of files on a static host, just with more of them.

The trade-off against client-only rendering is honest and one-sided here: client-only is marginally simpler to build and strictly worse on LCP, on crawl efficiency, and on the resilience of the RFQ page for a buyer on a poor mobile connection in a port city. Reserve ISR/on-demand revalidation for Phase 2 if `/insights/` reaches a cadence that makes rebuild latency annoying — it will not at launch.

### 3. `<head>` completion — **Effort S · Impact High**
Per-route `<title>` and `<meta name="description">`, self-referencing `<link rel="canonical">`, Open Graph (`og:title`, `og:description`, `og:image` at 1200×630, `og:type`, `og:url`, `og:site_name`) and `twitter:card=summary_large_image`. Highest impact per hour in this document: product spec sheets are forwarded over WhatsApp and email constantly, and today every one of them previews identically as "Solstice | Global Import & Export" with no image.

`hreflang` is **not** needed at Phase 1 — there is one language and one region. Add it only if (a) a translated tree ships, or (b) `/markets/[country]/` pages diverge enough to be genuinely region-targeted, at which point `hreflang="en-AE"` etc. plus `x-default` becomes correct. Adding it prematurely to a single-locale site creates validation errors for no gain.

Also: favicon set, `apple-touch-icon`, `site.webmanifest`, `robots.txt`, and an auto-generated `sitemap.xml`.

### 4. Schema markup — **Effort M · Impact High**
JSON-LD, one block per page type.

| Type | Where | Key properties |
|---|---|---|
| `Organization` | Sitewide | `legalName`, `foundingDate` (2025-03), `address` (Odhav Industrial Estate, Ahmedabad, Gujarat, IN), `taxID` (GSTIN), `identifier` (LLPIN, IEC), `numberOfEmployees`, `areaServed` (per confirmed [PRIMARY_MARKET_REGION]), `knowsAbout`, `sameAs`, `contactPoint` with `contactType: "sales"` and `availableLanguage` |
| `WebSite` | Homepage | `name`, `url`, `publisher` 🠖 `Organization` |
| `Product` | Each spec sheet | `name`, `description`, `image[]`, `brand`, `category`, `additionalProperty[]` as `PropertyValue` for **HS code, calibre, grade, storage temperature, shelf life, cartons per 40ft** — this is the correct vehicle for spec data and it is what makes these pages semantically distinguishable from every other exporter's product page |
| `Offer` | Nested in `Product` | `availability`, `priceCurrency`, `businessFunction: "Sell"`, `eligibleRegion`, `deliveryLeadTime`, `advanceBookingRequirement`, `eligibleQuantity` as `QuantitativeValue` (MOQ). Use `PriceSpecification` only if you publish prices — see Open Question 5 |
| `ItemList` | `/products/` and category hubs | Ordered `Product` references |
| `BreadcrumbList` | All pages below root | Mirrors the real path hierarchy |
| `FAQPage` | `/contact/`, and per-product FAQ | The existing `contactFaq` (main.jsx:605–612) is already well-formed Q&A and can be marked up almost as-is |
| `Service` | `/services/` (and Phase 2 splits) | `serviceType`, `provider`, `areaServed`, `hasOfferCatalogue` |
| `Article` | `/insights/[slug]/` | Phase 2 |

`LocalBusiness` is available and I would **not** use it: the buyer is never walking into Odhav Industrial Estate, and local-pack ranking is not the objective. `Organization` with a full `PostalAddress` carries the verification value without miscasting the entity. This is a judgement call, not a rule.

### 5. Entity and topic-cluster content strategy — **Effort L · Impact High**
Build around the intersection that actually converts: **commodity × destination market**. `/products/mangoes/` is the commodity pillar; `/markets/uae/` is the market pillar; the cluster content sits between them ("exporting Kesar mangoes to the UAE: season, pack, transit, documentation"). This structure works because it maps to how the buyer's need is actually shaped — nobody searches "fruit exporter", they search for a commodity going to a place.

Entity grounding matters as much as keywords: the site should consistently and machine-readably associate [COMPANY_NAME] with the entities it trades in — *Mangifera indica*, Kesar, Bhagwa, APEDA, phytosanitary certification, Mundra Port, reefer container, Incoterms. Consistent NAP (name, address, phone) across the site, Google Business Profile, and any trade directory listing is the cheapest entity-consolidation work available.

Enforce a **content floor**: no page ships below ~600 words of non-duplicative substance. This is the single discipline that stops a 60-SKU catalogue becoming 60 thin pages, and it is why §1.2 keeps `/services/` as one page at launch.

### 6. Mobile-first indexing — **Effort S · Impact High**
Google indexes the mobile rendering. Content hidden or omitted on mobile is content that does not count. Audit that the loadability table and spec blocks render fully at 390px — the current responsive layer *hides* interactive affordances at ≤780px (`.service-list article>button{display:none}`, styles.css:564), which is the pattern to avoid on spec content.

### 7. Core Web Vitals, with specific attention to the globe — **Effort M · Impact High**

**LCP.** The hero image is a CSS `background-image` on `.hero-media:before` (styles.css:114). Background images are invisible to the preload scanner, cannot take `fetchpriority="high"`, and here the URL is additionally indirected through a custom property and fetched cross-origin from Unsplash at `w=2000` — roughly the worst available construction for the LCP element. Fix: self-hosted `<img>` with `srcset`/`sizes`, `fetchpriority="high"`, explicit dimensions, AVIF with WebP fallback, positioned behind the copy. Expect a substantial LCP improvement on mobile; I would not quote a number without a field measurement.

**Fonts.** `@import` of Google Fonts at styles.css:1 is the slowest path available — the browser cannot discover the font request until the CSS bundle has downloaded and parsed. Self-host the three families as `woff2` subsets with `font-display:swap` and preload the two used above the fold. This also removes a third-party origin, which matters for the GDPR posture with EU buyers.

**INP and the globe — the sharpest trade-off on this site.** `Globe.jsx` requests `mapSamples: 16000` and a canvas sized to `offsetWidth` at DPR up to 2 — a 420px CSS box becomes an 840×840 render surface — driven by an unconditional `requestAnimationFrame` loop with no intersection or `visibilitychange` gate. On a mid-range Android device (think a 2-3 year old Snapdragon 6-series with a shared thermal budget), a continuous WebGL loop competes with the main thread for every interaction that follows, degrades INP for the whole session rather than just its own section, and drains battery while the user reads the footer. It is also, per Pillar 2, currently communicating four office pins.

Recommendation, in order:
1. **Do not render the globe below 780px at all.** Serve a static, well-designed SVG trade-lane map. Mobile is where the CWV cost lands and where the globe's interaction affordance (drag to rotate) is least usable anyway.
2. On desktop, **lazy-init on `IntersectionObserver`** — the module is not even imported until the section approaches the viewport — and `cancelAnimationFrame` when it leaves or when `document.hidden`.
3. Honour `prefers-reduced-motion` with the static map.
4. Cap DPR at 1.5 and drop `mapSamples` to ~10,000; the visual difference at 420px is marginal, the raster cost is not.

With those four changes the globe is a legitimate differentiator. Without them it is a measurable tax on every other interaction on the page.

**CLS.** Reserve explicit dimensions for all images and for the globe canvas; the current `ResizeObserver` path (Globe.jsx:145–151) implies the canvas can mount at zero width and expand — a shift by construction.

### 8. Image pipeline — **Effort M · Impact Med**
Self-host everything. Build-time AVIF + WebP, responsive `srcset`, `loading="lazy"` below the fold (never on the LCP image), explicit `width`/`height`. Real, descriptive `alt` text — currently `alt="Fresh produce gallery 3"` (main.jsx:598), which serves neither screen-reader users nor image search. `alt="Kesar mangoes graded and packed in 4kg telescopic export cartons"` serves both.

### 9. Internal linking model — **Effort S · Impact Med**
Rules, not instincts:
- Every spec sheet links **up** to its category hub and to `/quality-compliance/`, **across** to 2–3 editorially chosen related SKUs (`relatedSlugs`, not the current type-match fallback at main.jsx:470), and **down** to `/request-quote/` prefilled with its own slug.
- Every `/markets/[country]/` page links to every SKU with confirmed availability for that market, with descriptive anchors ("Bhagwa pomegranates to Jebel Ali", not "read more").
- Breadcrumbs on every page below root, matching `BreadcrumbList`.
- The footer stops being a full sitemap; navigational value flows to hubs, and 30 flat footer links to 30 SKUs dilutes that.

### 10. Keyword map — **Effort M · Impact High**

Grouped by intent stage, mapped to §1.2. Volumes unvalidated (see the caveat above).

**Stage 3 — Transactional / RFQ-ready** (highest commercial value, lowest volume — win these first)

| Query | Target page | Phase |
|---|---|---|
| `indian mango exporter` | `/products/mangoes/` | 1 |
| `bhagwa pomegranate exporter india` | `/products/pomegranates/` | 1 |
| `onion exporter india fob mundra` | `/products/onions/` | 1 |
| `fresh produce exporter ahmedabad gujarat` | `/` | 1 |
| `kesar mango supplier for export` | `/products/mangoes/` | 1 |
| `indian table grape exporter nashik` | `/products/grapes/` | 1 |
| `request quote indian fruit exporter` | `/request-quote/` | 1 |

**Stage 2 — Commercial investigation** (comparison and vetting)

| Query | Target page | Phase |
|---|---|---|
| `apeda registered fruit exporter india` | `/quality-compliance/` | 1 |
| `globalgap certified pomegranate supplier india` | `/quality-compliance/` | 1 |
| `indian fruit and vegetable exporters list` | `/products/` | 1 |
| `import indian mangoes to uae` | `/markets/uae/` | 2 |
| `vietnam import indian fresh produce supplier` | `/markets/vietnam/` | 2 |
| `private label fruit packing india` | `/services/private-label/` | 2 |

**Stage 1 — Informational / specification** (top of funnel, but *technical* top of funnel — these attract buyers, not students)

| Query | Target page | Phase |
|---|---|---|
| `how many cartons of mangoes in a 40ft reefer` | `/resources/container-loadability/` | 2 |
| `hs code for fresh mangoes india` | `/resources/hs-codes/` + `/products/mangoes/` | 2 |
| `pomegranate export packing specification` | `/products/pomegranates/` | 1 |
| `indian mango export season calendar` | `/resources/seasonality-calendar/` | 2 |
| `storage temperature for pomegranate shipping` | `/products/pomegranates/` | 1 |
| `fob vs cfr for perishable exports` | `/resources/incoterms-for-perishables/` | 2 |
| `phytosanitary certificate requirements fresh fruit export` | `/quality-compliance/` | 1 |

Note the deliberate skew: at Phase 1, effort concentrates on Stage 3 and Stage 2, because a company with 6 SKUs and no domain authority will not win informational head terms and does not need to. The Stage 1 resource pages are Phase 2 link-acquisition assets, not launch traffic.

---

# 4. Conversion Strategy

## 4.1 The primary conversion event

**The RFQ — a submitted quote request carrying enough specification that the sales team can respond with a real price rather than a clarifying question.**

This definition matters. A contact-form message reading "please send price list" is not a conversion; it is unpaid work. The form's job is to move the specification burden to the moment the buyer is most motivated — while they are looking at the spec sheet — and every field below is justified against that, balanced against drop-off.

## 4.2 RFQ field set

Two steps. Step 1 is the requirement and is the only thing that must be completed; Step 2 is identity. Splitting them is deliberate: buyers commit to describing a need more readily than to identifying themselves, and once Step 1 is filled the sunk-cost effect carries them through Step 2. This also means a Step 1 abandonment is still a recoverable analytics signal.

### Step 1 — Requirement

| Field | Type | Req. | Justification vs drop-off |
|---|---|---|---|
| Product | Prefilled select | ✓ | **Prefilled from the originating spec sheet.** Zero cost when entered from `/products/mangoes/`, and it eliminates the single most common ambiguity in inbound enquiries. |
| Variety / grade | Select, options scoped to product | — | Optional because many buyers are genuinely flexible; forcing a choice invites a wrong one that has to be unwound later. |
| Quantity + unit | Number + unit select (MT / 20ft / 40ft / cartons) | ✓ | **The single highest-value field.** Without it no price is possible. The unit selector is non-negotiable — "500" means three different orders of magnitude across these units, and an ambiguous quantity costs an email round-trip and 24 hours. |
| Requirement frequency | Radio: one-time / monthly / seasonal programme / annual contract | ✓ | Cheap to answer (one click), and it is the **strongest qualification signal on the form** — a seasonal-programme enquiry deserves a different responder and a different response time than a one-time trial. Justifies its place because it costs the buyer nothing. |
| Destination port or country | Combobox with UN/LOCODE autocomplete, free-text fallback | ✓ | Determines freight, transit, phytosanitary requirements and market access. A quote without it is fiction. Free-text fallback because inland buyers may not know their port of discharge. |
| Incoterm | Select: FOB / CFR / CIF / DAP / "not sure" | ✓ | **"Not sure" is mandatory as an option.** Smaller buyers genuinely do not know, and forcing a wrong Incoterm produces a quote that has to be reissued. Offering the out costs nothing and captures a segment a stricter form would lose. |
| Target month / shipment window | Month picker | — | Optional; useful for capacity planning, not blocking. |
| Packing preference | Select from that product's `PackFormat[]` | — | Optional. Prefilled with the default format so the buyer sees the options exist. |

### Step 2 — Identity

| Field | Type | Req. | Justification vs drop-off |
|---|---|---|---|
| Company name | Text | ✓ | Basic qualification; B2B buyers expect to give it and it filters casual traffic. |
| Country | Select | ✓ | Routing and market-access check. One click. |
| Business email | Email | ✓ | The response channel. Validate format; **do not** block free-mail domains — legitimate traders in several target markets use them, and a domain check here would silently reject real buyers. |
| Full name | Text | ✓ | Cheap, and it makes the autoresponse and follow-up human. |
| Phone / WhatsApp | Tel with country code | — | **Optional, and this is a deliberate concession.** Requiring a phone number is the largest single drop-off driver on B2B forms. Label it "WhatsApp preferred — we respond faster" and a majority will supply it voluntarily, which is a better outcome than a required field that loses the buyer entirely. |
| Company website | URL | — | Optional; strong qualification signal when given. |
| Role | Select: importer / wholesaler / retailer / foodservice / trader / other | — | Optional; segments the follow-up. |
| Message | Textarea | — | Always leave room for the requirement the form did not anticipate. |
| Consent | Checkbox, unticked | ✓ | GDPR lawful basis for EU/UK buyers. Unticked by default is a legal requirement, not a style choice. |

**Removed from the current form:** nothing needs removing so much as renaming — the existing "What are you looking for?" select (main.jsx:659–665) offers four vague categories where the schema now supports precise product selection.

**Explicitly not on this form:** budget, target price, and annual volume. Each is a large drop-off driver at first contact, and each is answered better in the reply to the quote than before it.

**Accessibility of the form is a conversion issue, not only a compliance one.** Every field needs a real `<label for>` (the current markup wraps inputs in labels, which is valid — keep it), inline validation announced via `aria-live`, an error summary at the top of the form that receives focus on failed submit, `autocomplete` attributes on name/email/tel/organization/country, and a 16px minimum input font size to prevent iOS zoom on focus (§2.6). A form that traps a keyboard user loses that RFQ as completely as a broken endpoint.

## 4.3 CTA placement by page type

One primary CTA per viewport, maximum. Competing CTAs measurably reduce total conversions.

| Page type | Primary | Secondary |
|---|---|---|
| Home | "Request a quote" in hero | "Browse products" · "Download catalogue" (Phase 2) |
| `/products/` | Per-card "View specifications" | Persistent "Request a quote" in a sticky footer bar on mobile |
| `/products/[slug]/` | **"Request a quote for [product]"** — repeated three times: after the summary, after the loadability table, at page end. The mid-page instance matters most, because loadability is the moment the buyer concludes it fits. | "Download spec sheet (PDF)" · "Request a sample" · WhatsApp |
| `/quality-compliance/` | "Request certification documents" — a lower-commitment ask matched to that page's visitor intent | "Request a quote" |
| `/services/` | "Discuss your requirement" | "Browse products" |
| `/about/`, `/contact/` | "Request a quote" | WhatsApp |
| `/markets/[country]/` (P2) | "Request a quote to [country]" — prefilled destination | Country-specific catalogue |

Mobile gets a persistent bottom bar with two actions — "Request quote" and "WhatsApp" — from the second viewport onward. It must not obscure focus (§2.6) and must be dismissible.

## 4.4 Secondary conversion ladder

Not every visitor is RFQ-ready. Each rung captures a different readiness level and each is an identifiable analytics event:

1. **WhatsApp Business click-to-chat** — lowest friction, highest cultural fit. In India, the UAE and Vietnam, WhatsApp is the default commercial channel, not a fallback. A `wa.me` deep link with a prefilled message ("I'm enquiring about Kesar mangoes — 40ft to Jebel Ali") costs nothing to implement and converts buyers who will never fill a form. Requires a genuinely monitored number and stated response hours in IST plus one buyer time zone.
2. **Product catalogue PDF** — email-gated. Captures the buyer who is building a supplier shortlist and is not ready to specify. The PDF must be genuinely useful (full spec sheets, loadability, seasonality) or the gate is resented.
3. **Sample request** — a distinct, short form. High intent, real cost per unit; route to a human immediately and qualify by hand.
4. **Seasonality-calendar subscribe** (Phase 2) — "tell me when Bhagwa season opens." Low commitment, and it produces a permission-based list segmented by commodity, which is the most valuable owned asset on this list.

## 4.5 Position on the ChatWidget: **remove it**

Remove at Phase 1 and replace with WhatsApp click-to-chat.

The widget (main.jsx:723–781) presents as "**Solstice team** · Usually replies within a day" with a typing indicator and an online dot, then answers from four hardcoded strings. It simulates a human where there is none. For a buyer whose entire task in these 90 seconds is determining whether this is a real operation, discovering that the "team" is four canned strings is a targeted hit on exactly the credibility the rest of the site is trying to build. The four questions also duplicate `contactFaq` verbatim in substance, so nothing is lost by removing it.

Keeping it is defensible only if it stops pretending — a clearly-labelled "Quick answers" launcher with no typing indicator, no online dot and no "Solstice team" identity. But that is a worse version of an FAQ accordion that already exists on `/contact/`, so the honest recommendation is removal.

Replacement, in order of value: WhatsApp Business click-to-chat at Phase 1 (real humans, no build cost, matches buyer behaviour in [PRIMARY_MARKET_REGION]); a real live-chat product only if someone will genuinely staff it during overlapping business hours. An unstaffed real chat widget is worse than no widget, because it promises a response time it cannot meet.

## 4.6 What happens after submission

Given there is no backend today, this is the architecture to build toward. Phase 1 is achievable in under a day.

**Phase 1 — serverless, no infrastructure.**
1. Form posts to a hosted endpoint (Web3Forms / Formspree / a Cloudflare Worker — see §5.3).
2. **Instant autoresponse** to the buyer, within seconds, in English, confirming what was received (echo the product, quantity, destination and Incoterm back to them — this both reassures and surfaces input errors immediately) and stating a response window in *their* terms: "within one business day, IST 09:00–18:00 (GMT+5:30)." Speed of first response is the strongest predictor of B2B win rate, and an instant, specific autoresponse buys the hours before a human replies.
3. **Internal notification** to a shared sales inbox, not an individual's — never let a lead sit in one person's unread mail. Include full submission plus referrer, landing page and UTM, so sales knows which commodity page produced the enquiry.
4. **Lead storage in Airtable or Google Sheets** via the same webhook. This is the pragmatic answer for a 10-person company with no CRM: structured, filterable, shareable, no licence cost, no admin. It is explicitly a stopgap and should be treated as one.
5. **Redirect to `/thank-you/`** — a real URL, `noindex`, carrying next steps and the WhatsApp link. A discrete URL is what makes the conversion measurable in GA4 and in any future ad platform.
6. **Spam control:** honeypot field plus Cloudflare Turnstile. Not reCAPTCHA v2 checkbox — it is an accessibility and friction cost on the highest-value form on the site.

**Phase 2 — when volume justifies it.** Webhook into a real CRM (Zoho CRM is the realistic fit for an Indian SME on cost and local support; HubSpot free tier if the buyer-side reporting matters more), with lead scoring driven by the qualification fields already collected — frequency, quantity, destination — and a defined SLA per tier. Migrating from the Airtable stopgap is a one-time export; nothing in Phase 1 is wasted.

---

# 5. Tech Stack Recommendations

## 5.1 Framework and rendering — **recommend Astro 5, React islands, static output**

**Why.** This is a content site with four interactive fragments (mobile menu, product filter, gallery/lightbox, FAQ accordion) and one genuinely heavy component (the globe). Astro ships zero JavaScript by default and hydrates only what is marked as an island, which maps exactly onto that shape — the spec sheets, which are the pages that must rank and must load fast on a mid-range Android, become pure HTML and CSS. `Globe.jsx` survives as a `client:visible` React island **with no rewrite**, which also delivers the lazy-init from §3.7 as a one-word change. Content collections give the §1.3 schema Zod-validated typing, so a missing `hsCode` on SKU 47 is a build failure rather than a blank cell in production. Output is a static folder — the current deployment model is unchanged.

**Named alternatives, honestly:**

- **Next.js 15 (App Router, SSG).** Fully capable and the safer answer if [COMPANY_NAME] expects to add authenticated buyer portals, ISR-driven pricing, or i18n at scale. Costs: a larger baseline JS payload on pages that need none, and a gravitational pull toward Vercel hosting. Choose it if the roadmap includes application features, not just content. It is not wrong here — it is heavier than the problem.
- **Vite + React Router + a prerender plugin.** Cheapest migration, keeps the repo shape. But prerendering bolted onto an SPA is fragile — hydration mismatches, per-route `<head>` handling, and partial pre-render coverage are recurring maintenance costs. It solves the routing problem and leaves the payload problem. Acceptable only under severe time pressure.
- **A WordPress/webflow-class rebuild.** Fastest to a non-technical content workflow, and it would discard `styles.css`, `Globe.jsx` and the site's entire visual differentiation. Not recommended — the design is the asset.

## 5.2 Content management — **stay in typed content files at Phase 1; Sanity at Phase 2**

This will read as an under-recommendation, so here is the reasoning. With **6 SKUs**, a CMS is net-negative: it adds a service dependency, a schema-sync burden and a monthly cost to manage six records that change a few times a year, and the people who will write the first spec sheets will be doing it in a shared spreadsheet regardless. Astro content collections with Zod schemas give type safety, validation and Git history at zero cost, and product data is edited by whoever is building the site during the launch window anyway.

**The trigger to migrate is ~20 SKUs or the first non-technical person who needs to edit weekly, whichever comes first.** At that point:

- **Sanity** (recommended) — the only option that handles a 30-field product schema with nested `PackFormat[]` arrays without becoming painful. Real-time editing, generous free tier, structured content that maps 1:1 onto §1.3, webhook-triggered rebuilds.
- **Keystatic or Decap** — Git-based, free, no external service, content lives in the repo. Excellent for `/insights/` and page copy; genuinely awkward for deeply nested product specs. A reasonable hybrid: Keystatic for editorial, content files for products.
- **Airtable as CMS** — tempting because leads are already going there (§4.6), and viable if the client is already comfortable in it. Weaker typing, and a rate-limited API at build time.

## 5.3 Forms and lead handling

**Phase 1:** **Cloudflare Workers** endpoint if hosting on Cloudflare Pages (no third-party dependency, full control over routing, autoresponse and Turnstile, effectively free at this volume), or **Web3Forms / Formspree** if the priority is shipping this week with zero backend code. Both are correct answers; the Worker costs a day more and removes a vendor.

Email delivery via **Resend** or **Postmark** — transactional-focused, good deliverability, templated autoresponses. Deliverability is not a detail here: an autoresponse in a buyer's spam folder is functionally a lost lead, so SPF, DKIM and DMARC must be configured on the sending domain before launch.

**Phase 2:** the same Worker fans out to CRM + Sheet + notification, with lead scoring from the qualification fields.

## 5.4 Images, hosting, analytics

**Images.** Self-host, processed at build (Astro's `<Image>` over Sharp): AVIF with WebP fallback, responsive `srcset`, explicit dimensions, `fetchpriority="high"` on the hero. **Cloudinary or Cloudflare Images** becomes worth its cost only once real photography arrives and the library exceeds a few hundred assets — under that, build-time processing is simpler and free. Retire every `images.unsplash.com` URL before launch (§2.5).

**Hosting.** **Cloudflare Pages** — global edge including nodes close to [PRIMARY_MARKET_REGION], free tier that comfortably covers this traffic, Workers colocated for the form endpoint, free unmetered bandwidth. Alternative: **Netlify**, marginally better DX and Forms built in, less generous bandwidth. Both serve real paths per URL, which §1.1 requires.

**Analytics.** **GA4** for conversion tracking and ad-platform compatibility, with consent mode configured for EU/UK buyers — mandatory given GDPR-region traffic. **Plausible or Fathom** alongside or instead if the client prefers a cookieless posture and can forgo ad-platform attribution; this is a business call, not a technical one. Plus **Google Search Console** (non-negotiable, day one), **Microsoft Clarity** (free session replay — genuinely valuable for finding where the RFQ form loses people), and **Bing Webmaster Tools** (small but real share among corporate desktop buyers).

Track as conversions: `rfq_submitted` (primary, with product/quantity/destination/frequency as parameters), `rfq_step1_completed` (the abandonment diagnostic), `whatsapp_click`, `catalogue_download`, `sample_request`, `spec_sheet_download`.

## 5.5 Migrate or rebuild — **rebuild the shell, migrate the design**

**The answer is neither "patch the current repo" nor "start over."** Split the codebase by what is worth keeping:

**Migrate (high value, ports cleanly):** `styles.css` in full — 656 lines of token architecture, responsive work across three breakpoints, and a properly art-directed dark theme, which is the most expensive artefact in the repo. `Globe.jsx`, as an island. The `Icon` sprite. The `Reveal` system. All page copy. The visual language entirely.

**Rebuild (structurally incompatible with the requirements):** the hash router; the single-file content constants; the non-functional form; `index.html`'s `<head>`; the client-only rendering model; the card interaction pattern.

**Defence on time-to-launch:** patching the current repo to real paths, per-route `<head>`, pre-rendering, and structured content means installing a router, adding a head manager, adding a prerender plugin, restructuring the data layer, and adding the missing `vite.config.js` — at which point you have hand-assembled a worse version of what Astro provides configured, and you own the integration. Rebuilding the shell is **not slower**, and it is materially cheaper to maintain because the framework owns the routing/head/prerender contract rather than the client's future developer.

**Defence on long-term maintenance:** the current architecture concentrates all content, all routing and all presentation in one 820-line file. That is entirely reasonable at 6 SKUs and becomes unworkable at 60 SKUs plus market pages plus a resource library — which is the stated trajectory. The migration cost is paid once now, at 6 SKUs, or paid with interest later at 40.

**Estimated timeline to Phase 1 launch: 5–7 weeks**, assuming content is ready. Roughly: 1 week shell migration and CSS port · 1 week product schema and spec-sheet template · 1 week RFQ, endpoint, autoresponse, lead storage · 1 week `<head>`, schema markup, image pipeline, CWV · 1 week accessibility remediation and QA · 1–2 weeks contingency for content. **The critical path is content and photography, not code** — see the Open Questions.

---

# Open Questions

Ordered by how hard they block work. Items 1–6 block Phase 1 and need answers before the build starts.

1. **Photography — the hardest blocker.** Can we schedule a shoot at the Odhav facility and at a packhouse: graded fruit, labelled cartons, pallet configurations, container stuffing, cold store, QC in progress, and staff at work? Everything in §2.5, §3.8 and the spec-sheet template depends on it, and it is the only item with a physical lead time. If the answer is "not before launch," we need a decision now on licensed stock as a stated interim, and a date for replacement.

2. **Certifications actually held — with certificate numbers.** For each of **APEDA RCMC, IEC, FSSAI, GlobalG.A.P., HACCP, ISO 22000/9001, organic (NPOP/NOP), BRCGS** — held / in progress / not held? A certification claimed on `/quality-compliance/` and in `Organization.hasCredential` must survive a buyer's compliance team asking for the certificate. Overstating here is a legal exposure in several destination markets, not just a credibility risk. The site currently claims IEC and phytosanitary certification (main.jsx:421–422) — please confirm both.

3. **Confirmed destination markets.** [PRIMARY_MARKET_REGION] is currently rendered as UAE, Vietnam and China. Are these **markets shipped to**, or offices/sourcing relationships? The distinction decides whether `/markets/[country]/` pages are credible and whether the globe shows trade lanes or office pins. Also: which additional markets are actively targeted for the next 12 months, since those become the Phase 2 page set.

4. **Who writes the spec content, and by when?** Six spec sheets at ~30 fields each — HS codes, calibre bands, carton dimensions, cartons-per-reefer for every pack format, storage temperatures, shelf life, MOQ, ports. This is specialist knowledge only your operations team has, it cannot be researched externally with any confidence, and it is on the critical path. I need a named owner and a date. **Realistically this is the item most likely to slip the launch.**

5. **Prices: published or quote-only?** §1.3 assumes `pricingModel: 'quote-only'`, which is standard for perishables where price moves weekly. Confirm — it changes the `Offer` schema, the RFQ design, and whether indicative price bands appear anywhere.

6. **Team page.** Real photographs and named roles, no team page at all, or a deliberate non-photographic treatment (§2.5)? This needs a decision, not a default. The current state — stock photographs of strangers presented as staff — cannot ship.

7. **Contact and channel reality.** Is `hello@solsticetrading.com` (main.jsx:647) monitored, and by whom? Is there a WhatsApp Business number that will genuinely be answered, and during which hours? §4.4 and §4.6 both depend on real humans behind these.

8. **Corporate facts for `Organization` schema and `/about/`.** LLPIN, IEC number, GSTIN, exact registered-office address, and incorporation date as it appears on the LLP certificate. These are the verification signals that do most of the work in §2 Pillar 1.

9. **Volume figures we can actually publish.** Containers shipped in the last 12 months, destination markets served, tonnage by commodity — anything true and specific that can replace the current `50+ / 10+ / 2410` tiles (main.jsx:191). If nothing can be published, say so and we design that section without numbers rather than with soft ones.

10. **Adjacent product lines.** Spices, dried fruit and fruit pastes are stated as business lines but absent from the catalogue. Are these live and sellable now (🠖 Phase 1 SKUs) or aspirational (🠖 Phase 2)? This affects whether `/products/category/` ships earlier than planned.

11. **Sales capacity and response SLA.** What response time can be committed to in the autoresponse (§4.6), and how many RFQs per week can the team absorb? A conversion strategy that outruns fulfilment capacity damages the brand it was built to establish.

12. **Budget and timeline envelope.** The 5–7 week estimate in §5.5 assumes content readiness and a single developer. Photography, copywriting and CMS licensing are separate lines. Confirm the envelope so scope can be cut deliberately rather than discovered.

13. **Domain and existing footprint.** Is `solsticetrading.com` registered and controlled? Any existing indexed pages, trade-portal listings (IndiaMART, Alibaba, TradeIndia, ExportersIndia), or Google Business Profile? These affect redirect planning, entity consolidation (§3.5) and NAP consistency.

## Assumptions I had to make — flagged, not papered over

- **Keyword volumes are unvalidated.** No keyword-research tooling was available in this environment. §3.10's *grouping by intent* is sound and derived from the actual catalogue; the *prioritisation within groups* must be re-ordered against real volume and difficulty data before the content calendar is fixed.
- **I assumed quote-only pricing** (Open Question 5) because it is standard for perishables. If prices are published, §1.3's `Offer` block and parts of §4.2 change.
- **I assumed English-only at launch**, which is why `hreflang` is deferred in §3.3. Arabic, Vietnamese or Mandarin versions would change the IA materially and should be raised before build, not after.
- **I assumed the UAE/Vietnam/China footprint is commercial rather than legal-entity presence**, and phrased `/markets/` accordingly. Open Question 3.
- **I assumed no existing indexed domain footprint** and therefore no redirect-mapping requirement beyond legacy hash URLs. Open Question 13.
- **The globe's performance cost is reasoned from the code, not measured on a device.** `mapSamples: 16000`, DPR-2 rasterisation and an ungated rAF loop are a well-understood cost profile, and the four mitigations in §3.7 are safe regardless — but before deciding to drop the globe on mobile entirely, it is worth one WebPageTest run on a real mid-tier Android. I would not want that decision made on my inference alone.
- **The 5–7 week estimate assumes one experienced developer** and content arriving on schedule. It is an estimate, not a commitment, and Open Question 4 is the variable most likely to move it.
