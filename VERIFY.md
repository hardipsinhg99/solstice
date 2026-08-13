# Deploy-day verification — test.solsticellp.com

Work through this **in order** after `docker compose up -d --build`. Cheapest
checks first, so a broken proxy is caught before you spend twenty minutes on a
CRUD pass that was never going to work.

Run everything from `/opt/solstice` on the VPS unless stated otherwise.

Stop at the first ❌ and fix it before continuing — later tiers assume earlier
ones passed.

---

# Tier 1 — Infrastructure

Nothing about the application yet. If this tier fails, the app is irrelevant.

### 1.1 Our three containers are up and healthy

```bash
docker compose ps
```

**Expect** `db`, `api`, `web` — all `running`, all `(healthy)`. The `api`
healthcheck has a 45s `start_period`; give it a minute before judging.

**If not:** `docker compose logs api --tail 50`. A restart loop is almost always
migrations failing — see 2.1.

### 1.2 The other project is untouched — check this early

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -Ei 'a2z|coolify'
```

**Expect** every a2ztrading container and `coolify-proxy` still `Up`, with
uptimes predating your deploy (`Up 3 weeks`, not `Up 2 minutes`).

**If a restart time matches your deploy:** you have disturbed the live client
project. Most likely cause is a duplicate Traefik router name colliding with
theirs, or an OOM. Check `docker inspect <name> --format '{{.State.OOMKilled}}'`
and go straight to 3.6.

### 1.3 Postgres publishes no host port

```bash
docker compose port db 5432 2>&1          # expect: an error / no mapping
sudo ss -tlnp | grep ':5432'              # expect: no output
```

**Expect** no mapping and no listener. The database must be reachable only from
the internal Docker network.

**If a port appears:** a `ports:` key has been added to `db`. Remove it and
`docker compose up -d` — an internet-exposed Postgres with a password in `.env`
is a live incident.

### 1.4 SSL issued for both hostnames

```bash
for h in test.solsticellp.com test-api.solsticellp.com; do
  echo "--- $h"
  echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null \
    | openssl x509 -noout -issuer -dates
done
```

**Expect** `issuer=C=US, O=Let's Encrypt, CN=...` and `notAfter` roughly 90 days
out. Issuance normally completes 30–60s after the containers start.

Traefik's log on **success**:

```bash
docker logs coolify-proxy --tail 200 | grep -i acme
```
```
level=debug msg="Trying to challenge certificate for domain [test.solsticellp.com] found in HostSNI rule"
level=info  msg="Certificates obtained for domains [test.solsticellp.com]"
```

**Failure signatures:**

| Log line | Cause | Action |
|---|---|---|
| `too many certificates already issued` | Rate limit — 5 duplicate certs/week | **Stop restarting.** Each retry extends nothing but wastes the window. Check https://crt.sh/?q=solsticellp.com for when it clears. |
| `DNS problem: NXDOMAIN` | Record not propagated | `dig +short test.solsticellp.com @1.1.1.1` must return `69.62.85.208`. Wait, then `docker compose restart web api`. |
| `Timeout during connect` | HTTP-01 challenge can't reach :80 | `sudo ufw status` — 80/443 open. `sudo ss -tlnp \| grep ':80 '` should show only Traefik. |
| Nothing mentioning solstice | Router never matched | Entrypoint/resolver name drift — see DEPLOY.md *Before you start*. |

### 1.5 The same-origin API path works — the one that actually matters

The SPA calls relative `/api/...`, so **this** is the path it uses. Testing only
`test-api.solsticellp.com` would pass while the site stays broken.

```bash
curl -s https://test.solsticellp.com/api/settings | head -c 200; echo
curl -s https://test-api.solsticellp.com/api/settings | head -c 200; echo
```

**Expect** JSON from **both**.

**If the first returns HTML** (`<!doctype html>`): the `solstice-web-api` router
lost to `solstice-web`, so nginx answered instead of the API. This is the
failure mode that looks like a JSON parse error in the browser rather than a
404. Confirm the router exists:

```bash
docker logs coolify-proxy --tail 300 | grep solstice-web-api
```

Check the `priority=100` label is present on the `api` service.

### 1.6 HTTP redirects to HTTPS

```bash
curl -sI http://test.solsticellp.com | head -1        # expect 308
curl -sI http://test-api.solsticellp.com | head -1    # expect 308
```

**308, not 301** — Traefik's `redirectscheme` with `permanent=true` issues a
308 Permanent Redirect, which preserves the method and body. Measured on the
first real deploy.

**If 404:** the `-http` routers or the `solstice-*-https` middleware definitions
are missing.

---

# Tier 2 — Application

Dependency order: schema, then data, then auth, then behaviour.

### 2.1 All six migrations applied

```bash
docker compose logs api | grep -A3 "migrate deploy"
docker compose exec db psql -U solstice -d solstice \
  -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;'
```

