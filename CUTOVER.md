# Production cutover — solsticellp.com

Target: **Saturday 15 August 2026.**

> ## ⛔ READ THIS FIRST — the premise of this cutover is not what it appeared
>
> `www.solsticellp.com` is **not** serving this repository. It is a **Next.js
> application** (89 `_next/static/*` references, React Server Components
> payload, App Router `_not-found` boundary). This repository is a Vite SPA and
> is deployed at `solstice-teal.vercel.app`.
>
> ```
> solsticellp.com      307 →  www.solsticellp.com   (Next.js, 125KB SSR HTML)
> solstice-teal...app  200  →  this repo             (Vite, /assets/index-*.js)
> ```
>
> This is therefore **not** "ship the CMS branch to production." It is
> **replacing one live production website with a different one**, and the two do
> not share a codebase, a URL structure, or a Vercel project.
>
> Three gates in §0 must close before any of the rest of this document is
> actionable. Do not schedule 15 Aug until they have.

---

# §0 Blocking gates — resolve before anything else

These are not pre-flight checks. They are unknowns that determine whether this
cutover is a one-evening job or a multi-week project. **None can be answered
from this repository.**

### 0.1 — URL structure. This is the SEO blocker.

The Next.js site serves **real server paths**. This SPA is **hash-routed** —
`router.js:5` sets `window.location.hash`, so the server never sees the route.

Measured today:

| URL | Production (Next.js) | This build |
|---|---|---|
| `/products` | **200** | **404** |
| `/about` | 404 | 404 |
| `/` | 200 | 200 |

`/products` is live, indexable, and would **404 after cutover**. A server-side
redirect cannot fix this: `https://solsticellp.com/#products` sends only `/` to
the server — **the fragment is never transmitted**, so no rewrite, redirect or
middleware can map an old path to a hash route. The mapping must happen in the
browser.

**Before cutover you must:**

1. Pull the full indexed URL list — Google Search Console → Pages → Indexed, and
   the current `sitemap.xml` (production returns **404** for it today, so GSC is
   the only source).
2. For every indexed path, decide: does an equivalent exist in the SPA?
3. Implement a client-side path→hash bridge (a snippet in `index.html` that
   reads `location.pathname` and rewrites to the hash equivalent before React
   mounts), **plus** a Vercel rewrite sending those paths to `/index.html` so
   they return 200 rather than 404.

Without this, every indexed URL except `/` loses its ranking. **Red gate.**

### 0.2 — Which Vercel project serves the domain?

There is no `.vercel/` directory in this repo and `vercel.json` declares no git
or build settings. The Next.js site is almost certainly a **different Vercel
project, from a different repository**, which this repo has no visibility into.

Establish, from the Vercel dashboard:

- Which project owns the `solsticellp.com` and `www.solsticellp.com` domains
- Which git repo and branch it deploys from
- Whether that repo is under your control or the client's previous developer's

Moving the domain means **detaching it from the Next.js project and attaching it
to this one**. That is a dashboard action, not a git push. **Red gate until
confirmed.**

### 0.3 — Production branch and auto-deploy behaviour

Unknowable from the repo. Determine in the dashboard:

- The Production Branch setting for **this** project (probably `master`)
- Whether "Auto-deploy on push" is on

This decides the whole sequencing:

| Auto-deploy | Cutover step 8 becomes | Rollback |
|---|---|---|
| **On** | `git push origin master` — deploys immediately, no confirmation | Instant Rollback in dashboard |
| **Off** | Push, then **Promote to Production** by hand | Same, plus you can stage silently first |

**Off is strongly preferable.** It lets you build and smoke-test the exact
production artefact before any user sees it. If it is currently on, turn it off
before 15 Aug.

### 0.4 — Content parity sign-off

The Next.js site's copy, imagery and page inventory are not in this repo. The
client must confirm the SPA is not *losing* content that exists today. Compare
page by page against the live site, not against staging.

---

# §1 Pre-flight gates — run Thursday 14 Aug

**Any red item means the cutover does not happen. This is not a judgement call
on the day** — an amber item at 22:00 on the 15th becomes a red item at 02:00,
and the client's site is the thing that suffers.

