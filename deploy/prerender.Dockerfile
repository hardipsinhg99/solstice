# One-shot prerenderer. Runs behind a compose profile, exactly like `seed`, and
# is never started by `docker compose up`.
#
# Alpine's own chromium package rather than the Chromium puppeteer downloads:
# the download is ~200 MB, needs glibc, and would have to be re-fetched on every
# image rebuild on a box with 5.2 GB free. `puppeteer-core` drives the system
# browser instead, the same arrangement docs/testing.md uses for the QA harness.
FROM node:20-alpine

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1

WORKDIR /app

# puppeteer-core is the only dependency and it is declared here, not in the
# site's package.json. It must never reach the public bundle's dependency graph.
RUN npm install --omit=dev puppeteer-core@23

COPY prerender/prerender.mjs ./prerender.mjs

# Unprivileged, and the same uid (1000) as the API, which writes rebuild
# requests into the shared state volume this job reads and updates. Both mount
# points exist in the image, owned by that uid, because a named volume takes
# its ownership from the first container to mount it - run as root the first
# time, this job used to leave the state directory unwritable by the API.
RUN mkdir -p /out /state && chown node:node /out /state
USER node

# No CMD-as-daemon. `docker compose --profile prerender run --rm prerender`
# runs it, it exits non-zero on failure, and a non-zero exit means the previous
# output is still live.
CMD ["node", "prerender.mjs"]
