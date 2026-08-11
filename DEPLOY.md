# Staging deploy — test.solsticellp.com

First production-shaped run of the admin CMS. Until now the API has only ever
run on the author's machine, against a database that already had data.

| | |
|---|---|
| Host | Hostinger VPS `69.62.85.208`, Ubuntu 24.04, 2 vCPU / 8GB / 100GB |
| Frontend | `https://test.solsticellp.com` |
| API | `https://test-api.solsticellp.com` **and** `https://test.solsticellp.com/api` |
| Admin | `https://test.solsticellp.com/#admin` |
| Proxy | Traefik v3.6, already running as `coolify-proxy` — **not installed or configured by this stack** |

**Production is untouched.** `solsticellp.com` still points at Vercel and nothing
here changes that. The live client project on this box (`a2ztrading.cloud`) shares
the same Traefik instance; this stack joins its network as a guest and publishes
no host ports at all.

---

## Before you start

Everything below runs as a normal user in the Docker group.

**Traefik naming — verified, no action needed.** The entrypoint and cert-resolver
names in `docker-compose.yml` were checked against the a2ztrading.cloud
containers already running on this box:

```
traefik.http.routers.http-0-<id>.entryPoints        = "http"
traefik.http.routers.https-0-<id>.entryPoints       = "https"
traefik.http.routers.https-0-<id>.tls.certresolver  = "letsencrypt"
```

Our labels use exactly these, so they are correct as written. If a future
Coolify upgrade renames them (some installs use `web`/`websecure`), every router
silently fails to bind and no certificate is ever requested — see *If Let's
Encrypt fails* for how to spot that and re-read the live names.

Also assumed present, and true today: the `coolify` Docker network, and DNS for
`test.solsticellp.com` / `test-api.solsticellp.com` → `69.62.85.208`.

---

## 1. Get the code onto the VPS

```bash
ssh root@69.62.85.208
mkdir -p /opt/solstice && cd /opt/solstice

git clone https://github.com/hardipsinhg99/solstice.git .
git checkout feat/admin-cms-phase1
```

The branch matters — this work is not on `master`, and `master` deliberately
still has no backend.

## 2. Generate secrets and fill `.env`

```bash
cp .env.example .env

echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/@:?#')"
echo "JWT_SECRET=$(openssl rand -hex 48)"
```

Paste both into `.env`, then set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` —
together they become your admin login and nothing else reads them. Leave the
`SMTP_*` block blank for now; enquiries are still saved and still appear in the
admin without it.

The password is stripped of `/@:?#` because it is interpolated into a Postgres
connection URL, where those characters change the meaning of the string.

```bash
chmod 600 .env
```

`.env` is gitignored (verified: `.gitignore:6`). Never commit it.

## 3. First build and start

```bash
cd /opt/solstice
docker compose build          # ~4–6 min cold; sharp and Prisma engines dominate
docker compose up -d
```

The `seed` service will not start — it sits behind a profile. On start the API
container runs `prisma migrate deploy` and only then boots Nest, so the schema
is always ahead of the code that queries it.

```bash
docker compose ps             # db healthy, api healthy, web healthy
docker compose logs -f api
```

Expect, in order:

```
[entrypoint] prisma migrate deploy…
6 migrations found in prisma/migrations
Applying migration `20260809225802_init_products`
...
[entrypoint] migrations applied. Starting API on port 3001.
[Nest] LOG [NestApplication] Nest application successfully started
```

If SMTP is unset you will also see a warning about the mailer — that is expected
and by design.

## 4. Seed — one time, by hand

**This is not automatic.** See finding 3 below for the reasoning.

```bash
docker compose --profile seed run --rm seed
```

This runs both seeds in order and creates:

- the single admin, from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
- 8 products, from `src/data/products.js`
- page sections for Home, About, Services and Team
- 3 team members (no photographs — deliberately not migrated)

Both seeds are idempotent, so a repeat run is safe: it skips products whose slug
already exists, upserts page sections by slug, and leaves the admin and team
alone once present. Site settings are **not** seeded and do not need to be —
`SettingsService` upserts its own defaults on first read.

## 5. Verify