| # | Gate | Pass | Red if |
|---|---|---|---|
| 1.1 | All three VERIFY.md tiers passed on staging | Signed off in writing | Any Tier 3 item unverified |
| 1.2 | Upload durability re-tested (VERIFY 3.1) | 200 after `down && up -d` | 404 — media loss on every deploy |
| 1.3 | **SMTP verified from the VPS** | Real mail delivered | See below |
| 1.4 | Firewall closed | 8000/8080 unreachable externally | Still open |
| 1.5 | Backup taken **and test-restored** | Restore verified into a scratch DB | Backup exists but was never restored |
| 1.6 | Client sign-off on staging content | Written | Verbal or absent |
| 1.7 | Headroom with both stacks sized | ≥3GB RAM, ≥20GB disk free | Below either |
| 1.8 | §0 gates all closed | All four | Any open |

### 1.3 — SMTP. Close this gate by 12 Aug at the latest.

> **Outbound port 25 is blocked by default on virtually every cloud VPS,
> Hostinger included.** Local testing used Mailpit, which accepts everything and
> proves nothing about real delivery.
>
> Discovering this on the 15th is a **same-day failure with no quick fix** —
> unblocking 25 requires a support ticket with a turnaround measured in days, and
> switching providers requires DNS records (SPF/DKIM) that need their own
> propagation time.

Use a submission port (`587` STARTTLS or `465` implicit TLS) with an
authenticated relay, never port 25 directly.

```bash
docker compose exec api node -e "
const n=require('nodemailer');
n.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT,
  secure:+process.env.SMTP_PORT===465,
  auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
 .sendMail({from:process.env.SMTP_FROM,to:process.env.NOTIFY_EMAIL,
   subject:'Solstice preflight '+new Date().toISOString(),
   text:'If this arrives, SMTP works from the VPS.'})
 .then(i=>console.log('OK',i.messageId)).catch(e=>{console.error('FAIL',e.message);process.exit(1)})"
```

**Pass** = the mail is in the inbox (check spam; if it landed there, SPF/DKIM
are missing and that is its own amber item). `ETIMEDOUT` = port blocked.

### 1.4 — Firewall

The box currently has **no firewall rules**, which leaves Coolify's login (8000)
and Traefik's dashboard (8080) publicly reachable.

```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status numbered
```

**Verify from a machine that is not the VPS** — a local `curl` to 8080 succeeds
regardless of ufw:

```bash
curl -s --max-time 8 -o /dev/null -w '%{http_code}\n' http://69.62.85.208:8000   # expect timeout
curl -s --max-time 8 -o /dev/null -w '%{http_code}\n' http://69.62.85.208:8080   # expect timeout
```

Confirm SSH from a second terminal **before closing the first** — locking
yourself out on the eve of cutover is a self-inflicted red gate.

### 1.5 — Backup, restored not merely taken

An untested backup is not a backup.

```bash
cd /opt/solstice
docker compose exec -T db pg_dump -U solstice -d solstice --clean --if-exists \
  | gzip > ~/preflight-db.sql.gz
docker run --rm -v solstice_uploads:/d:ro -v ~:/b alpine \
  tar czf /b/preflight-uploads.tar.gz -C /d .

# Prove the dump restores — into a scratch database, never the live one
docker compose exec -T db psql -U solstice -d postgres -c 'CREATE DATABASE restoretest;'
gunzip -c ~/preflight-db.sql.gz | docker compose exec -T db psql -U solstice -d restoretest
docker compose exec -T db psql -U solstice -d restoretest -c \
  'SELECT (SELECT count(*) FROM products) p, (SELECT count(*) FROM admins) a;'
docker compose exec -T db psql -U solstice -d postgres -c 'DROP DATABASE restoretest;'
```

**Pass** = counts match live. Copy both files **off the VPS** — a backup that
only exists on the machine it protects is not a backup.

---

# §2 Production environment deltas

Do **not** copy `.env` from staging and edit the hostnames. That is precisely
how a staging secret reaches production. Write a fresh file.

