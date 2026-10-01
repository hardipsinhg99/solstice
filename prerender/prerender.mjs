/**
 * Post-deploy prerenderer.
 *
 * Drives a headless browser against the RUNNING site and writes the rendered
 * HTML to disk, so a crawler receives real content instead of an empty
 * <div id="root">. Approach (A) from the plan: one-shot, behind a compose
 * profile, no always-on renderer competing for a 2-vCPU box that also hosts
 * another client's production stack.
 *
 * Two rules shape everything below.
 *
 * ATOMICITY. Output is built in a staging directory and swapped in only if
 * EVERY route succeeded. A prerender that dies halfway must leave the previous
 * good HTML exactly where it was - shipping half a site is worse than shipping
 * a stale one, because the missing half returns a 200 with no content and gets
 * indexed that way.
 *
 * DISCOVERY, NOT A LIST. Routes come from the API's own published set. A
 * hardcoded list silently stops covering a page the moment someone adds one,
 * and the failure is invisible: the new page simply never gets prerendered.
 */
import { mkdir, writeFile, readFile, rm, rename, readdir, symlink, lstat, open, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE      = process.env.PRERENDER_BASE ?? 'http://web:8080'
const API       = process.env.PRERENDER_API ?? 'http://api:3001'
const PUBLIC    = process.env.PRERENDER_PUBLIC_ORIGIN ?? 'https://solsticellp.com'
const OUT       = process.env.PRERENDER_OUT ?? '/out'
const STATE     = process.env.PRERENDER_STATE_DIR ?? '/state'
const CHROME    = process.env.CHROME_PATH ?? '/usr/bin/chromium'
const SITE_NAME = 'Solstice Trading International LLP'
// The limits search results actually render before truncating. Asserted by
// scripts/acceptance-prerender.mjs, which fails the deploy if either is passed.
const TITLE_MAX = 60
const DESC_MAX = 155

/* Media URLs arrive either absolute (the Unsplash seed imagery) or
   site-relative (/api/uploads/...). Only the relative ones get the public origin. */
const absolute = (u) => (!u ? undefined : /^https?:\/\//.test(u) ? u : PUBLIC + u)

/* Published pages deliberately NOT prerendered. An exclusion fails safe - the
   page is still served, client-rendered, exactly as before this job existed -
   which is why a short list here is acceptable where a list of pages to
   INCLUDE would not be.

   network: excluded on the brief's instruction because it holds [CONFIRM]
   copy. That copy lives in a section whose publishedVisible is false, so the
   public API already withholds it and a render would not contain it; the
   exclusion is kept until the client confirms the copy. */
const EXCLUDED_PAGES = new Set(['network'])

const log = (...a) => console.log('[prerender]', ...a)
const fail = (...a) => console.error('[prerender] ERROR', ...a)

const json = async (path) => {
  const res = await fetch(API + path)
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`)
  return res.json()
}

/** Every route worth prerendering, discovered from the API. */
async function discover () {
  const { slugs } = await json('/api/pages')          // published pages only
  const products  = await json('/api/products')       // published products only

  // Publish state IS the filter. /api/pages lists published pages only, so a
  // DRAFT page (Team, on production) never reaches this list - and the day
  // someone publishes it, it is covered without a code change.
  const pages = slugs
    .filter((slug) => !EXCLUDED_PAGES.has(slug))
    .map((s) => ({ kind: 'page', slug: s, path: s === 'home' ? '/' : s === 'network' ? '/trade-network' : `/${s}` }))

  /* Import-catalogue placeholders are PUBLISHED - they hold a slot on the
     listing - but carry no real content and must not become indexable URLs.
     The row's own `placeholder` flag decides, not a slug pattern: the slugs are
     editable and a pattern guessed from today's names would miss tomorrow's. */
  const kept = products.filter((p) => !p.placeholder)
  const skipped = products.length - kept.length

  const routes = [
    ...pages,
    /* Routes that exist in code with no CMS row behind them, so the API cannot
       list them. Mirrors src/data/navigation.js; a new code route means a
       deploy, and adding it here belongs in that same change. */
    { kind: 'static', slug: 'gallery', path: '/gallery', label: 'Gallery' },
    { kind: 'static', slug: 'contact', path: '/contact', label: 'Contact us' },
    { kind: 'listing', path: '/products' },
    { kind: 'listing', path: '/products/export' },
    { kind: 'listing', path: '/products/import' },
    ...kept.map((p) => ({ kind: 'product', slug: p.slug, path: `/products/${p.slug}`, product: p })),
  ]
  return { routes, skipped, productCount: kept.length, pageCount: pages.length }
}

/* ─── head construction ──────────────────────────────────────────────────── */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const organizationLd = (settings) => ({
  '@context': 'https://schema.org', '@type': 'Organization',
  name: SITE_NAME, url: PUBLIC, logo: `${PUBLIC}/solstice-logo.png`,
  /* Only what the footer shows. The admin can switch the phone or the email off,
     and a number hidden from visitors must not be published to crawlers in a
     script tag they cannot see. */
  ...contactPoint(settings),
})

function contactPoint (s) {
  const email = s?.contactEmailEnabled !== false && s?.contactEmail ? s.contactEmail : null
  const phone = s?.contactPhoneEnabled !== false && s?.contactPhone ? s.contactPhone : null
  if (!email && !phone) return {}
  return { contactPoint: [{
    '@type': 'ContactPoint', contactType: 'sales',
    ...(email ? { email } : {}), ...(phone ? { telephone: phone } : {}),
  }] }
}

const breadcrumbLd = (trail) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({
    '@type': 'ListItem', position: i + 1, name: t.name, item: PUBLIC + t.path,
  })),
})

const productLd = (p) => ({
  '@context': 'https://schema.org', '@type': 'Product',
  name: p.name, url: `${PUBLIC}/products/${p.slug}`,
  ...(p.description ? { description: p.description } : {}),
  ...(p.primaryImage?.url ? { image: absolute(p.primaryImage.url) } : {}),
  /* No countryOfOrigin. schema.org wants a country and `origin` holds growing
     regions ("Gujarat, Maharashtra, Andhra Pradesh"). Writing "India" would be
     an inference, not data, and wrong for import products; the regions are in
     the page text, where they are true. */
  brand: { '@type': 'Brand', name: SITE_NAME },
  /* No `offers`. The site is quote-only with no price anywhere, and inventing an
     offer to satisfy a rich-result checklist would be a claim the business has
     not made. */
})

/* Search results truncate a title past ~60 characters and a description past
   ~155, mid-word, and the cut usually lands in the one part that identifies
   the page. The suffix is what gives, never the product's own name: a buyer
   scanning results needs "Premium Arabica Coffee Beans" in full far more than
   the legal form of the company, which the result's own domain line already
   shows. Measured against real catalogue names, which is where this first
   failed - "Premium Arabica Coffee Beans | Solstice Trading International LLP"
   is 65 characters. */
const SUFFIXES = [` | ${SITE_NAME}`, ' | Solstice Trading', ' | Solstice']

function fitTitle (name) {
  const clean = String(name ?? '').trim()
  for (const suffix of SUFFIXES) {
    if (clean.length + suffix.length <= TITLE_MAX) return clean + suffix
  }
  // A name that long on its own is already the whole title; it is never cut,
  // because a half-written product name is worse than a long one.
  return clean
}

/* Trimmed at a sentence end when there is one inside the budget, else at a
   word boundary. Never mid-word, and never with text added: the description
   is the owner's copy, shortened, not rewritten. */
function fitDescription (text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= DESC_MAX) return clean
  const budget = clean.slice(0, DESC_MAX + 1)
  const sentence = Math.max(budget.lastIndexOf('. '), budget.lastIndexOf('! '), budget.lastIndexOf('? '))
  if (sentence >= DESC_MAX * 0.6) return clean.slice(0, sentence + 1)
  const word = budget.lastIndexOf(' ')
  return clean.slice(0, word > 0 ? word : DESC_MAX).replace(/[,;:.\s]+$/, '') + '…'
}

function buildHead ({ title: rawTitle, description, path, ld, image = `${PUBLIC}/og-image.png` }) {
  const canonical = PUBLIC + (path === '/' ? '/' : path)
  const title = rawTitle.length <= TITLE_MAX ? rawTitle : fitTitle(rawTitle.split(' | ')[0])
  const desc = fitDescription(description || `${SITE_NAME} — fresh produce, spices and staples from India for international buyers.`)
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}"/>`,
    `<link rel="canonical" href="${esc(canonical)}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(desc)}"/>`,
    `<meta property="og:url" content="${esc(canonical)}"/>`,
    `<meta property="og:image" content="${esc(image)}"/>`,
    `<meta property="og:locale" content="en_IN"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:image" content="${esc(image)}"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(desc)}"/>`,
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`),
  ].join('\n    ')
}

/* ─── render ─────────────────────────────────────────────────────────────── */

async function renderRoute (page, route, settings, pageMeta) {
  const url = BASE + route.path
  // What went wrong, if something does. "No content rendered" on its own sends
  // whoever runs this at 2am straight to guessing.
  const trouble = []
  const onError = (e) => trouble.push(`pageerror: ${e.message}`)
  const onFail = (r) => trouble.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`)
  const onResponse = (r) => { if (r.status() >= 400) trouble.push(`HTTP ${r.status()} ${r.url()}`) }
  page.on('pageerror', onError); page.on('requestfailed', onFail); page.on('response', onResponse)
  try {
    return await renderRouteInner(page, route, settings, pageMeta, url)
  } catch (err) {
    throw new Error(`${err.message}${trouble.length ? '\n  ' + trouble.slice(0, 12).join('\n  ') : ''}`)
  } finally {
    page.off('pageerror', onError); page.off('requestfailed', onFail); page.off('response', onResponse)
  }
}

async function renderRouteInner (page, route, settings, pageMeta, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
  // The CMS sections mount when the API answers; networkidle2 can fire before
  // React has committed them. Wait for real content rather than a fixed sleep.
  await page.waitForFunction(
    () => document.querySelector('main') && document.body.innerText.trim().length > 400,
    { timeout: 30_000 },
  ).catch(() => { throw new Error(`no content rendered at ${route.path}`) })

  const meta = pageMeta.get(route.slug)
  let title, description, ld
  const org = organizationLd(settings)

  if (route.kind === 'product') {
    const p = route.product
    title = p.seoTitle?.trim() || `${p.name} | ${SITE_NAME}`
    // The product's own description is a far better fallback than the
    // sitewide line: it is specific to the page, and it is already public.
    description = p.seoDescription?.trim() || p.description?.trim() || null
    ld = [org, productLd(p), breadcrumbLd([
      { name: 'Home', path: '/' }, { name: 'Products', path: '/products' },
      { name: p.name, path: `/products/${p.slug}` },
    ])]
  } else if (route.kind === 'static') {
    title = `${route.label} | ${SITE_NAME}`
    description = null
    ld = [org, breadcrumbLd([{ name: 'Home', path: '/' }, { name: route.label, path: route.path }])]
  } else if (route.kind === 'listing') {
    const label = route.path === '/products' ? 'Products'
      : route.path.endsWith('export') ? 'Export products' : 'Import products'
    title = `${label} | ${SITE_NAME}`
    description = null
    ld = [org, breadcrumbLd([{ name: 'Home', path: '/' }, { name: label, path: route.path }])]
  } else {
    title = meta?.seoTitle || `${SITE_NAME}`
    description = meta?.seoDescription || null
    ld = [org, ...(route.path === '/' ? [] : [breadcrumbLd([
      { name: 'Home', path: '/' }, { name: meta?.title ?? route.slug, path: route.path },
    ])])]
  }

  const image = absolute(route.product?.primaryImage?.url)
  const head = buildHead({ title, description, path: route.path, ld, image })

  // Serialize the live DOM, then replace the shell's head tags with the real
  // ones. The SPA boots over this markup on a real visit; the server-rendered
  // copy is what a crawler that runs no JavaScript sees.
  let html = await page.evaluate((snapshotId) => {
    /* Everything the static copy shows must be visible WITHOUT JavaScript.
       A Reveal that never scrolled into view in this headless window is still
       at opacity 0, and serialised that way it is text a crawler finds but
       styling hides - which reads as hidden text. */
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'))
    document.querySelectorAll('script[src*="translate.goog"]').forEach((el) => el.remove())
    document.documentElement.removeAttribute('data-prerendered')

    // The data this render used, keyed exactly as the app keys it. Resolved
    // entries only: an in-flight or failed fetch has nothing worth embedding.
    const out = {}
    for (const [key, slot] of window.__SOLSTICE_STORE__ ?? []) {
      if (slot.data !== undefined) out[key] = slot.data
    }
    const tag = document.createElement('script')
    tag.type = 'application/json'
    tag.id = snapshotId
    // Escaped so CMS copy containing "</script>" cannot close the tag early.
    tag.textContent = JSON.stringify(out).replace(/</g, '\\u003c')
    document.getElementById('root').after(tag)

    return '<!doctype html>\n' + document.documentElement.outerHTML
  }, '__solstice_state')
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/ig, '')
    .replace(/<link\s+rel="canonical"[^>]*>/ig, '')
    // The shell's og:*/twitter:* describe the whole site (and point at the
    // wrong domain). Leaving them in would put two og:title tags on every page,
    // and scrapers disagree about which one wins.
    .replace(/<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>/ig, '')
    // The CONFIRM-BEFORE-DEPLOY comment in the shell is about the tags just
    // removed; shipping it into rendered pages would be noise at best.
    .replace(/<!--\s*=+\s*CONFIRM BEFORE DEPLOY[\s\S]*?-->/, '')
    .replace('</head>', `  ${head}\n  </head>`)
  return { html, title, description, authored: Boolean(description) }
}

