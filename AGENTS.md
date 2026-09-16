# AGENTS.md

Standard rules for how this repository is structured and developed. This is the single source of truth for both human and AI contributors — there is no separate `CLAUDE.md`.

This repo is a verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com) — the proven open-source technologies NASEBANAL builds on — not a scaffold for arbitrary technologies. When adding a module, it should verify or exercise a piece of that stack (or a tool used to verify it), not just be "some tool that seemed useful."

## Module layout (the Makefile calling convention)

- Each technology (kafka, consul, kong, apps, locust, ...) lives in its own top-level directory, each with its own `docker-compose.yml` and `Makefile`.
- The root `Makefile` `include`s every module's `Makefile` and exposes a hierarchical `make <module>:<action>` command (e.g. `make locust:up`, `make apps:down`).
- Running `make <module>` with no action prints that module's help (its subcommands and config options).
- To add a new module:
  1. Create `<module>/docker-compose.yml` and `<module>/Makefile`.
  2. In `<module>/Makefile`, define a `<module>:` target that prints help, and a catch-all rule `<module>\:%:` that forwards `make <module>:xxx` to `<module>-xxx` (see existing modules for the pattern).
  3. Add `include <module>/Makefile` to the root `Makefile` and one line to the `default` help listing.
- **Tool invocation goes through `docker compose` as a rule.** Don't call bare `docker run`/`docker build`. Even a one-shot test run (pytest/vitest/playwright/specmatic) uses `docker compose -f <module>/docker-compose.yml run --rm <service>`, with networking (`apps-network`, etc.) and volumes declared in the compose file. That keeps both long-running services and one-shot runs on the same pattern and the same `Makefile` shape.

## Configuration (.env)

- Settings shared across modules live in the repo root `.env`, copied from `.env.example`.
- Each module's `Makefile` also `include`s `../.env` itself, so `cd <module> && make <action>` works standalone.

## Port allocation (designed for running concurrently)

Every module's ports are chosen so it can run at the same time as any other module (no published host port collides with another). For example, `kong:up` and `kafka:up` can both be running while `apps:up` is also up, with no conflicts.

| Module | Service | Host port |
| --- | --- | --- |
| apps | mysql-server | 3306 |
| apps | backend (REST/GraphQL) | 8080 |
| apps | frontend | 5173 |
| kong | proxy (HTTP/HTTPS) | 8000 / 8443 |
| kong | admin API (HTTP/HTTPS) | 8001 / 8444 |
| kong | manager (HTTP/HTTPS) | 8002 / 8445 |
| kafka | broker | 9092 |
| kafka | controller | 9093 |
| locust | master UI | 8089 |
| locust | master-worker traffic | 5557 / 5558 |
| consul | HTTP API | 8500 |
| consul | DNS | 8600 |
| consul | server RPC | 8300 |
| microcks | UI / mock API | 9090 |

pytest, vitest, playwright and specmatic don't publish a port (they run once and don't leave anything listening), so they don't appear in this table.

When adding a new module, pick a port that isn't already in this table.

## Cross-module Docker network

