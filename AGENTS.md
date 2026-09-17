# AGENTS.md

Standard rules for how this repository is structured and developed. This is the single source of truth for both human and AI contributors — there is no separate `CLAUDE.md`.

This repo is a verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com) — the proven open-source technologies NASEBANAL builds on — not a scaffold for arbitrary technologies. When adding a module, it should verify or exercise a piece of that stack (or a tool used to verify it), not just be "some tool that seemed useful."

## Code comments are English

Source-code comments (Python/TypeScript `#`/`//`/docstrings, and comments inside `Makefile`s, `docker-compose.yml`s, shell scripts, etc.) are written in English, even though the person driving development communicates in Japanese. This keeps the codebase approachable to contributors who don't read Japanese. Some older files still have Japanese comments from before this rule was set — fix them to English when you're already touching that code, but there's no standing effort to sweep the whole repo at once. User-facing product text (the frontend's `ja` locale in `i18n.ts`, Japanese strings in a description users will read, etc.) is a different thing entirely and stays as-is; this rule is about comments aimed at future maintainers, not translatable UI copy.

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

A service with a bind mount over its whole source dir (e.g. `apps/frontend`'s `./frontend:/app`) protects its dependency directory with an anonymous volume (`- /app/node_modules`), so the host's bind mount doesn't shadow what was `npm install`ed into the image. That volume is **not** tied to the image: after changing `package.json` (or `requirements.txt` for a Python service using the same pattern), `apps-up` now always rebuilds the image (`docker compose up -d --build`), but the *running* container's anonymous volume still holds whatever was there before — the freshly-built image's new dependency is silently masked by the stale volume, and it looks like the rebuild didn't work.

This is normally fixed with `docker compose up -d --renew-anon-volumes` (`-V`), but **don't add `-V` to the routine `apps-up`**: it was tried here and found to force a full recreate of every container on *every single* `apps:up` call — even `mysql-server`, which has no anonymous volume at all — turning a ~1s no-op into 20-100+ seconds every time, regardless of whether anything changed (confirmed by isolating `-V` alone; `--build` alone stays fast). Instead, `apps:reset` (`down --volumes` + `up`) is the answer to "I changed a dependency and need a truly fresh container" — its `--volumes` removes the anonymous volume too, same as any other volume in the project.

## Persistent state and `reset` targets

`apps`, `kong`, `kafka`, and `consul` each store their data in a named Docker volume, so a plain `down`/`restart` preserves it, and each has its own `reset` target that wipes that volume and starts clean: `apps:reset` (`apps_apps-db-data` — MySQL), `kong:reset` (`kong_kong-db-data` — Postgres, `KONG_DB=postgres` mode; re-imports `kong/conf/declarative.yml`), `kafka:reset` (`kafka_kafka-data` — topics/messages), `consul:reset` (`consul_consul-data` + `consul_consul-config` — the service catalog). `microcks` and `locust` hold no persistent state at all (nothing to reset beyond a plain restart). `make all:reset` runs all four resets plus a restart for the other two.

**Kafka's volume was silently dead until fixed here**: the `apache/kafka` image's actual default `log.dirs` is `/tmp/kraft-combined-logs`, not `/var/lib/kafka/data` — so the declared `kafka-data` volume (mounted at `/var/lib/kafka/data`) never received any of Kafka's real data, and every container recreation silently lost all topics regardless of `down`'s `--volumes` flag. Fixed by setting `KAFKA_LOG_DIRS: /var/lib/kafka/data` in `kafka/docker-compose.yml` so Kafka actually writes where the volume is mounted (verified: created a topic, `kafka:down` → `kafka:up`, topic still listed). Before trusting any other module's "does X persist" claim, verify it directly (create something, cycle `down`/`up`, check it's still there) rather than inferring it from the compose file's volume declaration alone — a declared volume doesn't guarantee anything actually writes to that path.

## Kafka: reachable from other containers, and consumer groups actually work

