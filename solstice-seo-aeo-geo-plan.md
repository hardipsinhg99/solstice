# Solstice — Multi-Country SEO / AEO / GEO Implementation Plan
Target markets: India (HQ), UAE, UK, Vietnam, Tanzania, USA

---

## PHASE 0 — The blocker. Read this before anything else.

**Current state:** client-rendered Vite SPA on hash routing (`#products`, `#about`). Every route shares one URL, one `<title>`, one meta description as far as any crawler is concerned.

**What this makes impossible, not just harder:**

| Goal | Why hash routing blocks it |
|---|---|
| hreflang / country targeting | Requires a distinct URL per version. You have one URL. |
| XML sitemap | A sitemap of `#`-fragment URLs is meaningless — Google collapses them to one page |
| Per-page titles & descriptions | One document, one `<head>` |
| Per-product indexing | 8 products, 0 indexable URLs |
| Search Console page-level data | Nothing to report per page |

**Fix required:** migrate to real path-based routes (`/products/mangoes`, `/about`) with server-rendered or pre-rendered HTML. This was identified in the original strategy document as the site's single most expensive defect, and it is still open.

**Two routes to fixing it:**
- **Astro migration** — the plan from the original strategy doc. SSG/ISR per page. Correct long-term answer, ~3–4 dev-weeks to parity.
- **Prerendering (faster interim)** — keep the Vite SPA, add path routing, and pre-render each route to static HTML at build time (`vite-plugin-ssr`, `react-snap`, or a Puppeteer prerender step in the Docker build). Days, not weeks. Gets you indexable URLs without the full rebuild.

Given launch timing, prerendering is the pragmatic call. Astro later.

**Everything below Phase 1 depends on this being done.**

---

## PHASE 1 — Do today. Works on the current SPA.

### 1.1 Google Tag Manager first, then everything through it
Install GTM once in `index.html`. Then GA4, Meta Pixel, and any future tag are configured in GTM's UI — no code deploy per tag. On a site where every change needs a Docker rebuild, this matters.

**SPA-specific requirement:** GTM's default pageview trigger fires once, on load. Hash route changes will not be tracked. You must push a custom event on route change:

```js
window.dataLayer.push({ event: 'spa_pageview', page_path: window.location.hash });
```
Wire it into the existing hash-router module (`app/router.js`), and configure GA4's pageview trigger in GTM to fire on `spa_pageview` instead of the built-in trigger. **Without this, GA4 reports one pageview per session and nothing else.**

### 1.2 GA4
Create the property, get the Measurement ID, configure through GTM. Set up conversion events immediately — the ones that matter here:
- `enquiry_submitted` (the RFQ form)
- `whatsapp_click`
- `product_view`

Without conversions configured, GA4 tells you traffic but not whether the site works.

### 1.3 Meta Pixel — ⚠️ legal prerequisite
Meta Pixel is a marketing/tracking cookie. Your target markets include the **UK and EU**, where GDPR/PECR require **prior consent** before it fires. You do not currently have a Privacy Policy or a cookie consent mechanism.

**Do not install Meta Pixel until:**
1. The Privacy Policy exists (still an open item on this project)
2. A cookie consent banner exists, with Pixel gated behind acceptance

GTM's Consent Mode handles the gating cleanly. GA4 can run in consent-mode-basic; Pixel cannot fire without opt-in for UK/EU visitors.

### 1.4 Google Search Console
Verify **the domain property** (DNS TXT record at Hostinger), not the URL-prefix property — domain verification covers `www`, non-`www`, http and https in one go, and you already control DNS.

Add and verify now even though there's little to index yet — Search Console data is not backfilled, so verification date is the earliest date you'll ever have data from.

### 1.5 robots.txt
Serve at the root. Allow everything, point to the sitemap. **Critical:** confirm production is not carrying the staging `Disallow: /` — that file was deliberately kept in `deploy/`, not `public/`, precisely so it could not ship to production. Verify after every deploy.

### 1.6 Organization schema + Open Graph
One `Organization` JSON-LD sitewide, populated from the verified facts in the company profile brief (legal name, `foundingDate: 2025-03-25`, registered address, LLPIN, GSTIN, both partners, `areaServed`). One good OG image — a real operations photograph, not a logo card.

These work even on a SPA because they're in the single `<head>` Google does fetch.

### 1.7 Google Business Profile — India only, and genuinely valuable
Create a GBP listing for the Ahmedabad registered office. This is the highest-ROI local SEO action available to you today, it requires no code, and it feeds Google Maps and local pack results for "export company Ahmedabad" style queries.

Requires physical address verification (postcard/phone). Start it now — verification takes days to weeks.

---

## PHASE 2 — After routing is fixed

### 2.1 URL architecture
```
/                          Home
/about
/products/                 category listing
/products/mangoes          product detail — one URL per SKU
/services/
/trade-network/
/markets/uae/              ← corridor pages, see 3.1
/contact
/privacy  /terms
```

### 2.2 Dynamic XML sitemap
Generate from the database, not hand-maintained — every published `Page`, every published `Product`, every market page. Regenerate on publish. Submit in Search Console.

An unpublished page (like the Trade Network page, currently holding `[CONFIRM]` copy) must be **excluded automatically** — driven by publish status, not a manual list.

### 2.3 Per-page meta
`metaTitle` and `metaDescription` already exist on the `Page` model from the CMS work. Wire them into what actually renders in `<head>` per route. Storing them without serving them achieves nothing — this gap was flagged when the CMS blueprint was written and is still open.