/* ─── main ───────────────────────────────────────────────────────────────── */


/* ─── the browser page ───────────────────────────────────────────────────── */

async function preparePage (page) {
  // Tells useApiResource to expose its store, so the data snapshot can be read
  // back without this script knowing any of the app's cache keys.
  await page.evaluateOnNewDocument(() => { window.__SOLSTICE_PRERENDER__ = true })

  await page.setRequestInterception(true)
  page.on('request', async (req) => {
    const url = new URL(req.url())

    /* Every page is rendered from the empty shell, never from nginx's answer
       for the path. nginx answers /about with the last run's /about, which
       boots from its own embedded snapshot - the job would re-render stale
       data and re-embed it, and a publish would never reach the static HTML.

       Rewritten to /index.html (the exact-match location nginx never answers
       from the prerender volume) rather than fulfilled with the shell's bytes:
       a navigation answered by respond() is not treated as an ordinary
       same-origin document, and the shell's `crossorigin` bundle and
       stylesheet then fail with ERR_FAILED - measured, not assumed. The page
       never sees the rewrite; location.pathname stays the route. */
    if (req.isNavigationRequest() && req.resourceType() === 'document') {
      return req.continue({ url: BASE + '/index.html' })
    }

    // Google Translate rewrites the DOM it lands in. Serialised, its iframes
    // and script tag would ship in the static HTML and then be injected again
    // on boot - or load at all after an admin had switched it off.
    if (/translate\.goog(le)?(apis)?\.com/.test(url.hostname)) return req.abort('blockedbyclient')

    /* The page is loaded from the web container directly, which bypasses
       Traefik - and Traefik is what sends /api to the API. Without this every
       CMS fetch would be answered by nginx's SPA fallback with index.html and
       the sections would never mount. So /api (media included, under
       /api/uploads) is answered here from the API container, as the edge would. */
    if (url.origin !== new URL(BASE).origin || !url.pathname.startsWith('/api/')) return req.continue()
    try {
      const res = await fetch(API + url.pathname + url.search, {
        method: req.method(), headers: req.headers(), body: req.postData(),
      })
      const body = Buffer.from(await res.arrayBuffer())
      const headers = Object.fromEntries(res.headers)
      delete headers['content-encoding']; delete headers['content-length']
      await req.respond({ status: res.status, headers, body })
    } catch {
      await req.abort('failed')
    }
  })
}

