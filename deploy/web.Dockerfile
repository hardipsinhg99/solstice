# syntax=docker/dockerfile:1.7
#
# The marketing SPA, built once and served as static files. Build context is the
# repository root.
ARG NODE_VERSION=22.14.0

# --------------------------------------------------------------- builder ----
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# No build-time API configuration exists or is needed: every fetch in src/ is a
# same-origin relative path. The API is joined to this origin by Traefik at the
# edge, not by a baked-in base URL. See DEPLOY.md, finding 6.
RUN npm run build

# --------------------------------------------------------------- runtime ----
FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

# Bind this image to the prerendered HTML that matches it. The prerender job
# hashes the index.html it is served (the same bytes as this file) and files
# its output under that hash; nginx looks only under this image's own hash.
# A deploy with a new bundle therefore never serves HTML that points at
# /assets/ files the new image no longer has. See deploy/nginx.conf.
# The prerender volume's mount point, owned by uid 1000 (the prerender job's
# user). web starts first and mounts the volume first, so this directory is
# what decides the fresh volume's ownership. nginx only reads it.
RUN mkdir -p /usr/share/nginx/html/prerender && chown 1000:1000 /usr/share/nginx/html/prerender
RUN id=$(sha256sum /usr/share/nginx/html/index.html | cut -c1-16) \
 && sed -i "s/__SHELL_ID__/$id/g" /etc/nginx/conf.d/default.conf \
 && grep -q "shell-$id" /etc/nginx/conf.d/default.conf

# WHICH robots.txt this image gets is a build argument, defaulting to the
# staging one. That default is deliberate: a stack that forgets to set it gets
# Disallow, which is the safe direction to fail. Production passes
# deploy/robots.production.txt explicitly.
#
# Caught on the real cutover - production had been serving the staging
# Disallow: / , which would have deindexed the live site.
ARG ROBOTS_SRC=deploy/robots.staging.txt
COPY ${ROBOTS_SRC} /usr/share/nginx/html/robots.txt

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/index.html || exit 1