When modules need to talk to each other (e.g. locust connecting to apps' MySQL/HTTP), they share a Docker network (e.g. `apps-network`).

- The network itself is created by an idempotent `docker network create <name> 2>/dev/null || true`, wrapped in a `<name>-ensure`-style Make target (e.g. `apps-network-ensure`), independent of which module's `docker compose up` actually runs.
- Every module's compose file that uses that network references it with `external: true` (no module "owns" it).
- Any `up` target that depends on that network calls the ensure target as a prerequisite first (e.g. `locust-up: apps-network-ensure`).
- This way, it doesn't matter which module starts first — or whether one of them is never started at all — the dependent module still works.

## Anonymous volumes go stale — recreate, don't restart

A service with a bind mount over its whole source dir (e.g. `apps/frontend`'s `./frontend:/app`) protects its dependency directory with an anonymous volume (`- /app/node_modules`), so the host's bind mount doesn't shadow what was `npm install`ed into the image. That volume is **not** tied to the image: after changing `package.json` (or `requirements.txt` for a Python service using the same pattern) and rebuilding, `docker restart <container>` reuses the *old* container/anonymous-volume content — the new dependency silently isn't there, and it looks like the rebuild didn't work. `apps-up` always runs `docker compose up -d --renew-anon-volumes`, so whenever compose *does* recreate a container (e.g. because `apps:build` changed its image), the anonymous volume is renewed along with it — this is a no-op when nothing changed, so it doesn't cost anything on a plain `apps:up`/`apps:restart`.

## apps module (the app under test)

- `apps/` holds the actual application under test. `make apps:up` / `make apps:down` manage its lifecycle independently from any test tool.
  - `apps/backend` — Python (FastAPI). REST + GraphQL (strawberry-graphql) over a minimal `items` resource (`id`, `name`, `quantity`, `source`, `createdAt`) stored in MySQL (`testdb`). Also mounts an MCP server at `/mcp` via `fastapi-mcp` (`FastApiMCP(app).mount_http()` in `app/main.py`), auto-generating MCP tools from the same REST routes — connect a local MCP client (e.g. Claude Desktop) to `http://localhost:8080/mcp`.
  - `apps/frontend` — TypeScript (Next.js App Router). `/` is a marketing-style landing page (branding matches nb-dentiscope's navbar/hero, logo/wordmark self-hosted — no `@nasebanal/shared-navigation` dependency, see below); logging in (a modal, not an inline field) navigates to the real `/items` route, which calls the backend's REST API directly from the browser. `/api-docs` renders the backend's live OpenAPI schema via Scalar (`@scalar/api-reference-react`, same library as nb-api-specs), pointed at the backend's own `/openapi.json` rather than a bundled spec file.
  - `mysql-server` — MySQL, data in the named volume `apps-db-data` (compose-prefixed to `apps_apps-db-data`, matching Kong's `kong_kong-db-data` "`<module>-db-data`" naming for consistency between the two). `apps:down`/`apps:restart` leave it alone, so registered items survive a normal restart; only `apps:reset` (`down --volumes` + `up`) wipes it for a genuinely clean demo state. Mirrors Kong's own `down`-preserves/`reset`-wipes split (see the Kong bullet under "Test/verification tool modules" below).
    - **One-time migration note**: before this, `mysql-server` had no declared volume at all, so MySQL wrote to a Docker-managed *anonymous* volume and `apps:down` always ran `--volumes` to avoid it going stale (see "Anonymous volumes" above) — which also meant every `apps:down`/`apps:restart` silently wiped MySQL data as a side effect. Anyone who already had `apps` running before this change will lose that old anonymous volume's data the first time they pick up the new compose file (the new named volume starts empty) — a one-time reset, not a recurring one. Since `apps`' MySQL only ever holds disposable demo/test data, this was judged an acceptable one-off cost.
- **Branding**: intentionally does not depend on `@nasebanal/shared-navigation` or `@nasebanal/api-specs` (both private GitHub Packages) — doing so would break this repo's public/OSS/air-gapped-friendly install story. The header/footer/theme/i18n are self-contained re-implementations matching their visual output, using a locally committed logo (`apps/frontend/public/logo.png`) instead of a package-supplied one.
- **OpenAPI**: the backend's OpenAPI schema is exported to `apps/backend/openapi.json` (regenerate with `make apps:export-openapi`). Specmatic and Microcks read this static file; the frontend's `/api-docs` page and the MCP mount both read the backend's *live* `/openapi.json` instead.
- **Kafka integration design**: the backend's read/write logic lives in `apps/backend/app/services/item_service.py`, and both the REST and GraphQL routers just call into it. When a future Kafka consumer is added (driven by `make kafka:up`) to register an `item` from an event, it's meant to call `register_item(db, data, source="kafka")` directly from that same module — that consumer isn't implemented yet.
- Test tools must read their target host **only from environment variables**, never hardcode a container name (e.g. `LOCUST_HTTP_HOST`, `LOCUST_MYSQL_HOST`). That lets the same test tool invocation:
  - test apps itself with `make apps:up` already running, or
  - test an external host (e.g. staging) without `apps:up` at all,
  just by changing where the env vars point.
- Conversely, whether apps is running has no bearing on whether an external host can be tested (pointing the env vars at an external URL works even while apps is up). The only real constraint is the other direction: apps itself can't be the target unless it's running.

## Test/verification tool modules

Test and verification tools are added as modules separate from `apps`. Which verb they use depends on their lifecycle:

- **Long-running services** (the `build`/`up`/`down`/`status`/`restart`/`open` pattern): Kong (gateway), Microcks (contract mock). These run `docker compose up -d`, so they follow the same convention as every other module.
  - Kong is joined to `apps-network` (in addition to its own `kong-net`) and `kong/conf/declarative.yml` declares a catch-all `apps_frontend` service/route (path `/`, `strip_path: false`), so `http://localhost:8000/` proxies straight through to the apps frontend out of the box — no manual "New Gateway Service" setup needed in Kong Manager. It needs `make apps:up` to actually resolve; Kong itself still starts fine without it. `/mock` and `/echo` (the httpbin examples) keep working since Kong matches routes by longest-prefix. In `KONG_DB=postgres` mode, changing `declarative.yml` requires `make kong:reset` to re-import — a plain `kong:up` on an already-bootstrapped DB skips the import (see `kong-up`'s "Existing database found" branch).
  - Consul is likewise joined to `apps-network` (in addition to its own `consul-net`), because Consul's own agent — not the caller — is what performs each service's HTTP/TCP health check, so it needs to resolve `backend`/`frontend`/`mysql-server` by container name. `make consul:register-apps` registers the real apps containers (`apps-backend` → `backend:8080` HTTP-checked against `/health`, `apps-frontend` → `frontend:5173` HTTP-checked with `Method: HEAD`, `apps-mysql` → `mysql-server:3306` TCP-checked); `consul:deregister-apps` removes them; `consul:discover-apps` prints Consul's own cached health status. `consul:verify-apps` goes a step further — it queries Consul for each service's address/port and then actually connects to exactly what was returned (from a throwaway container on `apps-network`, since the Makefile itself runs on the host and can't resolve those container names), proving the discover → connect flow really works instead of just trusting Consul's cached check result.
    - The frontend's check uses `Method: HEAD`, not the default GET: a GET against Next.js dev server's `/` streams back its entire React payload, and Consul stores an HTTP check's response body in the check's `Output` field — past Consul's size cap it truncates mid-escape-sequence, corrupting the JSON of every subsequent `/v1/health/service` query for that service. HEAD gets the same "is this actually a live HTTP server" signal with an empty body, so nothing to truncate.
    - The original generic `consul:register-service`/`register-db` samples (fake `127.0.0.1` addresses) were removed — their own health check always came up `critical` (`127.0.0.1` from inside the Consul container just points at itself), so they never actually demonstrated a working check. The apps-backed versions above replace them.
- **One-shot test runs** (a `test` verb, no `up`/`down`): pytest, vitest, playwright, specmatic. These run `docker compose run --rm <service>` and exit, so there's no "leave it running" concept.

Current breakdown:

| Module | Targets | Needs apps:up? | Notes |
| --- | --- | --- | --- |
| `pytest` | Unit tests for `apps/backend` | No | Swaps the DB for an in-memory SQLite database. Lives in `apps/backend/tests/`. |
| `vitest` | Unit tests for `apps/frontend` | No | Mocks `fetch` to test the logic in `api.ts`. |
| `playwright` | E2E browser tests against the running frontend | Yes | Uses the `data-testid` attributes in `apps/frontend` as selectors. |
| `specmatic` | Contract test of the running backend against `apps/backend/openapi.json` | Yes | `specmatic test openapi.json --host backend --port 8080` |
| `microcks` | Long-running mock server loaded from `apps/backend/openapi.json` | No (used as a stand-in for apps) | `make microcks:import-openapi` loads the schema. |

### Report files

pytest, vitest, playwright and specmatic each bind-mount a `report/` (and, for
specmatic, also a `junit/`) directory back onto the host, so every `make
<module>:test` run leaves a browsable HTML report behind without needing to
`docker cp` anything out of a stopped container:

| Module | Report file |
| --- | --- |
| `pytest` | `pytest/report/report.html` (`pytest-html`, self-contained) |
| `vitest` | `vitest/report/index.html` (Vitest's built-in `html` reporter) |
| `playwright` | `playwright/report/index.html` (Playwright's built-in `html` reporter) |
| `specmatic` | `specmatic/report/html/index.html`, plus `specmatic/junit/TEST-junit-jupiter.xml` |

These directories are gitignored — they're regenerated on every run, not
checked in.

`specmatic` needs one extra step: FastAPI's generated `openapi.json` declares
`"openapi": "3.1.0"`, but Specmatic v2.28.0 can't yet load a 3.1 document that
has a plain (non-`$ref`) integer path parameter (a known upstream gap,
[specmatic/specmatic#628](https://github.com/specmatic/specmatic/issues/628)).
`specmatic/docker-compose.yml` works around this by overriding the container
`entrypoint` to `sh` and running `jq '.openapi = "3.0.3"'` on a copy of the
spec before invoking `specmatic test` — the JSON Schema Specmatic actually
reads is a compatible subset either way, so only the version label changes.
This only affects Specmatic's own copy of the spec; the live `/openapi.json`
served by the backend (and the Scalar `/api-docs` page) is untouched.

Microcks and locust are excluded from this table on purpose: Microcks is a
long-running mock server with no natural "test run" to report on, and locust
already writes its own timestamped `locust/logs/<timestamp>/report.html` per
run (pre-existing, unrelated to this convention).

**Surfacing these in the `apps` frontend was considered and rejected for
now.** The reports are static HTML files owned by *other* modules, produced
by *other* containers, on a schedule the frontend has no visibility into (a
report is only fresh immediately after `make <module>:test` runs). Serving
them from Next.js would mean either (a) bind-mounting five other modules'
`report/` directories into the frontend container purely for static file
serving, which breaks the "each module owns its own compose file and
volumes" convention this repo otherwise follows strictly, or (b) building a
small file-index API to list/stream them, which is real product surface
area for what's fundamentally a `file://`-able local artifact. Since every
report is already a self-contained HTML file opened directly from disk (or
via a trivial `python3 -m http.server` in the relevant module directory),
the lower-effort/higher-value option is to just document the paths above
rather than add a cross-module serving layer.

## Git / operating rules

- **Pushing and opening PRs are fine; merging is not.** An AI agent working in this repo may run `git push` and open PRs (e.g. `gh pr create`) when the repository owner asks for it. Merging a PR — including via `gh pr merge` — is reserved for the repository owner; stop after opening it.