/* ─── one run ────────────────────────────────────────────────────────────── */

const readJson = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')) } catch { return null } }
const writeJson = async (f, o) => { await mkdir(STATE, { recursive: true }); await writeFile(f, JSON.stringify(o, null, 2)) }
const REQUEST_FILE = join(STATE, 'rebuild-requested.json')
const LAST_RUN_FILE = join(STATE, 'last-run.json')
const LAST_SUCCESS_FILE = join(STATE, 'last-success.json')
const LOCK_FILE = join(STATE, 'lock')
const LOCK_STALE_MS = 15 * 60_000

/* Identity of the SPA shell this run renders from.

   Every prerendered file references the shell's content-hashed bundle
   (/assets/index-<hash>.js). The next deploy ships new hashes and the old files
   are gone, so HTML rendered from the previous shell would load unstyled and
   without JavaScript. deploy/web.Dockerfile bakes the SAME hash of the SAME
   file into nginx.conf, and nginx only looks in shell-<that hash>: after a
   deploy it finds nothing there and serves the plain shell until this job has
   rendered against the new one. HTML with mismatched assets is never served. */
async function shellId () {
  const bytes = Buffer.from(await (await fetch(BASE + '/index.html')).arrayBuffer())
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16)
}

/* One run at a time, whether it came from the watcher or a hand-run
   `compose run`. O_EXCL create is the lock; a lock older than any real run is
   a crashed holder and is taken over rather than blocking rebuilds forever. */
