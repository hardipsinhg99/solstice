# Testing context

How this site is verified from the **outside**: a real browser against a real URL,
checking that the product still behaves and still performs.

## What this is not

Three documents already exist and this one deliberately does not repeat them:

| Document | Question it answers | Run from | When |
|---|---|---|---|
| `DEPLOY.md` | how do I stand a stack up | VPS | first deploy |
| `VERIFY.md` | did this deploy stand up correctly | VPS | after every deploy |
| `CUTOVER.md` / `GOLIVE.md` | how does traffic move to production | VPS | go-live only |
| **this file** | **does the product still work and still perform** | **workstation** | **before a release, after risky changes** |

`VERIFY.md` is the closest neighbour and the two overlap on SMTP and CRUD. The
split is by method, not by topic: `VERIFY.md` asks Postgres and Docker directly
and is authoritative on infrastructure; this file drives Chrome and is
authoritative on what a buyer actually experiences. If they ever disagree,
`VERIFY.md` wins on infrastructure and this file wins on behaviour.

## Environments

| | Host | Stack dir | Compose project | Notes |
|---|---|---|---|---|
| Staging | `test.solsticellp.com` | `/opt/solstice` | `solstice` | `robots.txt` is `Disallow: /`. **Test here.** |
| Production | *(unrouted)* | `/opt/solstice-prod` | `solstice-prod` | `traefik.enable=false` until go-live |
| Coming-soon | `solsticellp.com`, `www` | `/opt/solstice-comingsoon` | `solstice-cs` | countdown page |

**Staging and production have separate databases.** Writing test data to staging
cannot reach production. That is what makes the mutating checks below safe.

Admin credentials live in `/opt/solstice/.env` as `ADMIN_SEED_EMAIL` and
`ADMIN_SEED_PASSWORD`. Never paste them into a terminal that gets shared.

## The harness lives outside the repo, on purpose

CLAUDE.md forbids adding a test runner without asking, and that rule is right:
this site has no unit tests and does not need a framework to have a smoke test.
So the driver is installed into a scratch directory and **never** into
`package.json` or `node_modules`.

```sh
mkdir -p /tmp/solstice-qa && cd /tmp/solstice-qa
npm init -y
PUPPETEER_SKIP_DOWNLOAD=1 npm install puppeteer-core lighthouse
export CHROME_PATH=/usr/bin/google-chrome
```

`PUPPETEER_SKIP_DOWNLOAD=1` matters — without it puppeteer pulls its own ~200 MB
Chromium. `puppeteer-core` drives the Chrome already installed on the machine.

Confirm the repo is untouched afterwards: `git status --short` must be empty.

## The eight checks

Numbers in brackets are the values observed on 2026-08-14 at commit `248c992`.
Treat them as the regression baseline, not as targets.

### 1–2. Every route, both themes, zero console errors

Routes: `` (Home), `#products`, `#product/mangoes`, `#about`, `#services`,
`#network`, `#gallery`, `#contact`. Theme is forced before first paint via
`localStorage.setItem('solstice-theme', 'dark'|'light')` in
`evaluateOnNewDocument` — setting it after load races the ThemeProvider.

```js
const page = await browser.newPage()
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url()))
await page.evaluateOnNewDocument(t => localStorage.setItem('solstice-theme', t), theme)
await page.goto(url, { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 2200))   // let IntersectionObserver reveals settle
```

**Baseline: 16 combinations, 0 console errors, 0 failed requests, 0 warnings.**

The 2.2 s settle is not padding. `Reveal` mounts content through
`IntersectionObserver`, so a page screenshotted or probed at `networkidle2` is
measured before half of it exists.

### 3. Admin round-trip, each step surviving a reload

Login → edit a product → upload an image → save **and publish** a section →
change a setting. "Persisted" means re-read after a full page reload, not that
the button showed a success toast.

**Baseline: all five pass.** One console error is expected and benign: a `401`
on the pre-login auth probe, before a token exists.

Also assert the admin shell has exactly one scroll container — this regressed
once and produced a dead zone at the bottom of every long page:

```js
await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('.admin-shell'))
  return { overflow: cs.overflow, height: cs.height, winH: window.innerHeight,
           docScrolls: document.documentElement.scrollHeight > window.innerHeight + 2 }
})
// expect overflow "hidden", height === viewport height, docScrolls false
```

### 4. Enquiry saves, and somebody is told

```sh
curl -s -X POST https://test.solsticellp.com/api/enquiries \
  -H 'Content-Type: application/json' \
  -d '{"name":"QA","email":"qa@example.com","phone":"+911234567890",
       "message":"smoke test","consent":"yes"}'
# expect 201 {"id":"...","received":true}
```

Saving and notifying are **two different questions** and the API answers 201 to
the first regardless of the second. `mail.service.ts` logs an error on failure
and logs nothing on success, so silence is the pass signal — which is a weak
signal on its own. Prove the transport separately:

```sh
docker exec solstice-api-1 node -e "
require('nodemailer').createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT,
  secure: +process.env.SMTP_PORT === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}).verify().then(() => console.log('SMTP OK')).catch(e => console.log('SMTP FAIL', e.message))"
```

**Baseline: 201 + row persisted `NEW`; `SMTP OK`; zero mail errors in the whole
log history on both stacks; notifications go to `NOTIFY_EMAIL=info@solsticellp.in`.**