**Expect** six rows, every one with a non-null `finished_at`:
`init_products`, `media_assets`, `settings_enquiries`, `gallery_images`,
`seed_gallery_from_static`, `pages_and_team`.

**If a row has `finished_at` NULL:** a migration failed partway. Do not re-run
blindly — read `logs_error` in that row first.

**If the API is restart-looping here:** usually `DATABASE_URL` with an
unescaped `@ : / ? #` in the password. Regenerate without those characters.

### 2.2 Seed — first run

```bash
docker compose --profile seed run --rm seed
```

**Expect**, roughly:
```
  admin: created you@example.com
  products: 8 records found in src/data/products.js
    seed  <slug> (export)   ... ×8
Seeding pages from the copy that is live today…
  team members: 3 (photographs deliberately not migrated)
```

**If it dies on `ENOENT ... src/data/products.js`:** the image was built with
`./server` as context instead of the repo root. Rebuild — see the header of
`server/Dockerfile`.

**If it throws `ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set`:** those
are blank in `.env`. Fill them and re-run; nothing was written.

### 2.3 Verify what actually landed

```bash
# Table names are the @@map values from schema.prisma (snake_case plural),
# not the Prisma model names. COLUMNS are the opposite - they keep Prisma's
# camelCase, so they need double quotes in psql: "createdAt", not created_at.
docker compose exec db psql -U solstice -d solstice -c '
SELECT (SELECT count(*) FROM admins)        AS admins,
       (SELECT count(*) FROM products)      AS products,
       (SELECT count(*) FROM pages)         AS pages,
       (SELECT count(*) FROM page_sections) AS sections,
       (SELECT count(*) FROM team_members)  AS team;'
```

**Expect** `admins=1`, `products=8`, `pages=4` (home, about, services, team),
`sections>0`, `team=3`.

Site settings are **not** seeded and should not be — `SettingsService` upserts
its defaults on first read, which 1.5 already triggered.

### 2.4 Seed is genuinely re-runnable — run it twice

Idempotency was established by reading the code, never by executing it. Prove it.

```bash
docker compose --profile seed run --rm seed
```

**Expect** exit 0, and output that skips rather than writes:
```
  admin: already present (you@example.com) - left untouched
    skip  <slug> (already present)   ... ×8
  team members: already present, left alone
```

Then re-run 2.3. **Every count must be identical.**

**If any count grew:** stop. A guard is not holding, and the manual-seed
decision in DEPLOY.md is now load-bearing — do not let anyone move the seed into
the container entrypoint.

### 2.5 Admin login over HTTPS

Browser 🠖 `https://test.solsticellp.com/#admin`, log in with
`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.

**Expect** the dashboard.

**If 401 with correct credentials:** the seed ran before `.env` had those values.
Re-run 2.2 — safe, per 2.4.

**If the request never leaves the page / a JSON parse error appears:** back to
1.5; the browser hit nginx instead of the API.

### 2.6 Full CRUD pass

Each of these writes through a different module. Do all six.

| # | Action | Expect | Most likely failure |
|---|---|---|---|
| a | Edit a product's name, save | Persists after reload; visible on `#products` | 401 🠖 token expired (`JWT_EXPIRES_IN`, default 12h) |
| b | Upload a product image | Renders immediately; URL is `/api/uploads/xx/<uuid>.<ext>` | 500 🠖 `sharp` failed; check `docker compose logs api` |
| c | Edit a page section, save **and publish** | Change appears on the public page | Published vs draft confusion — reload the public page, not the editor |
| d | Add a team member | Appears on `#team` | — |
| e | Change a setting (e.g. contact email) | Reflected in the footer | — |
| f | Submit the public enquiry form | Row appears under Enquiries in the admin | See 3.3 — the row must land even if email fails |

The enquiry DTO accepts exactly `name`, `email`, `phone`, `message` — `phone` is
required, and the ValidationPipe's `forbidNonWhitelisted` rejects anything else
(a `company` or `country` key returns 400, not a silent drop):

```bash
curl -s -X POST https://test.solsticellp.com/api/enquiries -H 'Content-Type: application/json' \
  -d '{"name":"Probe","email":"p@example.com","phone":"+91 90000 00000","message":"test"}'
# expect {"id":"...","received":true}
```

Item **f must succeed even with SMTP unconfigured.** Email is explicitly not
allowed to fail a submission; if it does, that is a bug, not a config issue.

---

# Tier 3 — The things that only break in production

### 3.1 Upload durability — the single most important check

This is the durability gap flagged when the storage layer was built. The named
volume is the fix; this proves it.

```bash
# Upload an image via the admin first, then note the URL:
curl -sI https://test.solsticellp.com/api/uploads/<xx>/<uuid>.webp | head -1   # 200

docker compose restart api
curl -sI https://test.solsticellp.com/api/uploads/<xx>/<uuid>.webp | head -1   # 200

docker compose down && docker compose up -d
curl -sI https://test.solsticellp.com/api/uploads/<xx>/<uuid>.webp | head -1   # 200
```