Two more Kafka gotchas, both found the same way as the `log.dirs` one above — by actually exercising the behavior end-to-end, not by trusting the config file:

- **Cross-container clients need a second listener.** The Kafka wire protocol has clients reconnect to whatever address the broker *advertises*, not just the bootstrap address they first dialed. The original single-listener config advertised `localhost:9092`, which only resolves correctly for something on the host machine — a client in *another* container (`kafka-bridge`, Locust's `locustfile_kafka.py`) would bootstrap fine, then get told to reconnect to `localhost:9092` (itself) and fail. Fixed by adding a second listener, `PLAINTEXT_INTERNAL`, advertised as `kafka:29092` (the container-network hostname) — see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS`/`KAFKA_ADVERTISED_LISTENERS`/`KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`. `kafka` also had to join `apps-network` (in addition to its own `kafka-net`) for any of this to be reachable at all.
- **`offsets.topic.replication.factor` defaults to 3, which a 1-broker cluster can never satisfy.** Every *consumer group* (not plain produce/consume, which worked fine) needs the internal `__consumer_offsets` topic, and with the default replication factor it silently never gets created — every group-based consume then just hangs until it times out, reporting 0 messages, even though the data was produced and durably persisted correctly (confirmed by inspecting the log segment file on disk: real bytes, just unreadable by any consumer group). This affected `kafka-bridge`, and would equally have affected the pre-existing `kafka:consume-events`/`kafka:get-all-events`/`kafka:count-events` commands the whole time, undetected, since nothing had exercised group-based consumption before. Fixed with `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` (also in `.env`/`.env.example`).

## apps module (the app under test)

- `apps/` holds the actual application under test. `make apps:up` / `make apps:down` manage its lifecycle independently from any test tool.
  - `apps/backend` — Python (FastAPI). REST + GraphQL (strawberry-graphql) over a minimal, event-sourced `items` resource (`id`, `name`, `quantity`, `source`, `createdAt`) stored in MySQL (`testdb`): each row is one quantity-change *event* — `quantity` is a signed delta, not an absolute value — and a name's current balance is the sum of its events (`GET /items/balances` / GraphQL `balances`, backed by `item_service.get_balances`, a `GROUP BY name` `SUM`). This is a lightweight, practical form of event sourcing (an append-only ledger), not full CQRS with a dedicated event store — the right size for a demo, and it also gives `kafka-bridge` (see below) a natural mapping: one Kafka message → one new event row, via the same `POST /items` every other client uses. Also mounts an MCP server at `/mcp` via `fastapi-mcp` (`FastApiMCP(app).mount_http()` in `app/main.py`), auto-generating MCP tools from the same REST routes — connect a local MCP client (e.g. Claude Desktop) to `http://localhost:8080/mcp`.
  - `apps/frontend` — TypeScript (Next.js App Router). `/` is a marketing-style landing page (branding matches nb-dentiscope's navbar/hero, logo/wordmark self-hosted — no `@nasebanal/shared-navigation` dependency, see below); logging in (a modal, not an inline field) navigates to the real `/items` route, which calls the backend's REST API directly from the browser. Once logged in, the header shows a person-icon button (`UserMenu.tsx`, another self-contained re-implementation — this time of `nb-shared-navigation`'s `.nb-nav-user-*`/`.nb-nav-dropdown-*`) instead of a plain "Logout" link; clicking it opens a dropdown with the employee code and a red Logout row, and there's no separate "Logged in as" text on the page itself anymore. `/items` itself only ever shows the **Balances** table (`useBalances.ts`, `GET /items/balances` polled every 1s) — the raw per-event log used to also be rendered as a table there, but was deliberately removed: it's exactly the kind of thing a load test balloons into thousands of rows, whereas the balances table stays exactly one row per name regardless of event volume, cheaply re-rendering the same small table on every poll tick no matter how many events landed in between. The panel's own `<h1>` ("Items") is gone too, replaced by a short paragraph (`t.app.conceptDescription`) explaining the app's actual concept: a simple accounting ledger where a name is an account and each event is a signed transaction against it. The transaction-entry form's account field is a `<select>` populated from the current balances (an existing account, not typed free text) rather than an `<input>` — you can only post against an account that's already in the ledger through the UI; Kafka/Locust/MCP can still create a brand new account name by posting directly to the API, same as always. `/api-specs` renders the backend's live OpenAPI schema via Scalar (`@scalar/api-reference-react`, same library as nb-api-specs), pointed at the backend's own `/openapi.json` rather than a bundled spec file.
    - **UI language vs. code identifiers, deliberately different**: the frontend speaks "account"/"transaction" (i18n strings, headings, labels) because that's the domain this demo models, but the backend's Python/TypeScript identifiers, REST path (`/items`), and JSON field names stay as `Item`/`item` — renaming those would touch the Kafka bridge's message shape, Specmatic's contract, the MCP tool names, and every test in the repo, for a change that's purely cosmetic at the API layer. Don't be surprised the two don't match; it's not an oversight. The one exception is the MySQL table itself (`Item.__tablename__`): it's named `accounts`, not `items` — nothing outside the ORM references a table name literally (no raw SQL anywhere touches it, confirmed by checking `locust/bin/locustfile_mysql.py`'s direct MySQL queries, which only ever hit `information_schema`), so renaming just that one string was a zero-risk way to make the actual database line up with the domain, without the blast radius of renaming the class/route/MCP surface.
  - `mysql-server` — MySQL, data in the named volume `apps-db-data` (compose-prefixed to `apps_apps-db-data`, matching Kong's `kong_kong-db-data` "`<module>-db-data`" naming for consistency between the two). `apps:down`/`apps:restart` leave it alone, so registered items survive a normal restart; only `apps:reset` (`down --volumes` + `up`) wipes it for a genuinely clean demo state. Mirrors Kong's own `down`-preserves/`reset`-wipes split (see the Kong bullet under "Test/verification tool modules" below).
    - **One-time migration note**: before this, `mysql-server` had no declared volume at all, so MySQL wrote to a Docker-managed *anonymous* volume and `apps:down` always ran `--volumes` to avoid it going stale (see "Anonymous volumes" above) — which also meant every `apps:down`/`apps:restart` silently wiped MySQL data as a side effect. Anyone who already had `apps` running before this change will lose that old anonymous volume's data the first time they pick up the new compose file (the new named volume starts empty) — a one-time reset, not a recurring one. Since `apps`' MySQL only ever holds disposable demo/test data, this was judged an acceptable one-off cost.
    - **Another one-time migration note**: `Item.__tablename__` was renamed from `items` to `accounts` (see above). `Base.metadata.create_all()` (in `app/main.py`) only creates missing tables, so an existing local volume from before this change ends up with both an orphaned, now-unused `items` table and a fresh, empty `accounts` table on next `apps:up` — the old data isn't gone, just stranded. Run `make apps:reset` once to get a clean `accounts` table instead of carrying the dead `items` table around.
- **Branding**: intentionally does not depend on `@nasebanal/shared-navigation` or `@nasebanal/api-specs` (both private GitHub Packages) — doing so would break this repo's public/OSS/air-gapped-friendly install story. The header/footer/theme/i18n are self-contained re-implementations matching their visual output, using a locally committed logo (`apps/frontend/public/logo.png`) instead of a package-supplied one.
- **OpenAPI**: there is no checked-in schema file. `/api-specs`, the MCP mount, Specmatic, and `microcks:import-openapi` all fetch the backend's *live* `/openapi.json` at the point of use instead — this is a demo app with no real schema-change workflow to keep a separately-exported copy in sync with, so there's nothing to export and nothing to go stale. Specmatic and `microcks:import-openapi` both therefore require `make apps:up` first (Specmatic already did, for the actual test requests; `microcks:import-openapi` only needs apps up for that one fetch — once imported, Microcks serves the mock independently).
- **Kafka integration (`kafka-bridge`)**: `kafka/bridge/consumer.py`, a separate container (`make kafka:bridge-up`, deliberately *not* `kafka:up` — opt in explicitly, matching how every other cross-module integration in this repo works, e.g. `consul:register-apps`/`microcks:import-openapi` are also separate from that module's `up`). It consumes `KAFKA_TOPIC` (default `quickstart-events`) and calls `POST {KAFKA_BRIDGE_TARGET_URL}/items` (default `http://backend:8080`, but env-var-driven like every other test tool's target host — not hardcoded to apps) for each message. Deliberately lives here, not as in-process code inside `apps/backend`: apps/backend ends up with zero Kafka dependency, so a Kafka outage can only ever affect this container, never the backend itself. Resilience is load-bearing, not incidental: connecting to Kafka, logging into the backend, and POSTing each event are all infinite retry loops (never a crash), and a message's Kafka offset is committed only *after* a successful POST — so an unreachable backend pauses ingestion (Kafka durably retains the backlog) rather than losing events. Verified directly: stopped `apps:up`'s backend mid-stream, watched `kafka-bridge` retry without crashing, restarted the backend, watched the queued event get delivered with no data loss.
  - **Two different failure modes, on purpose**: a *transient* failure (Kafka or the backend temporarily unreachable, a request rejected) is retried forever, per the above. A *permanent* one — a message that isn't valid JSON, or is missing `name` — is logged and its offset committed anyway (skipped, not retried): retrying an unparseable message forever would just deadlock the whole pipeline behind it. This distinction wasn't theoretical: an early version used `KafkaConsumer`'s own `value_deserializer` and caught only `KafkaError`, so a single leftover non-conforming message from manual testing (`{"test": "message"}`, no `name` field) raised a bare `KeyError` that escaped every `except` clause, crashed the process, and `restart: unless-stopped` silently crash-looped it forever (visible only as a `(Re-)joining group` line repeating in the logs with no forward progress). Fixed by parsing explicitly in the loop body (not via `value_deserializer`) inside its own `try`/`except InvalidEvent`, so a bad message can't come from anywhere except that one call site.
  - **Why a bridge at all, and why Kafka in particular — the comparison demo**: `locust/bin/locustfile_http_overload.py` (hammers `POST /items` directly, no Kafka) vs `locust/bin/locustfile_kafka.py` (produces the same events onto the Kafka topic instead). Measured at 600 users / 60s against this repo's own default resource limits (`create_engine(...)` in `apps/backend/app/db.py` uses SQLAlchemy's default pool, single `uvicorn` worker, `--reload` mode): direct REST failed 79% of `POST /items` (500s, connection resets, up to 30s+ latency); the same load produced onto Kafka completed 1,241,297 events at 0% failure and ~24ms median produce latency, with `apps/backend`'s own `/health` staying at ~2ms throughout — because `kafka-bridge` drains the topic at its own steady, sequential pace, never forwarding a burst to the backend. That gap **is** the point of putting Kafka in front of a write path at all.
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
| `specmatic` | Contract test of the running backend against its live OpenAPI schema | Yes | `curl`s `http://backend:8080/openapi.json`, then `specmatic test openapi.json --host backend --port 8080` |
| `microcks` | Long-running mock server loaded from the backend's live OpenAPI schema | Only for `microcks:import-openapi` itself; not to keep serving the mock afterward | `make microcks:import-openapi` fetches `http://localhost:8080/openapi.json` and uploads it. |

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
`entrypoint` to `sh` and running `curl -sf http://backend:8080/openapi.json |
jq '.openapi = "3.0.3"'` before invoking `specmatic test` — the JSON Schema
Specmatic actually reads is a compatible subset either way, so only the
version label changes. This only affects Specmatic's own in-memory copy; the
live `/openapi.json` served by the backend (and the Scalar `/api-specs` page)
is untouched.

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