async function withLock (fn) {
  await mkdir(STATE, { recursive: true })
  let handle
  try {
    handle = await open(LOCK_FILE, 'wx')
  } catch {
    const age = Date.now() - (await stat(LOCK_FILE).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs
    if (age < LOCK_STALE_MS) throw new Error(`another prerender is running (lock ${Math.round(age / 1000)}s old)`)
    log(`taking over a stale lock (${Math.round(age / 60_000)} min old)`)
    await rm(LOCK_FILE, { force: true })
    handle = await open(LOCK_FILE, 'wx')
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
    await handle.close()
    return await fn()
  } finally {
    await rm(LOCK_FILE, { force: true })
  }
}

/** Atomically point `name` at `target`: symlink under a temp name, rename over. */
async function repoint (name, target) {
  const link = join(OUT, name)
  const next = join(OUT, `.${name}-next`)
  await rm(next, { force: true })
  await symlink(target, next)   // relative target: valid wherever the volume is mounted
  const current = await lstat(link).catch(() => null)
  // A real directory here is the single-directory layout from before the
  // swap existed; rename() cannot replace a directory with a link.
  if (current && !current.isSymbolicLink()) await rm(link, { recursive: true, force: true })
  await rename(next, link)
}

async function runOnce () {
  const started = new Date()
  const stamp = started.toISOString().replace(/[:.]/g, '-')
  const builds = join(OUT, 'builds')
  const staging = join(builds, stamp)

  /* Layout inside the volume:
       builds/<stamp>/           one complete render per run
       shell-<id> -> builds/..   what nginx serves pages from, per shell
       current    -> builds/..   the sitemap, which does not depend on assets
     Each swap replaces a symlink with rename(2), which is atomic: nginx sees
     either the whole old build or the whole new one, never a gap between. */
  const shell = await shellId()
  const { routes, skipped, productCount, pageCount } = await discover()
  log(`shell ${shell}; ${routes.length} routes (${pageCount} pages, ${productCount} products, ${skipped} placeholders skipped)`)

  const settings = await json('/api/settings').catch(() => null)
  const pageMeta = new Map()
  for (const r of routes.filter((x) => x.kind === 'page')) {
    try { pageMeta.set(r.slug, await json(`/api/pages/${r.slug}`)) } catch { /* the page falls back below */ }
  }

  await mkdir(staging, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  const results = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await preparePage(page)
    for (const route of routes) {
      const { html, title, description } = await renderRoute(page, route, settings, pageMeta)
      const dir = join(staging, route.path === '/' ? '' : route.path)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'index.html'), html)
      results.push({ path: route.path, bytes: html.length, title, hasDescription: Boolean(description) })
      log(`ok ${route.path} (${Math.round(html.length / 1024)}KB)`)
    }
  } catch (err) {
    // Nothing points at a half-written build, but it is still disk.
    await rm(staging, { recursive: true, force: true })
    throw err
  } finally {
    await browser.close()
  }

  /* The sitemap docs/website-strategy.md asks for, built from exactly the set
     rendered above - so it can never list an unpublished page or a
     placeholder product, and never omits a route that was rendered. */
  const today = started.toISOString().slice(0, 10)
  await writeFile(join(staging, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    results.map((r) => `  <url><loc>${esc(PUBLIC + r.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    '\n</urlset>\n')

  /* The swap. Only reached if EVERY route rendered - any throw above skips it
     and the links still point at the previous complete build. That is the
     whole guarantee, and it is the only place live output changes. */
  await repoint(`shell-${shell}`, join('builds', stamp))
  await repoint('current', join('builds', stamp))

  // Keep this build and the one before it (an instant rollback: repoint the
  // link), delete older ones, then drop any link left pointing at nothing.
  const all = (await readdir(builds)).sort()
  for (const old of all.slice(0, -2)) await rm(join(builds, old), { recursive: true, force: true })
  for (const name of await readdir(OUT)) {
    if (!name.startsWith('shell-')) continue
    const dangling = !(await stat(join(OUT, name)).catch(() => null))
    if (dangling) await rm(join(OUT, name), { force: true })
  }
  await rm(join(OUT, 'pages'), { recursive: true, force: true })   // pre-shell layout

  const finished = new Date()
  const missingDesc = results.filter((r) => !r.hasDescription).map((r) => r.path)
  const status = {
    ok: true, shell,
    startedAt: started.toISOString(), finishedAt: finished.toISOString(),
    durationMs: finished - started, routes: results.length,
    placeholdersSkipped: skipped, routesMissingDescription: missingDesc,
  }
  await writeJson(LAST_RUN_FILE, status)
  await writeJson(LAST_SUCCESS_FILE, status)
  log(`swapped in ${results.length} routes in ${finished - started}ms`)
  if (missingDesc.length) log(`NO seoDescription written for: ${missingDesc.join(', ')}`)
  return status
}

/** Runs once under the lock and records a failure where the admin can see it. */
async function attempt () {
  const started = new Date().toISOString()
  try {
    return await withLock(runOnce)
  } catch (err) {
    fail(err.stack || err.message)
    // The links were never repointed, so the site is serving the previous
    // complete build. last-success.json is untouched for the same reason.
    await writeJson(LAST_RUN_FILE, { ok: false, startedAt: started, finishedAt: new Date().toISOString(), error: String(err.message ?? err) }).catch(() => {})
    throw err
  }
}

/* ─── watch mode ─────────────────────────────────────────────────────────── */

/* The API cannot start a container - that would mean giving it the Docker
   socket, which is root on the host. It writes rebuild-requested.json into a
   shared volume instead, and this loop acts on it.

   Idle cost is this Node process and a stat every POLL_MS; Chromium exists
   only for the ~15 s of a render. MIN_GAP_MS caps how often an editor
   clicking Publish repeatedly can make it render, on a box that also runs
   another client's production stack. */
const POLL_MS = 10_000
const MIN_GAP_MS = 60_000
const FAIL_BACKOFF_MS = 5 * 60_000

async function needsRun () {
  const [requested, success] = await Promise.all([readJson(REQUEST_FILE), readJson(LAST_SUCCESS_FILE)])
  if (!success) return 'no successful build yet'
  // Compared with the start of the last good run, not its end: an edit landing
  // while a render is in progress was not in that render, even though the
  // render finished after it.
  if (requested?.requestedAt && Date.parse(requested.requestedAt) >= Date.parse(success.startedAt)) {
    return `requested (${(requested.reasons ?? []).join(', ')})`
  }
  // A deploy changes the shell. Until a render exists for the new one, nginx
  // is serving plain client-rendered pages.
  const shell = await shellId().catch(() => null)
  if (shell && shell !== success.shell) return `new shell ${shell}`
  return null
}

/* Both upstreams answering. An API that is still migrating at stack start, or
   restarting, is not a render failure and must not cost the five-minute
   failure backoff - it simply is not time yet. depends_on only orders
   container START, not readiness, so this cannot be left to compose. */
async function upstreamsReady () {
  try {
    const [api, web] = await Promise.all([fetch(API + '/api/pages'), fetch(BASE + '/index.html')])
    return api.ok && web.ok
  } catch { return false }
}

async function watch () {
  log(`watching ${STATE} every ${POLL_MS / 1000}s`)
  let lastAttempt = 0
  let lastFailed = false
  let waiting = false
  for (;;) {
    try {
      if (!(await upstreamsReady())) {
        if (!waiting) log('waiting for the api and web containers')
        waiting = true
        await new Promise((r) => setTimeout(r, POLL_MS))
        continue
      }
      waiting = false
      const reason = await needsRun()
      const gap = lastFailed ? FAIL_BACKOFF_MS : MIN_GAP_MS
      if (reason && Date.now() - lastAttempt >= gap) {
        log(`rebuilding: ${reason}`)
        lastAttempt = Date.now()
        try { await attempt(); lastFailed = false } catch { lastFailed = true }
      }
    } catch (err) {
      fail(`watch loop: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

if (process.argv.includes('--watch')) {
  watch()
} else {
  attempt().then(() => process.exit(0), () => process.exit(1))
}