```bash
curl -sI https://test.solsticellp.com          | head -1   # 200
curl -s  https://test-api.solsticellp.com/api/settings      # JSON
curl -s  https://test.solsticellp.com/api/products | head -c 200   # JSON, not HTML
curl -s  https://test.solsticellp.com/robots.txt            # Disallow: /
curl -sI https://test.solsticellp.com | grep -i x-robots    # noindex, nofollow
curl -sI http://test.solsticellp.com  | head -1             # 301 to https
```

The third command is the important one. If it returns HTML starting with
`<!doctype html>`, the same-origin `/api` router is not matching and the
catalogue will fail — see *Troubleshooting*.

Then in a browser: open `https://test.solsticellp.com/#admin`, log in, and
upload an image to a product. Restart the API (`docker compose restart api`) and
confirm the image still loads — that proves the named volume, which is the whole
point of it.

### Verifying SSL

```bash
docker logs coolify-proxy --tail 100 | grep -iE 'solstice|acme|certificate'
echo | openssl s_client -connect test.solsticellp.com:443 -servername test.solsticellp.com 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

Issuer should be Let's Encrypt and `notAfter` ~90 days out. Certificates are
usually issued within 30–60 seconds of the container starting.

---

## If Let's Encrypt fails

The most likely first-deploy failure. Symptom: the browser shows
`TRAEFIK DEFAULT CERT` or an `ERR_CERT_AUTHORITY_INVALID` warning.

**Diagnose first — do not retry blindly.** Retrying into a rate limit extends it.

```bash
docker logs coolify-proxy --tail 200 | grep -i acme
```

| What the log says | Cause | Fix |
|---|---|---|
| `too many certificates already issued` | Rate limit: 5 duplicate certs per week, 50 per domain per week | **Wait.** The window is rolling; check https://crt.sh/?q=solsticellp.com to see when. Nothing you do on the box shortens it. |
| `DNS problem: NXDOMAIN` | Record not propagated to Let's Encrypt's resolvers | `dig +short test.solsticellp.com @1.1.1.1` — must return `69.62.85.208`. Wait, then `docker compose restart web api`. |
| `Timeout during connect` / `connection refused` | The HTTP-01 challenge cannot reach port 80 | `sudo ufw status` — 80 and 443 must be open. Confirm nothing else grabbed 80: `sudo ss -tlnp | grep ':80 '` should show only the Traefik container. |
| `unable to generate a certificate for the domains` with no ACME error | Router never matched, so no cert was ever requested | Entrypoint or resolver name mismatch — see below. |
| Nothing about solstice at all | Traefik is not seeing the containers | `docker inspect solstice-staging-web-1 --format '{{json .NetworkSettings.Networks}}'` must include `coolify`. |

**Name mismatch.** If Traefik's entrypoints are called something other than
`http`/`https` (some installs use `web`/`websecure`), every router silently fails
to bind. Check what the existing project uses and copy it exactly:

```bash
docker inspect $(docker ps --filter name=a2z -q | head -1) \
  --format '{{range $k,$v := .Config.Labels}}{{if (hasPrefix $k "traefik")}}{{$k}}={{$v}}{{println}}{{end}}{{end}}' \
  | grep -E 'entrypoints|certresolver'
```

Then edit the `entrypoints=` and `certresolver=` values in `docker-compose.yml`
and `docker compose up -d` to re-apply the labels. No rebuild needed — labels are
container metadata.

**While debugging, avoid the rate limit** by pointing at the staging CA if your
Traefik exposes one; otherwise simply stop restarting in a loop. Each restart
with a matching router is another issuance attempt.

---

## Troubleshooting

**Catalogue shows "temporarily unavailable"** — the SPA reached the site but not
the API. Check the same-origin router matched:

```bash
curl -s https://test.solsticellp.com/api/products | head -c 100
```

HTML means the `solstice-web-api` router lost to `solstice-web`. Confirm both
exist in Traefik's view (`docker logs coolify-proxy | grep solstice-web-api`) and
that the priority `100` label is present.

**Admin login returns 401 with correct credentials** — the seed never ran, or ran
before `.env` had the admin variables. Re-run step 4; it is safe.

**API restarts in a loop** — almost always migrations failing against the
database. `docker compose logs api | head -40`. If Postgres is not yet healthy
the `depends_on` condition should prevent this, so look for a `DATABASE_URL` with
an unescaped special character in the password.

**Uploads 404 after a rebuild** — the volume is not mounted where `UPLOAD_DIR`
points. Both must be `/app/uploads`. `docker compose exec api ls /app/uploads`.

---

## Backups

Both volumes matter, and for different reasons: `pgdata` holds all content,
`uploads` holds the only copy of every image an admin uploads. Neither is in git.

```bash
mkdir -p /opt/solstice-backups && cd /opt/solstice-backups

