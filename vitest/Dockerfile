# Test image for vitest:test / vitest:contract-test. Node + a current npm only:
# node_modules lives in the named volume vitest-node-modules and is kept in
# sync with package-lock.json by the compose command (a volume is seeded from
# the image once and never refreshed, so baking `npm ci` in here would leave
# the volume stale). The source is bind-mounted, so there is no `COPY . .`
# either - copying it would give every code edit a new image ID and leave the
# previous image behind as an untagged (<none>) image.
FROM node:22.23-slim

# Same npm pin and reason as apps/frontend/Dockerfile (the bundled npm trips
# on this project's dependency graph).
RUN npm install -g npm@11

WORKDIR /app