| Variable | Staging | Production | Why it differs |
|---|---|---|---|
| Router host (API) | `test-api.solsticellp.com` | `api.solsticellp.com` | Record does not exist yet — §3.1 |
| Router host (web) | `test.solsticellp.com` | *(none — Vercel serves it)* | Only the API moves to the VPS |
| `CORS_ORIGIN` | `https://test.solsticellp.com,...` | `https://solsticellp.com,https://www.solsticellp.com` | **Both** apex and www — production 307s apex→www, and the browser sends the origin it is on |
| `JWT_SECRET` | staging value | **freshly generated** | See below |
| `POSTGRES_PASSWORD` | staging value | **freshly generated** | See below |
| `ADMIN_SEED_EMAIL` | test address | client's real address | — |
| `ADMIN_SEED_PASSWORD` | test value | throwaway, rotated immediately | See below |
| `NOTIFY_EMAIL` | your inbox | client's enquiry inbox | Real leads land here |
| Compose project name | `solstice` | `solstice-prod` | Keeps volumes and containers distinct |
| `robots.txt` / `X-Robots-Tag` | **present** | **absent** | See §2.3 |

### 2.1 Why secrets are never reused

Staging secrets are handled loosely by design — they are pasted into terminals,
sit in shell history, and are shared with anyone testing. Reusing them means a
staging compromise is a **production data breach**, and the blast radius of
`JWT_SECRET` is total: it signs admin sessions, so anyone holding it can mint a
valid admin token for the production CMS without a password.

```bash
openssl rand -hex 48                       # JWT_SECRET
openssl rand -base64 24 | tr -d '/@:?#'    # POSTGRES_PASSWORD
```

The `tr` strips characters that change the meaning of a Postgres connection URL.

### 2.2 The admin password belongs to the client, not the deploy

`ADMIN_SEED_PASSWORD` exists only to create the first row. It lives in a file on
the VPS and in your shell history — it is **not** a credential the client should
keep using.

Sequence: seed with a throwaway → hand it to the client over a secure channel →
**client logs in and changes it the same day** → confirm changed before you
consider cutover complete. After the first seed the value is inert: the seed
finds an existing admin and leaves it untouched.

### 2.3 robots.txt cannot leak from staging to production

Two independent mechanisms, and neither can cross over:

- **Staging** gets `Disallow: /` from `deploy/robots.staging.txt`, copied into
  the **nginx image only** by `deploy/web.Dockerfile`. Production is served by
  Vercel, which never builds that Dockerfile.
- The `X-Robots-Tag: noindex` header comes from a **Traefik label** on the
  staging `web` container. Vercel is not behind Traefik.

The file is deliberately **not** in `public/` — everything there ships to every
Vite build, including Vercel's.

**Verify after cutover regardless** (§5.4). A `noindex` on the client's live
domain is the single most expensive mistake available here.

### 2.4 Run production **alongside** staging — recommendation

**Keep both up.** Cost is ~1.2–2GB RAM on a box with ~6GB free.

- When production misbehaves, a known-good environment differing only in config
  is the fastest diagnostic you have. Tearing staging down removes it exactly
  when you need it most.
- Staging remains the place to reproduce a bug without touching client data.
- Teardown is a one-line command available any time; rebuilding under pressure
  at 01:00 is not.

Requirements: distinct compose project names (`solstice-prod` vs
`solstice`, giving distinct volumes), distinct Traefik router names
(`solstice-prod-*`), distinct database credentials. Tear staging down after
**48 hours stable** (§5.6).

---

# §3 Cutover sequence

Every step verifies before the next runs. Times are realistic including
verification.

### Step 1 — Lower DNS TTLs (do this **48h before**, 13 Aug) · 5 min

Set TTL to **300s** on `solsticellp.com` and `www.solsticellp.com` **before**
cutover day. TTL changes only take effect after the *old* TTL expires, so doing
this on the day gives you nothing — you would still be waiting out the old value
during a rollback.

```bash
dig +noall +answer solsticellp.com www.solsticellp.com
```
**Verify:** TTL reads 300. **Do not proceed on the 15th if it does not.**

### Step 2 — Create `api.solsticellp.com` · 10 min + propagation

A record → `69.62.85.208`, TTL 300. Additive and invisible to users.