The variables are `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
`NOTIFY_EMAIL`. They are **not** `SMTP_PASSWORD` or `MAIL_TO`; grepping for those
names reports a working mail setup as unconfigured.

### 5. Nothing heavy loads on a phone

Capture every request at 390 px and at 1440 px and diff them.

**Baseline: 25 requests at 390 px, 24 at 1440 px. Zero video, zero `<video>`
elements, zero journey/explode assets at either width.** Those assets no longer
exist in the build; the check is kept so their reintroduction is noticed.

### 6. `prefers-reduced-motion: reduce`

```js
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)
```

**Baseline: Home 8 → 0 running, About 6 → 0, Trade Network 7 → 0, with body text
length unchanged.** Both halves matter: animations must stop *and* content must
still be there. A reduced-motion rule that hides content instead of stilling it
passes a naive check and fails a real user.

### 7. Publish state of every page

```sh
curl -s https://test.solsticellp.com/api/pages          # {"slugs":[...]}
curl -s https://test.solsticellp.com/api/pages/<slug>   # null if unpublished
```

`findPublic` omits hidden sections entirely, so a section missing from the
response is the server saying "hidden" — not an error. Check both levels: a page
can be published while a section inside it is withheld.

### 8. 390 px and 1440 px

No horizontal overflow (`documentElement.scrollWidth === window.innerWidth`), and
the mobile nav opens and closes without moving the page.

```js
await page.evaluate(() => window.scrollTo(0, 600))
const t = await page.$('.menu-toggle')            // toggle
// open  -> .nav-links.open exists, .nav-backdrop exists, aria-expanded="true"
// close -> scrollY still 600
```

**Baseline: no overflow at either width; scroll restored 600 → 600; at 1440 px
`.menu-toggle` is `display:none`.**

Expect `.network-marquee-track` to report wider than the viewport on Trade
Network. That is the marquee and it is contained — judge overflow on
`documentElement`, never on descendants.

## Performance baseline

Lighthouse, default **mobile** profile, simulated throttling, 2026-08-14:

| | Home | Products |
|---|---|---|
| Performance | 54 | 55 |
| LCP | 8.0 s | 8.7 s |
| CLS | 0 | 0 |
| TBT | 320 ms | 260 ms |
| Transfer | 929 KiB | 1,355 KiB |

```sh
npx lighthouse https://test.solsticellp.com/ --quiet \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance --output=json --output-path=./lh.json
```

Do **not** pass `--preset=desktop` alongside mobile emulation flags; they
conflict and the run silently reports desktop. Check `configSettings.formFactor`
in the JSON output rather than trusting the flags.

Serving-layer baseline: main JS bundle **907,577 B → 334,200 B gzipped (63 %)**.
Hashed assets carry `public, immutable, max-age=31536000`; `index.html` carries
`no-cache, must-revalidate`; `/api/pages/*` carries `max-age=0, must-revalidate`
and **must stay that way** — it is what stops editors seeing stale copy after
they publish.

## Traps

Every one of these produced a wrong answer during the 2026-08-14 pass before
being caught. They are the reason this file exists.

**A 200 does not mean the file exists.** The SPA serves `index.html` for every
unmatched path, so `/.env`, `/.git/config` and `/ADMIN_CREDENTIALS.txt` all
return `200`. Check the **body and `content-type`** before reporting an exposure.
All three return HTML; nothing is exposed.

**`__REACT_DEVTOOLS` is in production React.** Grepping the bundle for it reports
a dev build on a correct production build. The markers that actually mean dev are
`react-refresh`, `jsxDEV`, `checkPropTypes`, `react.development` — all zero here.

**The minifier lowercases hex and rewrites quotes.** `--deep:#0B5C36` ships as
`#0b5c36`, and `label: 'GTN'` ships as `` label:`GTN` ``. Case-sensitive or
quote-sensitive greps against built assets produce false "MISSING" results.

**Product `PUT /api/products/:id` is strict-whitelisted, including nested
arrays.** Reading a product and writing it straight back fails with
`property ... should not exist` for `primaryImageId`, `gallery`, and per-row
`varieties[].productId`. Edit products through the admin UI, not by round-tripping
the API.

**Wrong env var names read as "unconfigured".** See check 4.

## Mutating checks: restore what you touch

Checks 3 and 7 write to the staging database. Capture the original value first
and write it back, then re-publish if the change was published. After the
2026-08-14 pass: product name, `contactPhone` and the Services `intro` eyebrow
were all restored and verified.

Uploaded test images are left behind by design — deleting media exercises a
destructive path that has no business running in a smoke test. They are small
and unreferenced.

## Known incomplete

Status at 2026-08-14, the day before go-live. This is a register, not a to-do
list — update the date and status when one changes.

| Item | Status |
|---|---|
| SMTP | **Working.** Verified by live handshake. |
| Privacy policy, Terms | **Missing entirely** — no route, no nav or footer link. The enquiry form's consent checkbox points at no published policy. |
| Trade Network page | **Published and publicly reachable.** Its `services` section holds `[CONFIRM]` copy in `publishedData` and is withheld only by `publishedVisible=false` — one toggle from being public. |
| About founding year | `2023` carries `unresolvedScope: true`, so it renders to buyers with the unverified marker. |
| About "Recognition" intro | Renders the literal string `[REWRITE - placeholder hedge language removed, needs real editorial copy]` to every visitor. Deliberate by design (`IndustryRecognition.jsx` ships the marker so the gap is unmistakable), but the copy was never written. **CMS content — fixable in the admin in under a minute, no deploy.** |

## Deferred performance work

Measured, not acted on. In order of size:

1. **Unused JavaScript, ~290 KiB** (est. 1.5–1.7 s). One 907 KB bundle, no code
   splitting. This is what drives the 8 s LCP.
2. **Main-thread work 5.2 s (Home) / 4.2 s (Products).**
3. **API responses are not compressed.** `/api/products` serves 12,960 B as
   identity even when `Accept-Encoding: gzip` is offered. Serving-layer config;
   no application change needed.

Brotli is not available in the `nginx:1.27-alpine` base image. Adding it means
changing base images, which is a dependency decision, not a config tweak.
