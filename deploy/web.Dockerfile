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

# Overwrites whatever the build produced. Kept outside public/ so the
# production Vercel build never sees it - see the file's own header.
COPY deploy/robots.staging.txt /usr/share/nginx/html/robots.txt

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/index.html || exit 1