```bash
dig +short api.solsticellp.com @1.1.1.1     # expect 69.62.85.208
dig +short api.solsticellp.com @8.8.8.8     # expect 69.62.85.208
```
**Verify:** both resolvers agree. **Do not proceed until they do** — Let's
Encrypt will query public resolvers, not yours.

### Step 3 — Bring up the production stack · 15 min

```bash
mkdir -p /opt/solstice-prod && cd /opt/solstice-prod
git clone https://github.com/hardipsinhg99/solstice.git .
git checkout feat/admin-cms-phase1
cp .env.example .env      # then fill with §2 PRODUCTION values
chmod 600 .env
```

Edit `docker-compose.yml`: `name: solstice-prod`, router names `solstice-prod-*`,
API host `api.solsticellp.com`. **Remove the `web` service** — Vercel serves the
frontend; running a second copy on the VPS creates a duplicate indexable site.

```bash
docker compose build && docker compose up -d
docker compose ps
```
**Verify:** `db` and `api` healthy. Staging and a2ztrading untouched
(`docker ps` uptimes unchanged).

### Step 4 — SSL for `api.solsticellp.com` · 5 min

```bash
echo | openssl s_client -connect api.solsticellp.com:443 \
  -servername api.solsticellp.com 2>/dev/null | openssl x509 -noout -issuer -dates
```
**Verify:** Let's Encrypt issuer, ~90 days. **Do not proceed on a default cert** —
Vercel's rewrite will refuse an invalid upstream certificate.

### Step 5 — Migrations and seed · 10 min

Migrations run automatically at container start. Then, once:

```bash
docker compose --profile seed run --rm seed
docker compose exec db psql -U solstice -d solstice -c '
SELECT (SELECT count(*) FROM admins) admins, (SELECT count(*) FROM products) products,
       (SELECT count(*) FROM pages) pages, (SELECT count(*) FROM team_members) team;'
```
**Verify:** `admins=1, products=8, pages=4, team=3`, and six rows in
`_prisma_migrations` with non-null `finished_at`.

### Step 6 — Verify the production API directly · 10 min

**The last moment the old site is still safely serving.** Nothing user-visible
has changed yet.

```bash
curl -s  https://api.solsticellp.com/api/settings | head -c 200; echo
curl -s  https://api.solsticellp.com/api/products | python3 -m json.tool | head -20
curl -sI https://api.solsticellp.com/api/products | head -1        # 200
curl -s  -X POST https://api.solsticellp.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"CLIENT@EMAIL","password":"SEEDPASS"}' | head -c 120; echo
```
**Verify:** settings JSON, 8 products, and a login returning a token.
**If any fail, stop. Nothing is broken yet and there is nothing to roll back.**

### Step 7 — Move the domain to this Vercel project · 15 min

Per §0.2. In the Vercel dashboard: remove `solsticellp.com` and
`www.solsticellp.com` from the Next.js project, add them to this one.

**Verify:** the domain shows Valid Configuration. Expect a brief window where
the domain resolves to neither — schedule this in the lowest-traffic hour.

### Step 8 — Deploy the frontend · 10 min ⚠️ **POINT OF NO RETURN**

```bash
cd /home/jadeja/Videos/solstice
git checkout master && git merge --no-ff feat/admin-cms-phase1
git push origin master
```

If auto-deploy is **off** (as §0.3 recommends), the build runs but does not go
live — **smoke-test the preview URL first**, then click **Promote to
Production**. Promotion is the irreversible step, not the push.

> ### ⚠️ Point of no return
>
> **Before Step 8**, everything is additive: a new DNS record, new containers, a
> new certificate. Users see the old Next.js site throughout. Aborting costs
> nothing and no one notices.
>
> **After Step 8**, the client's live business domain serves the new SPA.
> Rollback is now **user-visible** — fast (~2 min via Instant Rollback) but not
> silent.
>
> **The genuinely irreversible moment comes later**: the first time the client
> edits content in the production CMS. From then on, a database rollback
> destroys their work (§4.5). Until they log in and edit, rollback is clean.

### Step 9 — End-to-end verification · 20 min