### 2.4 Full schema set
- `Organization` — sitewide
- `Product` — every product page (name, description, category, HS code once real spec data exists)
- `FAQPage` — About and Contact
- `BreadcrumbList` — sitewide
- `LocalBusiness` — the Ahmedabad office, matching the GBP listing exactly

---

## PHASE 3 — The multi-country strategy

### 3.1 Corridor pages, not country clones — this is the important part

**Wrong approach:** six copies of the homepage with the country name swapped. Same-language duplicate content across `en-AE`, `en-GB`, `en-US` gets consolidated or ignored by Google, and gains nothing.

**Right approach:** one page per *trade corridor*, each with genuinely unique, useful content:

```
/markets/uae/       "Fresh Produce Export from India to UAE"
/markets/uk/        "Indian Agricultural Commodity Export to the United Kingdom"
/markets/vietnam/
/markets/tanzania/
/markets/usa/
```

Each page carries content that is **only true of that corridor** — and therefore not duplicate:
- Transit times and shipping routes from Indian ports (Mundra / Pipavav / Nhava Sheva) to that destination's ports
- Which products actually move on that corridor, and their seasonality
- Destination-specific import requirements — phytosanitary certification, labelling rules, permitted treatments
- Local office presence, where one exists
- Currency, Incoterms typically used, MOQs

This is real content a buyer wants, it ranks for high-intent queries ("import mangoes from India to Dubai"), and it sidesteps duplicate content entirely. **It also requires someone to actually know these details** — this is a content commitment, not a technical task.

### 3.2 hreflang — only where content genuinely differs

Language reality across your markets:
- **English serves:** India, UAE (business language), UK, Tanzania, USA
- **Vietnamese genuinely needed for:** Vietnam

So the useful hreflang set is small:

```html
<link rel="alternate" hreflang="en" href="https://solsticellp.com/" />
<link rel="alternate" hreflang="vi" href="https://solsticellp.com/vi/" />
<link rel="alternate" hreflang="x-default" href="https://solsticellp.com/" />
```

**Do not** create `en-AE`, `en-GB`, `en-US`, `en-IN`, `en-TZ` variants of identical English content. That is the duplicate-content trap. Regional targeting comes from the corridor pages' content, not from hreflang tags on identical pages.

**On Vietnamese:** machine translation is not sufficient here — your product pages carry HS codes, Incoterms, and specifications where a mistranslation is a commercial problem. Either commission proper translation for a small set of key pages, or don't do it. This is also why the Google Translate widget in your nav is a convenience for visitors, not an SEO asset — Google does not index widget-translated content.

### 3.3 Per-market keyword targets

Buyers search by **product + corridor**, not by brand:

| Market | Example high-intent queries |
|---|---|
| UAE | `fresh produce supplier india to dubai`, `mango exporter india uae`, `vegetable import dubai from india` |
| UK | `indian spice supplier uk`, `basmati rice importer uk india` |
| Vietnam | `indian agricultural commodity supplier vietnam` |
| Tanzania | `india to tanzania food commodity export` |
| USA | `indian spices bulk supplier usa`, `pulses importer usa india` |
| India | `agricultural commodity exporter ahmedabad`, `fruit export company gujarat` |

Map each to a specific page in the architecture. A keyword with no page targeting it is not a strategy.

### 3.4 Off-site — matters more than usual for a 2025-incorporated company

Generative engines cross-reference. A company that exists only on its own website reads as unverified.

- **LinkedIn company page** — verified, complete, linked in `Organization` schema `sameAs`
- **Trade directories** — TradeIndia, IndiaMART, ExportersIndia. Also `sameAs` targets.
- **NAP consistency** — name, address, phone identical everywhere. Inconsistency here directly damages local and entity-level trust.
- **APEDA / trade body listings** once membership is confirmed

---

## PHASE 4 — AEO layer

### 4.1 `/llms.txt`
Plain markdown at the site root: identity, what you do, locations, markets, contact, FAQ. Generated from the same CMS data as the visible pages so it cannot drift out of sync.

### 4.2 FAQ blocks with `FAQPage` schema
On About, Contact, each product page, and each corridor page. Answer engines are queried in question form; this maps directly onto that.

### 4.3 Write for extraction, not persuasion
Plain declarative sentences beat marketing language for AEO. "Solstice was incorporated on 25 March 2025 in Ahmedabad, Gujarat" is quotable. "A leader in global trade excellence" is not extractable and is ignored.

### 4.4 One fact, one value, everywhere
Visible content, `Organization` schema, and `llms.txt` must agree exactly. The founding-date conflict already live on the site (2023 vs the correct 2025) is precisely the failure this prevents — two values in circulation, and no way for a model to know which is right.

---

## Sequencing

**Today (no routing dependency):** GTM + GA4 with the SPA pageview fix · Search Console domain verification · robots.txt check · Organization schema + OG · start Google Business Profile verification

**This month:** routing fix (prerender) · dynamic sitemap · per-page meta wired to what renders · Privacy Policy + cookie consent → then Meta Pixel

**Next quarter:** corridor pages (content-led, needs real corridor knowledge) · full schema set · `llms.txt` · off-site profiles · Vietnamese translation decision

---

## Two things that will silently waste the entire effort

1. **Publishing unverified figures.** The company profile brief marks 400+ shipments, 50+ banana containers, and 40+ import containers as company-reported and unaudited. An AEO-optimized page is designed to be quoted as fact — publishing an unsubstantiated number means models repeat it to buyers who can disprove it.

2. **The founding-date conflict.** 2023 is live on the site; the MCA record and the company brief both say 25 March 2025. Fix before any schema or `llms.txt` ships, or you are encoding a factual error into the structured data that answer engines trust most.
