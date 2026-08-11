# syntax=docker/dockerfile:1.7
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not server/.
# This is forced, not stylistic: prisma/seed.ts reads
#   resolve(__dirname, '../../src/data/products.js')
# i.e. the FRONTEND source tree. An image built from server/ alone can never
# seed the 8 products. The runtime stage still copies only server/ artefacts -
# nothing from the frontend reaches the production image; only the `seeder`
# stage takes that one data file.
#
# Node 22: server/package.json declares no `engines` field, so the version is
# taken from @types/node ^22.10.2 - the library the API is type-checked
# against - and NestJS 10 supports it. The author's machine runs Node 24, which
# is ahead of the declared types, so it is deliberately not the version pinned.
#
# bookworm-slim rather than alpine. Two production dependencies decide it:
# sharp (native libvips) and @prisma/client (native query engine). Both ship
# glibc prebuilds by default; on musl they need extra packages and, for Prisma,
# a matching openssl. Correctness at first boot is worth the ~80MB.
ARG NODE_VERSION=22.14.0

# --------------------------------------------------------------- builder ----
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /build

# The full dependency tree. @nestjs/cli, prisma and typescript are ALL
# devDependencies, and all three are required to produce dist/.
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci

COPY server/ ./

# Writes the client into node_modules/.prisma/client. That directory must be
# carried into the runtime stage - @prisma/client without it throws
# "@prisma/client did not initialize yet" on the first query.
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------- seeder ----
# Never started by `docker compose up` - it sits behind the `seed` profile and
# is invoked once by hand. It keeps the devDependencies because both seeds run
# through ts-node against the .ts sources.
#
# __dirname for prisma/seed.ts is /build/prisma, so '../../src/data/products.js'
# resolves to /src/data/products.js. That is why the copy target is absolute.
FROM builder AS seeder
WORKDIR /build
COPY src/data/products.js /src/data/products.js
CMD ["sh", "-c", "npm run seed && npm run seed:pages"]

# --------------------------------------------------------------- runtime ----
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini reaps zombies and forwards SIGTERM, so `docker compose down` stops the
# API cleanly instead of waiting out the 10s kill timeout.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# The Prisma CLI is a devDependency, but `migrate deploy` must run at every
# container start. Lifting the CLI and its engines across is far smaller than
# shipping the whole devDependency tree (typescript, @nestjs/cli, ts-node).
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/node_modules/prisma ./node_modules/prisma
COPY --from=builder /build/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /build/dist ./dist
COPY deploy/api-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# UPLOAD_DIR is read by BOTH LocalDiskStorageService and main.ts's
# useStaticAssets call. Absolute, so it never depends on the working directory,
# and it is the path the named volume mounts over.
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 3001

# There is no dedicated /health route. GET /api/settings is the substitute: it
# is the one public unguarded endpoint (the JwtAuthGuard sits on PATCH only)
# and it upserts its defaults, so it returns 200 even against a table that has
# never been written to. It therefore proves Nest is up AND Postgres is
# reachable, which a TCP probe would not.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/settings').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