```bash
curl -sI https://www.solsticellp.com | head -1                      # 200
curl -s  https://www.solsticellp.com/api/products | head -c 120     # JSON, not HTML
curl -sI https://www.solsticellp.com | grep -i x-robots             # expect NOTHING
curl -s  https://www.solsticellp.com/robots.txt | head -3           # must NOT be Disallow: /
curl -sI https://solsticellp.com | head -1                          # 307 → www
```

In a browser: homepage renders · products list populated · a product detail page
· submit a real enquiry and confirm it lands in the admin **and** sends mail ·
log into `#admin` over HTTPS · check the §0.1 path bridge on `/products`.

**Total elapsed, steps 2–9: ~1h 40m.** Budget three hours.

---

# §4 Rollback

**Read this section before starting the cutover, not during.**

Rollback is faster than cutover: **~2 minutes** versus ~100. If in doubt, roll
back. You can always try again next week; you cannot un-lose a day of the
client's leads.

### 4.1 Triggers — abort vs fix forward

**ABORT immediately** (do not debug on the live site):

- Homepage does not render, or renders unstyled
- Product pages blank or showing the catalogue error state
- `/api/*` returning HTML or 5xx from the live domain
- Admin login failing with correct credentials
- Any `noindex` header or `Disallow: /` on the live domain
- SSL warning on `solsticellp.com` or `www`
- **More than 10 minutes spent diagnosing** — the clock is the trigger, not your
  confidence

**Fix forward** (site is serving, defect is contained):

- One product's image missing
- Enquiry mail not sending **but** enquiries persisting
- A typo, spacing or single broken link
- Slow first paint

The distinguishing question: *can a buyer still find products and send an
enquiry?* No → abort. Yes → fix forward.

### 4.2 Vercel Instant Rollback — **the fastest lever, try this first** · ~2 min

Dashboard → project → **Deployments** → the last known-good deployment →
**⋯ → Instant Rollback** (or **Promote to Production**).

No rebuild — Vercel re-points the alias at an existing artefact. Live within
~30s of confirming, plus CDN propagation.

```bash
curl -sI https://www.solsticellp.com | head -1
curl -s  https://www.solsticellp.com | grep -oE '/_next/static|/assets/index-[A-Za-z0-9_-]+\.js' | head -2
```
**Verify:** `_next` references are back — you are on the Next.js build again.

> If the domain was moved between projects in Step 7, rollback means **moving
> the domain back** to the Next.js project, not just rolling back a deployment.
> That is a dashboard action taking ~5 min plus propagation. **Note the exact
> previous configuration before Step 7 — screenshot it.**

### 4.3 DNS rollback — only if the `api` record itself is at fault

Rarely needed: `api.solsticellp.com` is additive, so deleting it fixes nothing
that rolling back the frontend does not fix faster. **Do 4.2 first.**

If the record is genuinely wrong (typo, wrong IP), correct it and wait out the
TTL — **300s if Step 1 was done**, otherwise up to the old TTL, commonly 1–24h.
This is precisely why Step 1 happens 48 hours early.

DNS is the slowest lever available. Never reach for it first.

### 4.4 Database rollback · ~10 min

Only if the production database is corrupt or a migration destroyed data. **Not
needed for a frontend problem.**

```bash
cd /opt/solstice-prod
docker compose stop api                    # stop writes first
gunzip -c ~/preflight-db.sql.gz | docker compose exec -T db psql -U solstice -d solstice
docker run --rm -v solstice-prod_uploads:/d -v ~:/b alpine \
  sh -c "rm -rf /d/* && tar xzf /b/preflight-uploads.tar.gz -C /d"
docker compose start api
```
**Lost:** every change since the backup — enquiries submitted, content edited,
images uploaded.

### 4.5 ⚠️ What rollback CANNOT recover

> **Anything the client edited in the production CMS after cutover.**
>
> Vercel rollback restores the *frontend*. It does not touch the database. A
> database rollback restores content but destroys everything since the backup.
> There is no path that keeps both.
>
> **This is why the decision window is short.** If the client starts editing at
> 10:00 and you roll back the database at 16:00, six hours of their work is
> gone — and they will reasonably expect it not to be.
>
> **Therefore: do not give the client CMS access until the site has been stable
> for at least 24 hours.** Until then, rollback is clean and costs nothing but
> enquiries — which the API also emails, so they are not truly lost.

