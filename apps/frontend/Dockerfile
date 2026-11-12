FROM node:22.23-slim

WORKDIR /app

# The npm bundled with this base image has a dependency-resolution bug
# (npm error: Cannot read properties of null (reading 'edgesOut')) that
# trips on this project's dependency graph; a newer npm doesn't have it.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
# The stamp lets docker-compose.yml's command tell whether the named
# node_modules volume (seeded from this image once, never refreshed) is still
# in step with package-lock.json, and run `npm ci` itself if not.
RUN npm ci && sha256sum package-lock.json | cut -c1-64 > node_modules/.lock-hash

# No `COPY . .`: docker-compose.yml bind-mounts the source (./frontend:/app), so
# a copy is never used - and it would give every code edit a new image ID and
# leave the previous image behind as an untagged (<none>) image on each
# `apps:up`.

EXPOSE 5173

CMD ["npm", "run", "dev"]
