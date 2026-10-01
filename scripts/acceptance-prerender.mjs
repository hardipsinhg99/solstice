/**
 * Acceptance checks for the prerendered site.
 *
 * Fetches each URL exactly as a crawler that runs no JavaScript does - plain
 * HTTP, no browser - and asserts the response is a finished page rather than
 * the SPA shell. That distinction is the entire point of prerendering: Google
 * renders JS imperfectly and late, and the AI crawlers that decide whether
 * Solstice gets quoted largely do not render it at all.
 *
 *   node scripts/acceptance-prerender.mjs [baseUrl]     # default localhost:18090
 *
 * Exits 1 on any FAIL. WARNs are reported and do not fail the run: they are
 * content the owner has to write, not defects in the pipeline.
 */
const BASE = (process.argv[2] ?? 'http://localhost:18090').replace(/\/+$/, '')

const TITLE_MAX = 60
const DESC_MAX = 155
// The renderer's fallback when a page has no authored description. Pages still
// carrying it are reported: a site-wide sentence on 40 pages is one page's
// worth of information, and Google rewrites it anyway.
const DEFAULT_DESC_MARK = 'fresh produce, spices and staples from India for international buyers'
// Shell markers: if the body is this short or has no heading, prerendering did
// not happen for that route and a crawler is looking at an empty page.
const MIN_BODY_CHARS = 400

const fails = []
const warns = []
const fail = (url, msg) => fails.push(`${url}: ${msg}`)
const warn = (url, msg) => warns.push(`${url}: ${msg}`)

const attr = (html, re) => (html.match(re) ?? [])[1]?.trim()
const meta = (html, name) =>
  attr(html, new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, 'i')) ??
  attr(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`, 'i'))

const textOf = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()

async function main () {
  // The sitemap is the contract: it is what gets submitted, so it is also the
  // list that must be true. Walking it means a URL that is listed but broken
  // cannot pass unnoticed.
  const smRes = await fetch(`${BASE}/sitemap.xml`)
  if (!smRes.ok) { console.error(`sitemap.xml: HTTP ${smRes.status} - nothing to check`); process.exit(1) }
  const smType = smRes.headers.get('content-type') ?? ''
  if (!/xml/i.test(smType)) fail('/sitemap.xml', `Content-Type is "${smType}", not XML`)
  const sitemap = await smRes.text()
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (urls.length === 0) { console.error('sitemap.xml lists no URLs'); process.exit(1) }

  const seen = { title: new Map(), description: new Map(), canonical: new Map() }
  const rows = []

  for (const url of urls) {
    const path = new URL(url).pathname
    const res = await fetch(BASE + path, { redirect: 'manual' })
    if (res.status !== 200) { fail(path, `HTTP ${res.status} (listed in the sitemap)`); continue }
    const html = await res.text()
    const body = textOf((html.match(/<body[\s\S]*<\/body>/i) ?? [html])[0])
    const h1 = attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').trim()

    // 1. a finished page, not the shell
    if (!h1) fail(path, 'no <h1> in the raw HTML - served the shell, not a prerendered page')
    if (body.length < MIN_BODY_CHARS) fail(path, `body text is ${body.length} chars - the shell or a loading state`)
    if (/loading the catalogue|loading…/i.test(body)) fail(path, 'body contains a loading state')

    // 2. head tags present
    const title = attr(html, /<title>([\s\S]*?)<\/title>/i)
    const description = meta(html, 'description')
    const canonical = attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)
    const og = Object.fromEntries(['og:title', 'og:description', 'og:url', 'og:image'].map((k) => [k, meta(html, k)]))
    for (const [k, v] of Object.entries({ title, description, canonical, ...og })) {
      if (!v) fail(path, `missing ${k}`)
    }

    // 3. lengths, and not the global fallback
    if (title) {
      if (title.length > TITLE_MAX) fail(path, `title is ${title.length} chars (max ${TITLE_MAX}): "${title}"`)
      const prev = seen.title.get(title)
      if (prev) fail(path, `title is identical to ${prev}: "${title}"`)
      else seen.title.set(title, path)
    }
    if (description) {
      if (description.length > DESC_MAX) fail(path, `description is ${description.length} chars (max ${DESC_MAX})`)
      if (description.includes(DEFAULT_DESC_MARK)) warn(path, 'description is the site-wide fallback - needs one written for this page')
      else {
        const prev = seen.description.get(description)
        if (prev) fail(path, `description is identical to ${prev}`)
        else seen.description.set(description, path)
      }
    }

    // 4. canonical self-referential and absolute
    if (canonical) {
      if (!/^https?:\/\//i.test(canonical)) fail(path, `canonical is not absolute: "${canonical}"`)
      const want = BASE + (path === '/' ? '/' : path)
      if (canonical.replace(/\/$/, '') !== want.replace(/\/$/, '')) fail(path, `canonical points elsewhere: "${canonical}" (expected ${want})`)
      const prev = seen.canonical.get(canonical)
      if (prev) fail(path, `canonical duplicates ${prev}`)
      else seen.canonical.set(canonical, path)
      if (og['og:url'] && og['og:url'].replace(/\/$/, '') !== canonical.replace(/\/$/, '')) fail(path, 'og:url and canonical disagree')
    }

    // 5. structured data, if emitted, must parse - an AI crawler reading
    //    broken JSON-LD learns nothing and may distrust the rest.
    for (const [, raw] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(raw) } catch (e) { fail(path, `JSON-LD does not parse: ${e.message}`) }
    }

    rows.push({ path, title: title ?? '-', tLen: title?.length ?? 0, dLen: description?.length ?? 0, body: body.length, h1: h1 ? 'yes' : 'NO' })
  }

  console.log(`${BASE} - ${urls.length} URLs from sitemap.xml\n`)
  console.log('path'.padEnd(34) + 'h1   title  desc  body   title text')
  for (const r of rows) {
    console.log(r.path.padEnd(34) + `${r.h1.padEnd(5)}${String(r.tLen).padEnd(7)}${String(r.dLen).padEnd(6)}${String(r.body).padEnd(7)}${r.title.slice(0, 44)}`)
  }
  if (warns.length) { console.log(`\n${warns.length} warning(s) - content to write, not defects:`); for (const w of warns) console.log('  ! ' + w) }
  if (fails.length) { console.log(`\n${fails.length} FAILURE(S):`); for (const f of fails) console.log('  x ' + f); process.exit(1) }
  console.log(`\nPASS - ${rows.length} routes, each a complete page with a unique title and a self-referential canonical.`)
}

await main()