### 4.6 Rollback verification — confirm it worked

Do not assume. Work down the list:

```bash
curl -sI https://www.solsticellp.com | head -1                    # 200
curl -s  https://www.solsticellp.com | grep -c '_next'            # >0 → old site restored
curl -sI https://solsticellp.com | head -1                        # 307 → www
curl -s  https://www.solsticellp.com/products -o /dev/null -w '%{http_code}\n'  # 200
```

Then, **in a browser with a hard reload** (Ctrl-Shift-R — your own cache will
lie to you): homepage renders · `/products` loads · no SSL warning · no console
errors. Check from a phone on mobile data too, bypassing your DNS cache entirely.

Only when all pass: tell the client the site is restored, and say plainly what
changed and what did not.

---

# §5 Post-cutover — first 48 hours

### 5.1 What to watch, and where

```bash
cd /opt/solstice-prod
docker compose logs -f api | grep -iE 'error|warn|exception'   # first hour, live
docker compose ps                                              # both healthy
docker stats --no-stream
free -h && df -h /
docker ps --format '{{.Names}}\t{{.Status}}' | grep -Ei 'a2z|coolify'
```

Check at **+1h, +6h, +24h, +48h**. Watch for: API restart count climbing (memory
pressure), disk growth from uploads, and any change in the a2ztrading containers.

### 5.2 First real enquiry, end to end

Do not wait for a real buyer. Submit one yourself within the first hour and
confirm **all three**: the row appears in the admin, the notification arrives in
`NOTIFY_EMAIL`, and the reply-to is the enquirer's address.

Then confirm the **first genuine** enquiry the same way. If notifications fail,
the enquiry is still in the database — check the admin daily until fixed.

### 5.3 Upload durability, in production

The staging test does not prove the production volume.

```bash
# upload an image via the admin, note its URL, then:
docker compose restart api
curl -sI https://api.solsticellp.com/api/uploads/<xx>/<uuid>.webp | head -1   # 200
docker compose down && docker compose up -d
curl -sI https://api.solsticellp.com/api/uploads/<xx>/<uuid>.webp | head -1   # 200
```
A 404 on the second means every image the client uploads dies at the next
deploy. **Fix before telling them the CMS is theirs.**

### 5.4 SEO — production must not carry noindex

```bash
curl -sI https://www.solsticellp.com | grep -i x-robots      # expect NOTHING
curl -s  https://www.solsticellp.com/robots.txt              # must NOT be Disallow: /
curl -s  https://www.solsticellp.com | grep -i 'name="robots"'
```

Then:

- Generate and deploy a `sitemap.xml` — production returns **404** for it today,
  so this is new work, and hash routes mean it can only list `/`
  unless §0.1's path bridge is in place
- Submit it in Google Search Console
- **Watch GSC Coverage daily for two weeks.** A spike in "Not found (404)" means
  §0.1 was incomplete and indexed URLs are dropping out
- Re-request indexing for the homepage

### 5.5 Raise DNS TTLs back

After **48 hours stable**, raise `solsticellp.com`, `www` and `api` from 300s
back to 3600s. Low TTLs mean more resolver traffic and marginally slower lookups
for every visitor; they are a cutover tool, not a permanent setting.

Leave them at 300 if any §0 gate is still amber.

### 5.6 When to tear staging down

**Not before 48 hours stable**, and preferably not before the client has edited
content in production successfully. Per §2.4, staging is your only comparison
environment.

Keep permanently: `docker-compose.yml`, `.env` (offline, encrypted), `DEPLOY.md`,
`VERIFY.md`, this file, and the pre-flight backups.

```bash
cd /opt/solstice
docker compose down          # containers only — volumes survive
# only once you are certain, and after copying backups off the box:
docker compose down -v
```

**Never `docker system prune -a` or `docker volume prune` on this box** — both
are daemon-wide and would reach the a2ztrading project and your own production
volumes.
