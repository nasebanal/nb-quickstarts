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
| kafka | kafka-bridge health (`kafka:bridge-up`, `GET /health`) | 8090 |
| locust | master UI | 8089 |
| locust | master-worker traffic | 5557 / 5558 |
| consul | HTTP API | 8500 |
| consul | DNS | 8600 |
| consul | server RPC | 8300 |
| microcks | UI / mock API | 9090 |
| specmatic | stub (mock server, `specmatic:stub-up`) | 9091 |

pytest, vitest, playwright, and specmatic's own `specmatic:test` don't publish a port (they run once and don't leave anything listening), so they don't appear in this table - only `specmatic:stub-up` does, since that one's a long-running server.

When adding a new module, pick a port that isn't already in this table.

## Cross-module Docker network

When modules need to talk to each other (e.g. locust connecting to apps' MySQL/HTTP), they share a Docker network (e.g. `apps-network`).

- The network itself is created by an idempotent `docker network create <name> 2>/dev/null || true`, wrapped in a `<name>-ensure`-style Make target (e.g. `apps-network-ensure`), independent of which module's `docker compose up` actually runs.
- Every module's compose file that uses that network references it with `external: true` (no module "owns" it).
- Any `up` target that depends on that network calls the ensure target as a prerequisite first (e.g. `locust-up: apps-network-ensure`).
- This way, it doesn't matter which module starts first — or whether one of them is never started at all — the dependent module still works.

## A bind-mounted service's dependency directory needs its own volume

A service with a bind mount over its whole source dir (e.g. `apps/frontend`'s `./frontend:/app`) needs to protect its dependency directory (`node_modules`) from that bind mount, or the host's (likely absent, or stale) copy shadows what was `npm install`ed into the image. `apps/frontend`'s `docker-compose.yml` does this with a **named** volume, `frontend-node-modules:/app/node_modules` — it used to be an anonymous one (`- /app/node_modules`), changed after measuring a real, avoidable cost:

- **Why not anonymous**: an anonymous volume isn't addressable, so it can't be reattached to a new container object - every time the frontend *container itself* gets removed and recreated (any `apps:down` → `apps:up`, `apps:restart`, `apps:reset` - not just an ordinary `apps:up` with nothing to rebuild), Docker allocates a fresh one and populates it by copying the image's baked-in `node_modules` (656-788MB) into it from scratch, before the container can even start. Measured directly: an in-place `--force-recreate` (container object kept, volume reference reused) took 3.2s; removing the container first (what `apps:down` does) and recreating took 26.5s, with a fresh, differently-named anonymous volume confirmed via `docker inspect` each time. Old ones are never cleaned up either - 74 orphaned anonymous volumes had piled up in this environment by the time this was diagnosed.
- **The fix**: a named volume persists independently of the container's lifecycle, so `apps:restart` (`down` then `up`) now reuses the same populated volume instead of rebuilding it from scratch - confirmed via `docker inspect` (same volume name, `apps_frontend-node-modules`, both before and after) and by timing: 34s → 11-12s for a full `down`+`up` cycle, and that remainder is almost entirely the MySQL healthcheck wait, not a `node_modules` copy.
- **The staleness protection this used to rely on is unaffected**: `apps:reset`'s `down --volumes` removes named volumes exactly the same way it removed anonymous ones - confirmed by running it and checking the volume gets wiped and freshly repopulated, still serving correctly afterward. So "I changed `package.json`/`requirements.txt` and need a truly fresh container" still works exactly the same way; only the *routine* `apps:down`/`apps:restart`/`apps:reset` path (nothing actually changed) got cheaper.

This is a distinct problem from the one below - `-V` (`--renew-anon-volumes`) forces the *same* fresh-volume-and-copy cost on every single `apps:up` call regardless of whether the container was ever removed, which is why it's not used here either; the named volume above is what actually fixes the routine case, not `-V`.

**Still, don't add `-V` to the routine `apps-up`**: it was tried here and found to force a full recreate of every container on *every single* `apps:up` call — even `mysql-server`, which has no dependency-directory volume at all — turning a ~1s no-op into 20-100+ seconds every time, regardless of whether anything changed (confirmed by isolating `-V` alone; `--build` alone stays fast, since Docker's own build-layer cache already makes a no-op rebuild check cheap).

## Persistent state and `reset` targets

`apps`, `kong`, `kafka`, and `consul` each store their data in a named Docker volume, so a plain `down`/`restart` preserves it, and each has its own `reset` target that wipes that volume and starts clean: `apps:reset` (`apps_apps-db-data` — MySQL), `kong:reset` (`kong_kong-db-data` — Postgres, `KONG_DB=postgres` mode; re-imports `kong/conf/declarative.yml`), `kafka:reset` (`kafka_kafka-data` — topics/messages), `consul:reset` (`consul_consul-data` + `consul_consul-config` — the service catalog). `microcks` and `locust` hold no persistent state at all (nothing to reset beyond a plain restart). `make all:reset` runs all four resets plus a restart for the other two.

**Kafka's volume was silently dead until fixed here**: the `apache/kafka` image's actual default `log.dirs` is `/tmp/kraft-combined-logs`, not `/var/lib/kafka/data` — so the declared `kafka-data` volume (mounted at `/var/lib/kafka/data`) never received any of Kafka's real data, and every container recreation silently lost all topics regardless of `down`'s `--volumes` flag. Fixed by setting `KAFKA_LOG_DIRS: /var/lib/kafka/data` in `kafka/docker-compose.yml` so Kafka actually writes where the volume is mounted (verified: created a topic, `kafka:down` → `kafka:up`, topic still listed). Before trusting any other module's "does X persist" claim, verify it directly (create something, cycle `down`/`up`, check it's still there) rather than inferring it from the compose file's volume declaration alone — a declared volume doesn't guarantee anything actually writes to that path.

## Kafka: reachable from other containers, and consumer groups actually work

Two more Kafka gotchas, both found the same way as the `log.dirs` one above — by actually exercising the behavior end-to-end, not by trusting the config file:

- **Cross-container clients need a second listener.** The Kafka wire protocol has clients reconnect to whatever address the broker *advertises*, not just the bootstrap address they first dialed. The original single-listener config advertised `localhost:9092`, which only resolves correctly for something on the host machine — a client in *another* container (`kafka-bridge`, Locust's `locustfile_kafka.py`) would bootstrap fine, then get told to reconnect to `localhost:9092` (itself) and fail. Fixed by adding a second listener, `PLAINTEXT_INTERNAL`, advertised as `kafka:29092` (the container-network hostname) — see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS`/`KAFKA_ADVERTISED_LISTENERS`/`KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`. `kafka` also had to join `apps-network` (in addition to its own `kafka-net`) for any of this to be reachable at all.
- **`offsets.topic.replication.factor` defaults to 3, which a 1-broker cluster can never satisfy.** Every *consumer group* (not plain produce/consume, which worked fine) needs the internal `__consumer_offsets` topic, and with the default replication factor it silently never gets created — every group-based consume then just hangs until it times out, reporting 0 messages, even though the data was produced and durably persisted correctly (confirmed by inspecting the log segment file on disk: real bytes, just unreadable by any consumer group). This affected `kafka-bridge`, and would equally have affected the pre-existing `kafka:consume-events`/`kafka:get-all-events`/`kafka:count-events` commands the whole time, undetected, since nothing had exercised group-based consumption before. Fixed with `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` (also in `.env`/`.env.example`).

## apps module (the app under test)

- `apps/` holds the actual application under test. `make apps:up` / `make apps:down` manage its lifecycle independently from any test tool.
  - `apps/backend` — Python (FastAPI). REST + GraphQL (strawberry-graphql) over a minimal, event-sourced `accounts` resource (`id`, `name`, `quantity`, `source`, `createdAt`) stored in MySQL (`testdb`, table `accounts`): each row is one quantity-change *event* — `quantity` is a signed delta, not an absolute value — and a name's current balance is the sum of its events (`GET /accounts/balances` / GraphQL `balances`, backed by `account_service.get_balances`, a `GROUP BY name` `SUM`). This is a lightweight, practical form of event sourcing (an append-only ledger), not full CQRS with a dedicated event store — the right size for a demo, and it also gives `kafka-bridge` (see below) a natural mapping: one Kafka message → one new event row, via the same `POST /accounts` every other client uses. Also mounts an MCP server at `/mcp` via `fastapi-mcp` (`FastApiMCP(app).mount_http()` in `app/main.py`), auto-generating MCP tools from the same REST routes — connect a local MCP client (e.g. Claude Desktop) to `http://localhost:8080/mcp`.
  - `apps/frontend` — TypeScript (Next.js App Router). `/` is a marketing-style landing page (branding matches nb-dentiscope's navbar/hero, logo/wordmark self-hosted — no `@nasebanal/shared-navigation` dependency, see below); logging in (a modal, not an inline field) navigates to the real `/accounts` route, which calls the backend's REST API directly from the browser. Once logged in, the header shows a person-icon button (`UserMenu.tsx`, another self-contained re-implementation — this time of `nb-shared-navigation`'s `.nb-nav-user-*`/`.nb-nav-dropdown-*`) instead of a plain "Logout" link; clicking it opens a dropdown with the employee code and a red Logout row, and there's no separate "Logged in as" text on the page itself anymore. `/accounts` itself only ever shows the **Balances** table (`useBalances.ts`, `GET /accounts/balances` polled every 1s) — the raw per-event log used to also be rendered as a table there, but was deliberately removed: it's exactly the kind of thing a load test balloons into thousands of rows, whereas the balances table stays exactly one row per name regardless of event volume, cheaply re-rendering the same small table on every poll tick no matter how many events landed in between. The panel's own `<h1>` ("Items") is gone too, replaced by a short paragraph (`t.app.conceptDescription`) explaining the app's actual concept: a simple accounting ledger where a name is an account and each event is a signed transaction against it. The transaction-entry form's account field is a `<select>` populated from the current balances (an existing account, not typed free text) rather than an `<input>` — you can only post against an account that's already in the ledger through the UI; Kafka/Locust/MCP can still create a brand new account name by posting directly to the API, same as always. `/api-specs` renders the backend's live OpenAPI schema via Scalar (`@scalar/api-reference-react`, same library as nb-api-specs), pointed at the backend's own `/openapi.json` rather than a bundled spec file.
    - **UI language and code identifiers now match**: the frontend speaks "account"/"transaction" (i18n strings, headings, labels), and so does the backend — the REST path (`/accounts`), the MySQL table, the Python class (`Account`, `app/models.py`), the GraphQL type/query/mutation names (`AccountType`, `accounts`, `createAccount`), and the MCP tool names (auto-derived from the REST routes) all say `Account`/`account` too. This used to be a deliberate mismatch — code stayed `Item`/`item` while the UI said "account", to avoid touching the Kafka bridge's message shape, Specmatic's contract, and every test in the repo — but that tradeoff was revisited and the whole surface was renamed end-to-end instead. If you're reading old commit history or an old screenshot and see `Item`, that's why.
  - `mysql-server` — MySQL, data in the named volume `apps-db-data` (compose-prefixed to `apps_apps-db-data`, matching Kong's `kong_kong-db-data` "`<module>-db-data`" naming for consistency between the two). `apps:down`/`apps:restart` leave it alone, so registered accounts survive a normal restart; only `apps:reset` (`down --volumes` + `up`) wipes it for a genuinely clean demo state. Mirrors Kong's own `down`-preserves/`reset`-wipes split (see the Kong bullet under "Test/verification tool modules" below).
    - **One-time migration note**: before this, `mysql-server` had no declared volume at all, so MySQL wrote to a Docker-managed *anonymous* volume and `apps:down` always ran `--volumes` to avoid it going stale (see "A bind-mounted service's dependency directory needs its own volume" above) — which also meant every `apps:down`/`apps:restart` silently wiped MySQL data as a side effect. Anyone who already had `apps` running before this change will lose that old anonymous volume's data the first time they pick up the new compose file (the new named volume starts empty) — a one-time reset, not a recurring one. Since `apps`' MySQL only ever holds disposable demo/test data, this was judged an acceptable one-off cost.
    - **Another one-time migration note**: `Item`/`item`/`/items` was renamed to `Account`/`account`/`/accounts` across the whole backend (model, table, REST path, GraphQL, MCP tool names) - see above. `Base.metadata.create_all()` (in `app/main.py`) only creates missing tables, so an existing local volume from before this change ends up with both an orphaned, now-unused `items` table and a fresh, empty `accounts` table on next `apps:up` — the old data isn't gone, just stranded. Run `make apps:reset` once to get a clean `accounts` table instead of carrying the dead `items` table around.
- **Branding**: intentionally does not depend on `@nasebanal/shared-navigation` or `@nasebanal/api-specs` (both private GitHub Packages) — doing so would break this repo's public/OSS/air-gapped-friendly install story. The header/footer/theme/i18n are self-contained re-implementations matching their visual output, using a locally committed logo (`apps/frontend/public/logo.png`) instead of a package-supplied one.
- **OpenAPI: contract-first, not code-first.** `apps/backend/openapi.yaml` is the checked-in, hand-maintained source of truth for the REST API - `app/main.py` overrides `app.openapi` to load and serve this file verbatim at `GET /openapi.json`, instead of letting FastAPI derive a schema from its own routes/Pydantic models (FastAPI's normal behavior, and what this repo did before). `/api-specs`, the MCP mount, Specmatic, and `microcks:import-openapi` all still fetch that same live `/openapi.json` endpoint - none of them needed to change, since the endpoint's URL and shape are unchanged; only where its *content* comes from changed. Specmatic and `microcks:import-openapi` both still require `make apps:up` first (Specmatic already did, for the actual test requests; `microcks:import-openapi` only needs apps up for that one fetch - once imported, Microcks serves the mock independently).
  - **Why the reversal**: a schema generated *from* the implementation can never structurally disagree with it - Specmatic's provider verification (`specmatic:test`) against a code-first schema can only ever catch behavioral bugs (wrong status code, auth not enforced), never real contract drift, because the "contract" was never independent of the code being tested in the first place. A physically separate, hand-maintained file makes "does the implementation still honor this contract" a real, failable question - the actual point of Contract-Driven Development, where a Consumer (`apps/frontend`, `kafka-bridge`, an MCP client) and a Provider (`apps/backend`) both build against one shared file, independently.
  - **The tradeoff, accepted deliberately**: `openapi.yaml` can now drift from what `app/routers/*.py` and `app/schemas.py` actually do, if someone changes one and forgets the other - exactly the risk the old code-first approach existed to eliminate. Keeping the two in sync by hand is the ongoing cost of the contract meaning something; `specmatic:test` is what catches it when they diverge.
  - `openapi.yaml`'s own header comment explains why `/graphql` isn't described in it at all (GraphQL's request shape isn't OpenAPI-describable - same reasoning as the Specmatic section below) and how it maps onto `apps/backend`'s actual routes.
- **Kafka integration (`kafka-bridge`)**: `kafka/bridge/consumer.py`, a separate container (`make kafka:bridge-up`, deliberately *not* `kafka:up` — opt in explicitly, matching how every other cross-module integration in this repo works, e.g. `consul:register-apps`/`microcks:import-openapi` are also separate from that module's `up`). It consumes `KAFKA_TOPIC` (default `quickstart-events`) and calls `POST {KAFKA_BRIDGE_TARGET_URL}/accounts` (default `http://backend:8080`, but env-var-driven like every other test tool's target host — not hardcoded to apps) for each message. Deliberately lives here, not as in-process code inside `apps/backend`: apps/backend ends up with zero Kafka dependency, so a Kafka outage can only ever affect this container, never the backend itself. Resilience is load-bearing, not incidental: connecting to Kafka, logging into the backend, and POSTing each event are all infinite retry loops (never a crash), and a message's Kafka offset is committed only *after* a successful POST — so an unreachable backend pauses ingestion (Kafka durably retains the backlog) rather than losing events. Verified directly: stopped `apps:up`'s backend mid-stream, watched `kafka-bridge` retry without crashing, restarted the backend, watched the queued event get delivered with no data loss.
  - **Two different failure modes, on purpose**: a *transient* failure (Kafka or the backend temporarily unreachable, a request rejected) is retried forever, per the above. A *permanent* one — a message that isn't valid JSON, or is missing `name` — is logged and its offset committed anyway (skipped, not retried): retrying an unparseable message forever would just deadlock the whole pipeline behind it. This distinction wasn't theoretical: an early version used `KafkaConsumer`'s own `value_deserializer` and caught only `KafkaError`, so a single leftover non-conforming message from manual testing (`{"test": "message"}`, no `name` field) raised a bare `KeyError` that escaped every `except` clause, crashed the process, and `restart: unless-stopped` silently crash-looped it forever (visible only as a `(Re-)joining group` line repeating in the logs with no forward progress). Fixed by parsing explicitly in the loop body (not via `value_deserializer`) inside its own `try`/`except InvalidEvent`, so a bad message can't come from anywhere except that one call site.
  - **Why a bridge at all, and why Kafka in particular — the comparison demo**: `locust/bin/locustfile_http_overload.py` (hammers `POST /accounts` directly, no Kafka) vs `locust/bin/locustfile_kafka.py` (produces the same events onto the Kafka topic instead). Measured at 600 users / 60s against this repo's own default resource limits (`create_engine(...)` in `apps/backend/app/db.py` uses SQLAlchemy's default pool, single `uvicorn` worker, `--reload` mode): direct REST failed 79% of `POST /accounts` (500s, connection resets, up to 30s+ latency); the same load produced onto Kafka completed 1,241,297 events at 0% failure and ~24ms median produce latency, with `apps/backend`'s own `/health` staying at ~2ms throughout — because `kafka-bridge` drains the topic at its own steady, sequential pace, never forwarding a burst to the backend. That gap **is** the point of putting Kafka in front of a write path at all.
- Test tools must read their target host **only from environment variables**, never hardcode a container name (e.g. `LOCUST_HTTP_HOST`, `LOCUST_MYSQL_HOST`). That lets the same test tool invocation:
  - test apps itself with `make apps:up` already running, or
  - test an external host (e.g. staging) without `apps:up` at all,
  just by changing where the env vars point.
- Conversely, whether apps is running has no bearing on whether an external host can be tested (pointing the env vars at an external URL works even while apps is up). The only real constraint is the other direction: apps itself can't be the target unless it's running.

## Test/verification tool modules

Test and verification tools are added as modules separate from `apps`. Which verb they use depends on their lifecycle:

- **Long-running services** (the `build`/`up`/`down`/`status`/`restart`/`open` pattern): Kong (gateway), Microcks (contract mock), agentgateway (MCP/A2A gateway). These run `docker compose up -d`, so they follow the same convention as every other module.
  - Kong is joined to `apps-network` (in addition to its own `kong-net`) and `kong/conf/declarative.yml` declares just two services: `example_service` (httpbin-backed `/mock` and `/echo` demo routes, with a `rate-limiting` plugin, no dependency on apps) and `apps_backend` (`/api/*`, `strip_path: true`, proxying to the real backend's own root - `http://localhost:8000/api/accounts` reaches `backend:8080/accounts`). `apps_backend` needs `make apps:up` to actually resolve `backend` by container name; Kong itself still starts fine without it - the route just proxies a connection error until apps is up. There used to be a third, catch-all `apps_frontend` service proxying `/` straight to the frontend; removed, since routing to a REST/GraphQL/MCP backend through a gateway is the more useful demo of what Kong is actually for, and it's also the seam a future Consumer-side E2E test could use to swap in a mock backend (e.g. Specmatic's stub, `specmatic:stub-up`) without `apps/frontend` needing to know the difference - just repoint `apps_backend`'s `url` and re-import, no frontend changes needed (see `specmatic:test`'s Provider vs `vitest:contract-test`'s Consumer distinction above for why that'd be a different, complementary check from what already exists). In `KONG_DB=postgres` mode, changing `declarative.yml` requires `make kong:reset` to re-import — a plain `kong:up` on an already-bootstrapped DB skips the import (see `kong-up`'s "Existing database found" branch).
  - **Routing `apps/frontend` itself through Kong**: `apps/docker-compose.yml`'s `NEXT_PUBLIC_API_BASE` is `.env`-overridable (`${NEXT_PUBLIC_API_BASE:-http://localhost:8080}`) - set it to `http://localhost:8000/api` and the frontend calls the backend through `apps_backend` instead of directly. Needs `make kong:up` and a frontend recreate (`apps:restart`) to pick up the change, since Next.js dev mode bakes `NEXT_PUBLIC_*` into the client bundle at server start, not per-request. Verified end-to-end: ran `make playwright:test` against a Kong-routed frontend and confirmed via Kong's own access log that every request (`/api/auth/login`, `POST /api/accounts`, `/api/accounts/balances`) actually went through the gateway, not straight to the backend - all 5 tests passed unchanged. This is the concrete version of the "swap `apps_backend`'s `url` at a mock, no frontend changes needed" idea above: point `apps_backend` at `specmatic-stub:9091` instead of `backend:8080` and the exact same `NEXT_PUBLIC_API_BASE=http://localhost:8000/api` setup runs Playwright against a contract mock instead of the real backend - a from-the-browser Consumer test complementing `vitest:contract-test`'s Node-side one. Not built out as its own `make` target (yet) - this is the reconnaissance, not the feature.
  - Consul is likewise joined to `apps-network` (in addition to its own `consul-net`), because Consul's own agent — not the caller — is what performs each service's HTTP/TCP health check, so it needs to resolve `backend`/`mysql-server` by container name. `make consul:register-apps` registers the real apps containers (`apps-backend` → `backend:8080` HTTP-checked against `/health`, `apps-mysql` → `mysql-server:3306` TCP-checked); `consul:deregister-apps` removes them; `consul:discover-apps` prints Consul's own cached health status. `consul:verify-apps` goes a step further — it queries Consul for each service's address/port and then actually connects to exactly what was returned (from a throwaway container on `apps-network`, since the Makefile itself runs on the host and can't resolve those container names), proving the discover → connect flow really works instead of just trusting Consul's cached check result. `apps/frontend` is deliberately not registered: Consul's registry is for services *other services* discover and connect to, which a browser-facing web app isn't — registering it alongside `apps-backend`/`apps-mysql` was an irregular addition, removed.
  - **agentgateway** (`cr.agentgateway.dev/agentgateway`, MCP/A2A proxy) is a second, independent way to expose `apps/backend` as MCP tools - `apps/backend` already mounts its own native MCP server at `/mcp` (via `fastapi-mcp`), but `agentgateway/config.yaml` instead builds tools entirely from the OpenAPI contract, no backend-side MCP code involved. Its `openapi.schema` field supports `file`/`inline`/`url` sources (`FileInlineOrRemote`, untagged in agentgateway's own config schema); `url: http://backend:8080/openapi.json` fetches the live schema directly, so - unlike Specmatic/ZAP's `api-scan`, which both pull a local copy first - there's no separate fetch step. MCP target names must match `[a-z0-9.-]+` (`_`/`+` are reserved MCP delimiters) - `apps-backend`, not `apps_backend`, confirmed by a rejected startup (`invalid MCP target name`) before catching it. Verified end-to-end via the MCP Streamable HTTP handshake by hand (`agentgateway/bin/list_tools.sh`, what `make agentgateway:tools` runs): `tools/list` returns six tools - one per `openapi.yaml` operation, named/described straight from it - and calling `list_balances_accounts_balances_get` through the gateway returned the same live data `GET /accounts/balances` itself does. Host-published on `8010`, not agentgateway's own `3000` default - confirmed something else already listening on host `:3000` (a Node dev server), a collision likely for anyone else too.
    - The original generic `consul:register-service`/`register-db` samples (fake `127.0.0.1` addresses) were removed — their own health check always came up `critical` (`127.0.0.1` from inside the Consul container just points at itself), so they never actually demonstrated a working check. The apps-backed versions above replace them.
- **One-shot test runs** (a `test` verb, no `up`/`down`): pytest, vitest, playwright, specmatic, `vitest:contract-test`. These run `docker compose run --rm <service>` and exit, so there's no "leave it running" concept.
  - **ZAP** (`zap:baseline`/`zap:full-scan`/`zap:api-scan`) is the same one-shot `docker compose run --rm zap <script>` shape, just with three different scan scripts instead of one fixed `command:` in `zap/docker-compose.yml` (unlike specmatic's single-purpose service) - the actual script + args come from `zap/Makefile` per target. `zap:baseline` spiders + passively observes `apps/frontend` (`http://frontend:5173`) - safe, never sends an attack payload, confirmed against this repo's own `apps`: 12 WARN (missing security headers - `apps/frontend` is a dev-mode Next.js server, not hardened), 0 FAIL. `zap:full-scan` runs the same target through ZAP's active scanner - real SQLi/XSS/command-injection/etc. probes. `zap:api-scan` instead targets `apps/backend`'s live `/openapi.json` (`-f openapi`), so it's endpoint-aware - it hits every documented route, not just what a spider happens to crawl; confirmed 116 PASS / 2 WARN / 0 FAIL across every active rule (SQLi, XXE, SSTI, command injection, ...) run against every `apps/backend` route. All three exit non-zero on any real (non-INFO) finding by default - `-I` is passed explicitly to keep that WARN-level findings still exit 0 (only a FAIL would not), matching pytest/specmatic's pass/fail convention. `zap:full-scan`/`zap:api-scan` send real attack payloads, so - unlike every other test tool's target host - `zap`'s target is hardcoded to `apps`, not read from an overridable env var; there's deliberately no `ZAP_TARGET_URL` an external host could be fat-fingered into.

Current breakdown:

| Module | Targets | Needs apps:up? | Notes |
| --- | --- | --- | --- |
| `pytest` | Unit tests for `apps/backend` | No | Swaps the DB for an in-memory SQLite database. Lives in `apps/backend/tests/`. |
| `vitest` | Unit tests for `apps/frontend` | No | Mocks `fetch` to test the logic in `api.ts`. |
| `vitest:contract-test` | Consumer contract test of `apps/frontend`'s own API usage | Yes, plus `specmatic:stub-up` | Runs `src/lib/contract/api.consumer.test.ts` against Specmatic's stub instead of a mocked `fetch` or the real backend - see the Specmatic section below. |
| `playwright` | E2E browser tests against the running frontend | Yes | Uses the `data-testid` attributes in `apps/frontend` as selectors. |
| `specmatic:test` | Provider contract test of the running backend against `apps/backend/openapi.yaml` | Yes | Runs `specmatic/bin/prepare_contract.sh` (fetches the live schema + builds examples), then `specmatic test`. |
| `microcks` | Long-running mock server loaded from the backend's live OpenAPI schema | Only for `microcks:import-openapi` itself; not to keep serving the mock afterward | `make microcks:import-openapi` fetches `http://localhost:8080/openapi.json` and uploads it. |
| `zap:baseline` | Passive DAST scan of `apps/frontend` | Yes | Never sends an attack payload - spiders + observes only. |
| `zap:full-scan` | Active DAST scan of `apps/frontend` | Yes | Sends real attack payloads (SQLi, XSS, ...) - `apps` only, never an external host. |
| `zap:api-scan` | Active, OpenAPI-driven DAST scan of `apps/backend` | Yes | Scans every route in `apps/backend/openapi.yaml`'s live schema, not just what a spider crawls. |
| `agentgateway` | Long-running MCP/A2A gateway exposing `apps/backend` as MCP tools | Yes | Builds tools live from `openapi.yaml` (`schema.url`), independent of `apps/backend`'s own native `/mcp` mount - `make agentgateway:tools` verifies. |

### Report files

pytest, vitest, playwright, specmatic and zap each bind-mount a `report/` (and, for
specmatic, also a `junit/`) directory back onto the host, so every `make
<module>:test` (or `make zap:<scan>`) run leaves a browsable HTML report behind without needing to
`docker cp` anything out of a stopped container:

| Module | Report file |
| --- | --- |
| `pytest` | `pytest/report/report.html` (`pytest-html`, self-contained) |
| `vitest` | `vitest/report/index.html` (Vitest's built-in `html` reporter) |
| `vitest:contract-test` | `vitest/report-contract/index.html` (same reporter, separate output dir) |
| `playwright` | `playwright/report/index.html` (Playwright's built-in `html` reporter) |
| `specmatic` | `specmatic/report/html/index.html`, plus `specmatic/junit/TEST-junit-jupiter.xml` |
| `zap:baseline`/`zap:full-scan`/`zap:api-scan` | `zap/report/<scan>-report.html` (also `.json`) - each scan's own filename, overwritten on the next run of that same scan |

These directories are gitignored — they're regenerated on every run, not
checked in.

**Provider verification (`specmatic:test`) vs Consumer verification
(`specmatic:stub-up` + `vitest:contract-test`)** - Specmatic can check the
contract (`apps/backend/openapi.yaml`, see the "OpenAPI: contract-first, not
code-first" bullet above) from both directions, and this repo demonstrates
both:

- **Provider**: does `apps/backend` actually honor the contract it claims to
  implement? `specmatic:test` sends real requests to the real running
  backend and checks the real responses against `openapi.yaml`.
- **Consumer**: does `apps/frontend`'s own API usage - the paths it calls,
  the request shapes it sends, the response shapes it expects to parse -
  hold up against the contract, independent of whatever the real backend
  happens to be doing right now? `specmatic:stub-up` starts a mock server
  built from that same contract (schema + examples - anything that matches
  an example gets that example's exact response; anything else gets a
  schema-valid response with *randomly generated* values, confirmed
  empirically, which is actually a stronger check than always seeing
  realistic canned data). `vitest:contract-test` then runs
  `apps/frontend/src/lib/contract/api.consumer.test.ts` - real HTTP calls
  through `api.ts`, not a mocked `fetch` (that's `vitest:test`, a different,
  unrelated suite) and not the real backend (that's Playwright) - against
  that stub, and checks the responses parse into the shapes `api.ts`'s
  TypeScript types expect. `vitest.config.mts` excludes
  `src/lib/contract/**` from the default `vitest:test` run (spreading
  Vitest's own `defaultExclude` rather than replacing it) precisely because
  this suite isn't self-contained the way every other vitest test is - it
  needs `make apps:up` (once, to seed the stub's schema+examples) and
  `make specmatic:stub-up` first, same as `playwright:test`/`specmatic:test`
  need `apps:up`.

Both `specmatic` service and the `specmatic-stub` service in
`specmatic/docker-compose.yml` run the exact same
`specmatic/bin/prepare_contract.sh` first - it fetches the live
`/openapi.json` (which, since it's contract-first now, is already 3.0.3 with
no `/graphql` entry - no relabeling needed) and builds 7 externalized
examples fresh on every run, never checked in:

- **`POST /accounts` needs a real bearer token** to get past its documented
  `401`. Specmatic *does* see that the route requires `Authorization` (it's
  declared in `components.securitySchemes`), but has no way to know what
  value would actually be accepted - that's a runtime secret (`/auth/login`
  issues a random token per call, held only in the backend's in-memory
  `_TOKENS` dict), not something derivable from the schema. Note:
  Specmatic's own `specmatic.yaml`-based `security.OpenAPI.securitySchemes`
  config exists for exactly this and does parse correctly (confirmed via
  the CLI's own error messages while getting the shape right - the class is
  `io.specmatic.core.BearerSecuritySchemeConfiguration`, `type: bearer` +
  `token: ...`, nested under `security.OpenAPI.securitySchemes.<name>`), but
  empirically had **no effect** on `specmatic test`'s generated requests
  even with a real, freshly-issued token wired up - still 401. Dropped in
  favor of an externalized example with the token in its `Authorization`
  header, which reliably works - and, empirically, the stub's example
  matching keys off the request *body*, not the header value, so any
  syntactically-present bearer token reaches the example's response (see
  `api.consumer.test.ts`'s comments for how the Consumer test exploits this
  deliberately, to also exercise the `401` path).
- **`GET /accounts/{account_id}` needs an id that actually exists.** Left to
  itself Specmatic tries an arbitrary integer and gets a `404`. An inline
  `examples: [1]` on the path param in `openapi.yaml` itself (matching
  FastAPI: `account_id: int = Path(examples=[1])` in `routers/accounts.py`)
  is not enough on its own - Specmatic only actually uses an id value from
  an externalized example, not from the schema's own declared `examples`.
  Account id 1 is always the seed data's first row (this table is
  append-only, nothing ever deletes it), so it's safe to hardcode.
- **Four more examples cover every other documented non-2xx response** -
  `POST /auth/login` → `422`, `POST /accounts` → `422` and `401`, and
  `GET /accounts/{account_id}` → `422` and `404` - each sent with
  deliberately invalid input (an empty body, a non-numeric id, a bogus
  token, a nonexistent id) and its real response fetched live and reused as
  the example's expected body. Without these, Specmatic's own coverage
  report listed each as "not covered" even though the happy-path contract
  was fully verified - adding a negative example for each is enough on its
  own; no need for Specmatic's `SPECMATIC_GENERATIVE_TESTS` env var (which
  generates negative/mutated requests automatically). That was tried first
  and rejected: it also generates extra requests straight from the schema
  that bypass every externalized example above, bringing back the same
  401/404 problems those exist to solve, on top of new failures. Explicit
  negative examples get full coverage without any of that.

Every expected response body above is fetched live from the backend, so
none of them can drift from reality even though the *shape* they're checked
against now comes from the hand-maintained `openapi.yaml`, not the backend's
own code. `specmatic:test` is a clean, 100%-coverage pass as a result: 12
scenarios, 12 successes (11 from the externalized examples above, plus one
more Specmatic derives on its own from `openapi.yaml`'s inline
`GET /accounts/{account_id}` parameter example - see below).

### Microcks: mocking the contract, and Kong as the swap point to either mock

`openapi.yaml` also carries inline `examples:` (not `prepare_contract.sh`'s
dynamically-generated externalized ones - separate mechanism, separate
purpose) for every read operation, so `microcks:import-openapi` has
something to actually mock instead of an empty `messagesMap` per operation
(confirmed this was the initial state: imported the schema before adding
examples, checked `GET /api/services/{id}` on Microcks' own API, every
operation had `[]`). Two non-obvious things, found empirically:

- **Microcks needs the plural `examples:` (a named map), not the singular
  `example:`** - the latter parses fine as valid OpenAPI and Specmatic
  accepts it too, but Microcks silently produces zero mock messages from it.
  Request and response examples for the same scenario must also share the
  *same key* (e.g. `e001_login` under both `/auth/login`'s `requestBody`
  and its `200` response) - that's how Microcks pairs them into one
  complete mock; an unpaired example (input with no matching output, or
  vice versa) is discarded. Confirmed by testing both keyed and unkeyed
  forms directly against a running Microcks instance.
- **`POST /accounts` has no inline example, unlike every other operation** -
  it needs a real bearer token, which an OpenAPI example has no way to
  carry (a header, not part of `requestBody`). Adding one anyway was tried
  first: Specmatic picked it up as an extra test scenario (inline schema
  examples become Specmatic scenarios too, not just an externalized-example
  concern), had no way to authenticate it, and it failed with 401 every
  time - a real regression caught by the same `specmatic:test` run this
  whole file is about keeping honest. Removed the example; `POST /accounts`
  keeps its documented `201`/`401`/`422` responses with no example, and
  Microcks simply can't mock it as a result (an accepted scope boundary,
  not an oversight - see the comment on that operation in `openapi.yaml`).
- Microcks' own REST mock URL has a different shape than the real API:
  `/rest/<service-name>/<version>/<path>`, with the service name's spaces
  encoded as `+` (confirmed against Microcks' own request log, which prints
  the exact URL it matched) - e.g.
  `/rest/nb-quickstarts+apps+backend/0.1.0/health`, not `/health`.

**Kong as the swap point**: `apps_backend`'s `url` (see the Kong bullet
above) can point at either mock instead of the real backend, and neither
`apps/frontend` nor anything hitting `/api/*` needs to change - only
`kong/conf/declarative.yml` and a `kong:reset`. For Specmatic's stub, just
`http://specmatic-stub:9091`, since its mock paths match the real API
directly. For Microcks, the whole `/rest/<service>/<version>` prefix has to
be baked into `apps_backend.url` itself (e.g.
`http://microcks:8080/rest/nb-quickstarts+apps+backend/0.1.0`), since
`strip_path: true` on the Kong route only removes `/api` - Kong then
appends whatever's left of the incoming path onto the service `url`'s own
path, landing on Microcks' expected shape. Verified both directions
end-to-end, not just wired up: repointed `apps_backend.url` to each mock in
turn, `kong:reset`, then `curl`'d `/api/accounts/balances` and
`/api/accounts/1` through `localhost:8000` and got back exactly the
`openapi.yaml` example values from each mock, confirmed against
Specmatic's/Microcks' own request logs that they were the ones actually
serving it. See README's "Kong: routing to the real backend, or to a
contract mock instead" for the exact commands.

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