# Database — logical dump, restorable into any Postgres 16
docker compose -f /opt/solstice/docker-compose.yml exec -T db \
  pg_dump -U solstice -d solstice --clean --if-exists \
  | gzip > "db-$(date +%F-%H%M).sql.gz"

# Uploaded media — the volume as a tarball
docker run --rm \
  -v solstice-staging_uploads:/data:ro \
  -v /opt/solstice-backups:/backup \
  alpine tar czf "/backup/uploads-$(date +%F-%H%M).tar.gz" -C /data .
```

Restore:

```bash
gunzip -c db-2026-08-11-2100.sql.gz \
  | docker compose exec -T db psql -U solstice -d solstice

docker run --rm \
  -v solstice-staging_uploads:/data \
  -v /opt/solstice-backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads-2026-08-11-2100.tar.gz -C /data"
```

A dump taken while an admin is mid-upload can reference a file the tarball
missed. Take both back to back, and prefer a quiet moment.

---

## Redeploying after a code change

```bash
cd /opt/solstice
git pull
docker compose build
docker compose up -d
```

New migrations apply automatically on API start. Volumes are untouched by a
rebuild — that is exactly what named volumes buy you. The seed does not re-run
and does not need to.

---

## Production cutover — Vercel routing (go-live blocker, 15 Aug)

Production `solsticellp.com` is served by Vercel, which has no backend. The SPA
calls same-origin relative paths, so the moment production serves a build from
this branch, every `/api/*` request would 404 and the catalogue would show its
error state.

`vercel.json` solves it with a rewrite rather than a build-time API host:

```json
"rewrites": [
  { "source": "/api/:path*", "destination": "https://api.solsticellp.com/api/:path*" }
]
```

**The `/api` appears on both sides deliberately — do not "simplify" it.**
`main.ts` calls `setGlobalPrefix('api')` and every controller is declared bare
(`@Controller('products')`), so the API's real route is `/api/products`. Dropping
the prefix from the destination sends `/products`, which the API does not serve;
adding a second one sends `/api/api/products`. Traefik applies no
`stripprefix` middleware, so the VPS behaves identically — the same URL works
through either path.

Requests reach the browser as same-origin, so there is no preflight and no CORS
negotiation. There are no cookies to worry about either: the admin holds its JWT
in `sessionStorage` and sends it as an `Authorization: Bearer` header, which
Vercel forwards unchanged.

**Before the cutover:**

1. **Create the `api.solsticellp.com` A record → `69.62.85.208`.** It does not
   exist yet. `test.solsticellp.com` and `test-api.solsticellp.com` already do;
   this is the third and the rewrite target above depends on it.
2. Add `api.solsticellp.com` to the compose router rules (or stand up a separate
   production stack — do not point production at the staging containers).
3. Set the production `CORS_ORIGIN` to `https://solsticellp.com` — **not** the
   staging value. With the rewrite in place CORS is mostly moot, since requests
   arrive same-origin and never trigger a preflight. It still matters as defence
   in depth: it is what stops another site calling the API directly with a
   stolen token. `main.ts` refuses `*` by design.

To validate the rewrite before `api.solsticellp.com` exists, temporarily point
`destination` at `https://test-api.solsticellp.com/api/:path*` on a Vercel
preview deployment. Do not ship that value to production.

---

## Tearing down — without touching the other project

```bash
cd /opt/solstice
docker compose down                 # stops and removes THIS stack's containers
```

`docker compose down` is scoped to the `solstice-staging` project. It will not
touch `coolify-proxy`, the a2ztrading containers, or the `coolify` network —
that network is declared `external: true`, so compose removes the stack from it
rather than removing it.

To also destroy the data (**irreversible — take backups first**):

```bash
docker compose down -v
```

**Never run `docker system prune -a` or `docker volume prune` on this box.**
Both are daemon-wide and would reach the live client project.

