/**
 * The app's route list and nginx's must agree.
 *
 * nginx decides what exists: a path it does not recognise is a 404 and never
 * reaches the app. So a route added to KNOWN_ROUTES but not to the nginx
 * regex is a page that works in development and 404s in production for every
 * visitor who types the URL or follows a link - and the reverse leaves nginx
 * serving the shell for a route the app answers with Not Found.
 *
 * Reads both files as text rather than importing them: the nginx config has no
 * JS representation, and the point is to compare what each file literally says.
 *
 *   node scripts/check-routes.mjs      # exits 1 on drift
 */
import { readFileSync } from 'node:fs'

const router = readFileSync(new URL('../src/app/router.js', import.meta.url), 'utf8')
const nginx = readFileSync(new URL('../deploy/nginx.conf', import.meta.url), 'utf8')

const known = [...(router.match(/KNOWN_ROUTES = new Set\(\[([^\]]*)\]/) ?? [])[1]
  .matchAll(/'([^']+)'/g)].map((m) => m[1])
const routeToPath = Object.fromEntries(
  [...(router.match(/ROUTE_TO_PATH = \{([^}]*)\}/) ?? [])[1].matchAll(/(\w+):\s*'([^']*)'/g)]
    .map((m) => [m[1], m[2]])
)
// What the app expects to be served the shell, as path segments.
const expected = known
  .map((r) => routeToPath[r] ?? `/${r}`)
  .filter((p) => p !== '/')
  .map((p) => p.slice(1))
  .sort()

const served = [...(nginx.match(/location ~ \^\/\(([^)]*)\)/) ?? [])[1].split('|')].sort()

const missing = expected.filter((p) => !served.includes(p))
const extra = served.filter((p) => !expected.includes(p))

if (missing.length || extra.length) {
  console.error('Route drift between src/app/router.js and deploy/nginx.conf:')
  if (missing.length) console.error(`  in the app, 404 in nginx: ${missing.join(', ')}`)
  if (extra.length) console.error(`  in nginx, not a route: ${extra.join(', ')}`)
  process.exit(1)
}
console.log(`routes agree (${served.length}): ${served.join(', ')} (+ / and /admin)`)
