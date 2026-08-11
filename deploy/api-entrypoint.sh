#!/bin/sh
# Container start order: migrations, then the app. Never the seed - see the
# "Seeding" section of DEPLOY.md for why that is a manual one-off.
set -e

echo "[entrypoint] prisma migrate deploy…"

# Invoked by path rather than through ./node_modules/.bin/prisma, because the
# .bin symlinks are not copied across from the builder stage.
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] migrations applied. Starting API on port ${PORT:-3001}."
exec "$@"