**Expect** `200` all three times. The third is the real test — `down` removes the
containers, so only a named volume survives it.

**If the third returns 404:** the volume is not mounted where `UPLOAD_DIR`
points. Both must be `/app/uploads`:

```bash
docker compose exec api sh -c 'echo $UPLOAD_DIR; ls -R /app/uploads | head'
docker volume inspect solstice_uploads
```

A 404 here means every image an admin uploads is lost on the next deploy. Do not
go live until it is 200.

### 3.2 Database durability

Same cycle, already half-done by 3.1.

```bash
docker compose down && docker compose up -d
# wait for healthy, then:
docker compose exec db psql -U solstice -d solstice -c 'SELECT count(*) FROM products;'
```

**Expect** `8` (or more, if you added any). Your 2.6a edit should still be there.

**If the table is empty or missing:** `pgdata` did not persist. `docker volume ls
| grep solstice` — if the volume is absent, someone ran `down -v`.

### 3.3 SMTP actually sends from the VPS

Local testing used Mailpit, which accepts everything. Real SMTP from a cloud VPS
is where this commonly breaks for the first time.

```bash
docker compose logs api | grep -i -E 'smtp|mail|nodemailer'
```

Submit an enquiry (2.6f) and watch for the send.

**Expect** a success log and the mail in `NOTIFY_EMAIL`'s inbox.

**If nothing arrives:**

| Symptom | Cause | Action |
|---|---|---|
| Boot warning that SMTP is unset | `SMTP_HOST` blank in `.env` | Expected if you deferred it. Enquiries still save. |
| `ETIMEDOUT` / `ECONNREFUSED` on :25 | Hostinger blocks outbound 25 — most cloud providers do | Use a submission port instead: `SMTP_PORT=587` (STARTTLS) or `465`. Do not fight port 25. |
| `EAUTH` / `535` | Bad credentials, or the provider needs an app-specific password | Regenerate at the provider. Gmail/Zoho require an app password, not the account password. |
| Sends, but never arrives | SPF/DKIM missing for the sending domain, so it is silently dropped | Check spam first, then add SPF/DKIM for whatever domain `SMTP_FROM` uses. |

Enquiries persisting is the hard requirement; email is a convenience. Confirm the
row exists in the admin regardless of outcome.

### 3.4 robots.txt and the noindex header on staging

```bash
curl -s  https://test.solsticellp.com/robots.txt          # expect: Disallow: /
curl -sI https://test.solsticellp.com | grep -i x-robots  # expect: noindex, nofollow, noarchive
curl -sI https://test-api.solsticellp.com/api/settings | grep -i x-robots
```

**Expect** `Disallow: /` and the header on both hosts.

**If the header is missing:** the `solstice-*-noindex` middleware is not attached
to that router. robots.txt alone is insufficient — it governs crawling, not
indexing, so a URL linked from elsewhere can still be indexed unfetched.

### 3.5 Production was not contaminated by the staging robots.txt

A `Disallow: /` reaching Vercel would deindex the real site. The staging file is
kept in `deploy/`, never `public/`, precisely because everything in `public/` is
copied into every build.

```bash
# On the VPS — must not exist in the repo:
ls public/robots.txt 2>&1        # expect: No such file or directory

# Against live production — must NOT be Disallow: /
curl -s https://solsticellp.com/robots.txt
curl -s https://solstice-teal.vercel.app/robots.txt
```

**Expect** no `public/robots.txt`, and production either 404s on robots.txt or
serves something permissive.

**If production serves `Disallow: /`:** remove it from `public/`, redeploy
immediately, and request reindexing in Google Search Console. Every hour it
stays live costs rankings.

### 3.6 Memory headroom with everything running

The box hosts a live client project. Confirm the new stack has not pushed it
close to the edge.

```bash
free -h
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'
```

**Expect** roughly: `db` ~150–300MB, `api` ~150–400MB (spikes during image
uploads — `sharp` decodes at full resolution), `web` ~10–20MB. Total new usage
under ~1GB idle, against ~6GB free. At least 3GB still available.

**If `api` sits near its 1g ceiling:** it will be OOM-killed mid-upload.

```bash
docker inspect solstice-api-1 --format '{{.State.OOMKilled}}'   # expect false
```

Raise the limit in `docker-compose.yml` only after confirming the box has room —
an OOM that reaches the a2ztrading containers is a client-facing outage, which is
why the limits exist at all.

---

## Sign-off

Go-live is gated on **1.5**, **2.4**, **3.1** and **3.5**. The rest can be
remediated after launch; those four cannot — they mean, respectively, a broken
catalogue, an unsafe bootstrap, permanent loss of uploaded media, and a
deindexed production site.
