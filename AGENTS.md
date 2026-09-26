# AGENTS.md

Standard rules for how this repository is structured and developed. This is the single source of truth for both human and AI contributors — there is no separate `CLAUDE.md`.

This repo is a verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com) — the proven open-source technologies NASEBANAL builds on — not a scaffold for arbitrary technologies. When adding a module, it should verify or exercise a piece of that stack (or a tool used to verify it), not just be "some tool that seemed useful."

## Code comments are English

Source-code comments (Python/TypeScript `#`/`//`/docstrings, and comments inside `Makefile`s, `docker-compose.yml`s, shell scripts, etc.) are written in English, even though the person driving development communicates in Japanese. This keeps the codebase approachable to contributors who don't read Japanese. Some older files still have Japanese comments from before this rule was set — fix them to English when you're already touching that code, but there's no standing effort to sweep the whole repo at once. User-facing product text (the frontend's `ja` locale in `i18n.ts`, Japanese strings in a description users will read, etc.) is a different thing entirely and stays as-is; this rule is about comments aimed at future maintainers, not translatable UI copy.

## Module layout (the Makefile calling convention)

- Each technology (kafka, kong, apps, locust, ...) lives in its own top-level directory, each with its own `docker-compose.yml` and `Makefile`.
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
| apps | sql-client (phpMyAdmin) | 8081 |
| kong | proxy (HTTP/HTTPS) | 8000 / 8443 |
| kong | admin API (HTTP/HTTPS) | 8001 / 8444 |
| kong | manager (HTTP/HTTPS) | 8002 / 8445 |
| kafka | broker | 9092 |
| kafka | controller | 9093 |
| kafka | kafka-bridge health (`kafka:bridge-up`, `GET /health`) | 8090 |
| locust | master UI | 8089 |
| locust | master-worker traffic | 5557 / 5558 |
| keycloak | HTTP (admin console + realm) | 8180 |
| vault | HTTP API / UI | 8200 |
| specmatic | stub (mock server, `specmatic:stub-up`) | 9091 |
| observability | Grafana | 3030 |
| observability | Prometheus | 9094 |
| observability | Tempo query API | 3200 |
| observability | Loki | 3100 |
| observability | Alertmanager | 9095 |
| observability | OTLP gRPC / HTTP | 4317 / 4318 |

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

`apps`, `kong`, `kafka`, and `observability` each store their data in a named Docker volume, so a plain `down`/`restart` preserves it, and each has its own `reset` target that wipes that volume and starts clean: `apps:reset` (`apps_apps-db-data` — MySQL), `kong:reset` (`kong_kong-db-data` — Postgres, `KONG_DB=postgres` mode; re-imports `kong/conf/declarative.yml`), `kafka:reset` (`kafka_kafka-data` — topics/messages), `observability:reset` (`observability_prometheus-data` / `observability_tempo-data` / `observability_loki-data` / `observability_alertmanager-data` / `observability_grafana-data` — metrics, traces, logs, alert state, Grafana state). `locust` holds no persistent state at all (nothing to reset beyond a plain restart). `make all:reset` runs all four resets plus a restart for the other two.

**Kafka's volume was silently dead until fixed here**: the `apache/kafka` image's actual default `log.dirs` is `/tmp/kraft-combined-logs`, not `/var/lib/kafka/data` — so the declared `kafka-data` volume (mounted at `/var/lib/kafka/data`) never received any of Kafka's real data, and every container recreation silently lost all topics regardless of `down`'s `--volumes` flag. Fixed by setting `KAFKA_LOG_DIRS: /var/lib/kafka/data` in `kafka/docker-compose.yml` so Kafka actually writes where the volume is mounted (verified: created a topic, `kafka:down` → `kafka:up`, topic still listed). Before trusting any other module's "does X persist" claim, verify it directly (create something, cycle `down`/`up`, check it's still there) rather than inferring it from the compose file's volume declaration alone — a declared volume doesn't guarantee anything actually writes to that path.

## Kafka: reachable from other containers, and consumer groups actually work

Two more Kafka gotchas, both found the same way as the `log.dirs` one above — by actually exercising the behavior end-to-end, not by trusting the config file:

- **Cross-container clients need a second listener.** The Kafka wire protocol has clients reconnect to whatever address the broker *advertises*, not just the bootstrap address they first dialed. The original single-listener config advertised `localhost:9092`, which only resolves correctly for something on the host machine — a client in *another* container (`kafka-bridge`, Locust's `locustfile_kafka.py`) would bootstrap fine, then get told to reconnect to `localhost:9092` (itself) and fail. Fixed by adding a second listener, `PLAINTEXT_INTERNAL`, advertised as `kafka:29092` (the container-network hostname) — see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS`/`KAFKA_ADVERTISED_LISTENERS`/`KAFKA_LISTENER_SECURITY_PROTOCOL_MAP`. `kafka` also had to join `apps-network` (in addition to its own `kafka-net`) for any of this to be reachable at all.
- **`offsets.topic.replication.factor` defaults to 3, which a 1-broker cluster can never satisfy.** Every *consumer group* (not plain produce/consume, which worked fine) needs the internal `__consumer_offsets` topic, and with the default replication factor it silently never gets created — every group-based consume then just hangs until it times out, reporting 0 messages, even though the data was produced and durably persisted correctly (confirmed by inspecting the log segment file on disk: real bytes, just unreadable by any consumer group). This affected `kafka-bridge`, and would equally have affected the pre-existing `kafka:consume-events`/`kafka:get-all-events`/`kafka:count-events` commands the whole time, undetected, since nothing had exercised group-based consumption before. Fixed with `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` (also in `.env`/`.env.example`).

## apps module (the app under test)

- `apps/` holds the actual application under test. `make apps:up` / `make apps:down` manage its lifecycle independently from any test tool.
  - `apps/backend` — Python (FastAPI). REST + GraphQL (strawberry-graphql) over a minimal, event-sourced `accounts` resource (`id`, `name`, `quantity`, `source`, `createdAt`) stored in MySQL (`demo`, table `accounts`): each row is one quantity-change *event* — `quantity` is a signed delta, not an absolute value — and a name's current balance is the sum of its events (`GET /accounts/balances` / GraphQL `balances`, backed by `account_service.get_balances`, a `GROUP BY name` `SUM`). This is a lightweight, practical form of event sourcing (an append-only ledger), not full CQRS with a dedicated event store — the right size for a demo, and it also gives `kafka-bridge` (see below) a natural mapping: one Kafka message → one new event row, via the same `POST /accounts` every other client uses. Also mounts an MCP server at `/mcp` via `fastapi-mcp` (`FastApiMCP(app).mount_http()` in `app/main.py`), auto-generating MCP tools from the same REST routes — connect a local MCP client (e.g. Claude Desktop) to `http://localhost:8080/mcp`.
  - `apps/frontend` — TypeScript (Next.js App Router). `/` is a marketing-style landing page (branding matches nb-dentiscope's navbar/hero, logo/wordmark self-hosted — no `@nasebanal/shared-navigation` dependency, see below); logging in (a modal, not an inline field) navigates to the real `/accounts` route, which calls the backend's REST API directly from the browser. Once logged in, the header shows a person-icon button (`UserMenu.tsx`, another self-contained re-implementation — this time of `nb-shared-navigation`'s `.nb-nav-user-*`/`.nb-nav-dropdown-*`) instead of a plain "Logout" link; clicking it opens a dropdown with the username and a red Logout row, and there's no separate "Logged in as" text on the page itself anymore. `/accounts` itself only ever shows the **Balances** table (`useBalances.ts`, `GET /accounts/balances` polled every 1s) — the raw per-event log used to also be rendered as a table there, but was deliberately removed: it's exactly the kind of thing a load test balloons into thousands of rows, whereas the balances table stays exactly one row per name regardless of event volume, cheaply re-rendering the same small table on every poll tick no matter how many events landed in between. The panel's own `<h1>` ("Items") is gone too, replaced by a short paragraph (`t.app.conceptDescription`) explaining the app's actual concept: a simple accounting ledger where a name is an account and each event is a signed transaction against it. The transaction-entry form's account field is a `<select>` populated from the current balances (an existing account, not typed free text) rather than an `<input>` — you can only post against an account that's already in the ledger through the UI; Kafka/Locust/MCP can still create a brand new account name by posting directly to the API, same as always. `/api-specs` renders the backend's live OpenAPI schema via Scalar (`@scalar/api-reference-react`, same library as nb-api-specs), pointed at the backend's own `/openapi.json` rather than a bundled spec file. `/docs` is the opposite case from `/api-specs`: static, hand-written prose (Overview, Getting Started, and six scenario walkthroughs, each with its own `LocalizedDocsPage` in `src/lib/docs/*.ts` - deliberately kept separate from `i18n.ts`'s `Dictionary`, which stays reserved for short, structurally-typed UI copy rather than long-form per-page content) rendered inside the normal `Header`/`Footer` chrome, not opted out of it in `AppChrome.tsx` the way `/api-specs` is - there's no second UI here to avoid doubling up with, just our own content, plus a sidebar (`DocsSidebar.tsx`) built from the tree in `src/lib/docs/nav.ts`. The header's "Docs" link (right next to "API Reference") opens it with `target="_blank"`, same treatment as every other header/hero link that leaves the app (API Reference, the endpoint list, the README link in How It Works) - landing on `/docs` doesn't cost you whatever page you were already on.
    - **UI language and code identifiers now match**: the frontend speaks "account"/"transaction" (i18n strings, headings, labels), and so does the backend — the REST path (`/accounts`), the MySQL table, the Python class (`Account`, `app/models.py`), the GraphQL type/query/mutation names (`AccountType`, `accounts`, `createAccount`), and the MCP tool names (auto-derived from the REST routes) all say `Account`/`account` too. This used to be a deliberate mismatch — code stayed `Item`/`item` while the UI said "account", to avoid touching the Kafka bridge's message shape, Specmatic's contract, and every test in the repo — but that tradeoff was revisited and the whole surface was renamed end-to-end instead. If you're reading old commit history or an old screenshot and see `Item`, that's why.
  - `mysql-server` — MySQL, data in the named volume `apps-db-data` (compose-prefixed to `apps_apps-db-data`, matching Kong's `kong_kong-db-data` "`<module>-db-data`" naming for consistency between the two). `apps:down`/`apps:restart` leave it alone, so registered accounts survive a normal restart; only `apps:reset` (`down --volumes` + `up`) wipes it for a genuinely clean demo state. Mirrors Kong's own `down`-preserves/`reset`-wipes split (see the Kong bullet under "Test/verification tool modules" below).
    - **One-time migration note**: before this, `mysql-server` had no declared volume at all, so MySQL wrote to a Docker-managed *anonymous* volume and `apps:down` always ran `--volumes` to avoid it going stale (see "A bind-mounted service's dependency directory needs its own volume" above) — which also meant every `apps:down`/`apps:restart` silently wiped MySQL data as a side effect. Anyone who already had `apps` running before this change will lose that old anonymous volume's data the first time they pick up the new compose file (the new named volume starts empty) — a one-time reset, not a recurring one. Since `apps`' MySQL only ever holds disposable demo/test data, this was judged an acceptable one-off cost.
    - **Another one-time migration note**: `Item`/`item`/`/items` was renamed to `Account`/`account`/`/accounts` across the whole backend (model, table, REST path, GraphQL, MCP tool names) - see above. `Base.metadata.create_all()` (in `app/main.py`) only creates missing tables, so an existing local volume from before this change ends up with both an orphaned, now-unused `items` table and a fresh, empty `accounts` table on next `apps:up` — the old data isn't gone, just stranded. Run `make apps:reset` once to get a clean `accounts` table instead of carrying the dead `items` table around.
- **MySQL credentials are apps-level variables, not Locust's**: `APPS_MYSQL_USER`/`APPS_MYSQL_PASSWORD` (default `demo`/`demo`), `APPS_MYSQL_ROOT_PASSWORD`, `APPS_MYSQL_DATABASE` (`demo`), `APPS_MYSQL_PORT` and `APPS_MYSQL_VERSION` configure the `mysql-server` container in `apps/docker-compose.yml`, and everything that connects with them reads the same names - `apps/backend`, the phpMyAdmin `sql-client`, `make apps:mysql`, the Vault module (`setup_mysql.sh`, `vault:put-mysql-secret`) and Locust's MySQL scenario. They used to be `LOCUST_MYSQL_USER`/`LOCUST_MYSQL_PASSWORD`, which read oddly for the app's own login; Locust now takes `LOCUST_MYSQL_USER`/`LOCUST_MYSQL_PASSWORD` only as an optional override (to aim the scenario at another database) and otherwise falls back to `APPS_MYSQL_*`. Compose's `${VAR:-default}` treats a blank value like an unset one, so a blank `APPS_MYSQL_PASSWORD=` means "use the default", **never** "no password"; only the backend's own `BACKEND_MYSQL_PASSWORD` uses the `-` form (see the Vault bullet). MySQL creates the database and user only when the data volume is first initialised, so changing any of these later needs `make apps:reset`. **One-time migration note**: the login used to be `testuser`/`testpassword` (and the database `testdb`); an existing volume keeps those, so either `make apps:reset` or create the new user by hand (`CREATE USER 'demo'@'%' IDENTIFIED BY 'demo'; GRANT ALL ON demo.* TO 'demo'@'%';`).
- **Users, login and profile**: the demo login checks a username and password against a `users` table in MySQL (`app/models.py`'s `User`; the seed - `app/seed.py` - creates one user, `demo` / `demo` (`demo@nasebanal.com`), adding it if missing by username - separately from the `accounts` seed - so a database created before it existed, or holding only Keycloak users, still gets it). Only a PBKDF2 hash is stored (`app/passwords.py`, stdlib `hashlib`), with a **demo-grade iteration count on purpose**: Locust's overload scenarios log in once per simulated user, and a production-strength hash would make login the bottleneck being measured. For the same reason `app/auth.py`'s `authenticate` keeps each user's hash in memory after the first lookup, so login costs no DB round-trip - it would otherwise compete for the connection pool the scenarios are trying to exhaust with `POST /accounts`. `POST /auth/login` returns the same message (`401 invalid username or password`) for an unknown user and a wrong password. `GET /me` and `PUT /me/profile` (`app/routers/me.py`) read and change the caller's profile - email, display name, language - keyed by the token's username; **the email is recorded but deliberately not editable** (it comes from the seed, or is mirrored from the Keycloak token), same as nb-landing-page's profile screen. A user with no row - a Keycloak user on first use, or a demo token that predates the table - gets one created on the spot (`provider` = `keycloak`, email/name from the token's claims). `users` has no foreign key to `accounts` on purpose: an account row is a ledger entry, not owned by a user. Every test tool logs in as `demo` (`DEMO_PASSWORD` for Locust, `KAFKA_BRIDGE_USERNAME`/`KAFKA_BRIDGE_PASSWORD` for kafka-bridge, `specmatic/bin/prepare_contract.sh`); the frontend's `/profile` page saves to the backend and applies the language at login (`AuthProvider.tsx`, once per login so the header toggle stays free to differ afterwards).
- **SQL client**: `apps/docker-compose.yml` runs phpMyAdmin (`sql-client`, port 8081) with `PMA_USER`/`PMA_PASSWORD` set, which skips its login screen - `make apps:sql` opens it on `demo`. It connects as **root on purpose** (so it can also show `mysql.user`, where the Vault scenario's dynamic users appear); a passwordless root login is exactly what must never be exposed outside this local demo. `make apps:mysql` opens a mysql shell, or runs one statement with `SQL=`.
- **Branding**: intentionally does not depend on `@nasebanal/shared-navigation` or `@nasebanal/api-specs` (both private GitHub Packages) — doing so would break this repo's public/OSS/air-gapped-friendly install story. The header/footer/theme/i18n are self-contained re-implementations matching their visual output, using a locally committed logo (`apps/frontend/public/logo.png`) instead of a package-supplied one.
- **OpenAPI: contract-first, not code-first.** `apps/backend/openapi.yaml` is the checked-in, hand-maintained source of truth for the REST API - `app/main.py` overrides `app.openapi` to load and serve this file verbatim at `GET /openapi.json`, instead of letting FastAPI derive a schema from its own routes/Pydantic models (FastAPI's normal behavior, and what this repo did before). `/api-specs`, the MCP mount and Specmatic all still fetch that same live `/openapi.json` endpoint - none of them needed to change, since the endpoint's URL and shape are unchanged; only where its *content* comes from changed. Specmatic still requires `make apps:up` first (for the actual test requests).
  - **Why the reversal**: a schema generated *from* the implementation can never structurally disagree with it - Specmatic's provider verification (`specmatic:test`) against a code-first schema can only ever catch behavioral bugs (wrong status code, auth not enforced), never real contract drift, because the "contract" was never independent of the code being tested in the first place. A physically separate, hand-maintained file makes "does the implementation still honor this contract" a real, failable question - the actual point of Contract-Driven Development, where a Consumer (`apps/frontend`, `kafka-bridge`, an MCP client) and a Provider (`apps/backend`) both build against one shared file, independently.
  - **The tradeoff, accepted deliberately**: `openapi.yaml` can now drift from what `app/routers/*.py` and `app/schemas.py` actually do, if someone changes one and forgets the other - exactly the risk the old code-first approach existed to eliminate. Keeping the two in sync by hand is the ongoing cost of the contract meaning something; `specmatic:test` is what catches it when they diverge.
  - `openapi.yaml`'s own header comment explains why `/graphql` isn't described in it at all (GraphQL's request shape isn't OpenAPI-describable - same reasoning as the Specmatic section below) and how it maps onto `apps/backend`'s actual routes.
- **Several backends**: the number of instances is an **apps** setting, `APPS_BACKEND_INSTANCES` (default 1), applied by `apps/bin/compose.sh` (wraps `docker compose -p apps`; `apps/Makefile` up/down/status/reset use it). On `up` it **generates** `apps/.backends.generated.yml` (gitignored) defining `backend-2..backend-N` by `extends`-ing apps' own `backend` service (same image, bind mount and environment; `build: !reset null` and `ports: !reset []` since apps already builds the image and only instance 1 publishes 8080), and passes `--remove-orphans` so a smaller N removes surplus containers. apps' `backend` gets `INSTANCE_ID: backend-1`; each instance adds it as an `X-Served-By` response header (`app/main.py`'s `ServedByMiddleware` - a raw ASGI middleware on purpose, since `@app.middleware("http")` wraps every request in `BaseHTTPMiddleware` and this app is what the load-test scenarios measure). Instances are found by compose labels (`backend`, `backend-N`).
  - **The mock token had to become multi-instance-safe**: it was an in-memory dict persisted to a shared JSON file, and with several instances writing it they overwrote each other's tokens and collided on the one temp file - measured as `/auth/login` 500s and `/accounts` 401s under load. A first fix put tokens in a DB table, but that made *login* a DB write, which changes what the overload scenarios measure, so a token is now **signed and self-contained**: `nb1~<b64 username>~<b64 HMAC-SHA256>`, secret `TOKEN_SECRET` (a fixed demo default). Any instance verifies it alone; no expiry or revocation, by design; no `.` in the format so a mock token skips the Keycloak JWT branch. Related: several instances starting or reloading at once raced on `create_all`, so `app/db.py`'s `startup_lock()` serialises them with MySQL's `GET_LOCK`.
  - **Frontend server resolver** (`apps/frontend/src/lib/server/backendResolver.ts`, `app/api/backend/[...path]/route.ts`, `app/api/resolver/route.ts`): with `NEXT_PUBLIC_API_BASE=/api/backend` the browser calls the Next.js server, which forwards to a backend resolved in one of two modes - `direct` (`BACKEND_DIRECT_URL`, default `http://backend:8080`) or `consul` (`CONSUL_HTTP_ADDR`, 1s cache of the healthy `apps-backend` instances, round robin, falls back to the next on a network error). Mode is a runtime setting (`GET/PUT /api/resolver`; `BACKEND_RESOLVER` is only the initial mode). Responses carry `x-resolved-via` and `x-upstream`; failure is a 502 JSON. The accounts page (`components/BackendRouting.tsx`, `lib/servedBy.ts`) shows the answering instance and the switch. The Consul module and its docs scenario were removed; `consul` mode stays in the code but has nothing to ask unless a Consul is supplied at `CONSUL_HTTP_ADDR`.
- **Kafka integration (`kafka-bridge`)**: `kafka/bridge/consumer.py`, a separate container (`make kafka:bridge-up`, deliberately *not* `kafka:up` — opt in explicitly, matching how every other cross-module integration in this repo works, e.g. `consul:register-apps` was also separate from that module's `up`). It consumes `KAFKA_TOPIC` (default `quickstart-events`) and calls `POST {KAFKA_BRIDGE_TARGET_URL}/accounts` (default `http://backend:8080`, but env-var-driven like every other test tool's target host — not hardcoded to apps) for each message. Deliberately lives here, not as in-process code inside `apps/backend`: apps/backend ends up with zero Kafka dependency, so a Kafka outage can only ever affect this container, never the backend itself. Resilience is load-bearing, not incidental: connecting to Kafka, logging into the backend, and POSTing each event are all infinite retry loops (never a crash), and a message's Kafka offset is committed only *after* a successful POST — so an unreachable backend pauses ingestion (Kafka durably retains the backlog) rather than losing events. Verified directly: stopped `apps:up`'s backend mid-stream, watched `kafka-bridge` retry without crashing, restarted the backend, watched the queued event get delivered with no data loss.
  - **Two different failure modes, on purpose**: a *transient* failure (Kafka or the backend temporarily unreachable, a request rejected) is retried forever, per the above. A *permanent* one — a message that isn't valid JSON, or is missing `name` — is logged and its offset committed anyway (skipped, not retried): retrying an unparseable message forever would just deadlock the whole pipeline behind it. This distinction wasn't theoretical: an early version used `KafkaConsumer`'s own `value_deserializer` and caught only `KafkaError`, so a single leftover non-conforming message from manual testing (`{"test": "message"}`, no `name` field) raised a bare `KeyError` that escaped every `except` clause, crashed the process, and `restart: unless-stopped` silently crash-looped it forever (visible only as a `(Re-)joining group` line repeating in the logs with no forward progress). Fixed by parsing explicitly in the loop body (not via `value_deserializer`) inside its own `try`/`except InvalidEvent`, so a bad message can't come from anywhere except that one call site.
  - **Why a bridge at all, and why Kafka in particular — the comparison demo**: `locust/bin/locustfile_http_overload.py` (hammers `POST /accounts` directly, no Kafka) vs `locust/bin/locustfile_kafka.py` (produces the same events onto the Kafka topic instead). Measured at 600 users / 60s against this repo's own default resource limits (`create_engine(...)` in `apps/backend/app/db.py` uses SQLAlchemy's default pool, single `uvicorn` worker, `--reload` mode): direct REST failed 79% of `POST /accounts` (500s, connection resets, up to 30s+ latency); the same load produced onto Kafka completed 1,241,297 events at 0% failure and ~24ms median produce latency, with `apps/backend`'s own `/health` staying at ~2ms throughout — because `kafka-bridge` drains the topic at its own steady, sequential pace, never forwarding a burst to the backend. That gap **is** the point of putting Kafka in front of a write path at all.
- Test tools must read their target host **only from environment variables**, never hardcode a container name (e.g. `LOCUST_HTTP_HOST`, `LOCUST_MYSQL_HOST`). That lets the same test tool invocation:
  - test apps itself with `make apps:up` already running, or
  - test an external host (e.g. staging) without `apps:up` at all,
  just by changing where the env vars point.
- Conversely, whether apps is running has no bearing on whether an external host can be tested (pointing the env vars at an external URL works even while apps is up). The only real constraint is the other direction: apps itself can't be the target unless it's running.

## Test/verification tool modules

Test and verification tools are added as modules separate from `apps`. Which verb they use depends on their lifecycle:

- **Long-running services** (the `build`/`up`/`down`/`status`/`restart`/`open` pattern): Kong (gateway), agentgateway (MCP/A2A gateway), Keycloak (OIDC identity provider), Vault (secret storage). These run `docker compose up -d`, so they follow the same convention as every other module.
  - Kong is joined to `apps-network` (in addition to its own `kong-net`) and `kong/conf/declarative.yml` declares just two services: `example_service` (httpbin-backed `/mock` and `/echo` demo routes, with a `rate-limiting` plugin, no dependency on apps) and `apps_backend` (`/api/*`, `strip_path: true`, proxying to the real backend's own root - `http://localhost:8000/api/accounts` reaches `backend:8080/accounts`). `apps_backend` needs `make apps:up` to actually resolve `backend` by container name; Kong itself still starts fine without it - the route just proxies a connection error until apps is up. There used to be a third, catch-all `apps_frontend` service proxying `/` straight to the frontend; removed, since routing to a REST/GraphQL/MCP backend through a gateway is the more useful demo of what Kong is actually for, and it's also the seam a future Consumer-side E2E test could use to swap in a mock backend (e.g. Specmatic's stub, `specmatic:stub-up`) without `apps/frontend` needing to know the difference - just repoint `apps_backend`'s `url` and re-import, no frontend changes needed (see `specmatic:test`'s Provider vs `vitest:contract-test`'s Consumer distinction above for why that'd be a different, complementary check from what already exists). In `KONG_DB=postgres` mode, changing `declarative.yml` requires `make kong:reset` to re-import — a plain `kong:up` on an already-bootstrapped DB skips the import (see `kong-up`'s "Existing database found" branch).
  - **Routing `apps/frontend` itself through Kong**: `apps/docker-compose.yml`'s `NEXT_PUBLIC_API_BASE` is `.env`-overridable (`${NEXT_PUBLIC_API_BASE:-http://localhost:8080}`) - set it to `http://localhost:8000/api` and the frontend calls the backend through `apps_backend` instead of directly. Needs `make kong:up` and a frontend recreate (`apps:restart`) to pick up the change, since Next.js dev mode bakes `NEXT_PUBLIC_*` into the client bundle at server start, not per-request. Verified end-to-end: ran `make playwright:test` against a Kong-routed frontend and confirmed via Kong's own access log that every request (`/api/auth/login`, `POST /api/accounts`, `/api/accounts/balances`) actually went through the gateway, not straight to the backend - all 5 tests passed unchanged. This is the concrete version of the "swap `apps_backend`'s `url` at a mock, no frontend changes needed" idea above: point `apps_backend` at `specmatic-stub:9091` instead of `backend:8080` and the exact same `NEXT_PUBLIC_API_BASE=http://localhost:8000/api` setup runs Playwright against a contract mock instead of the real backend - a from-the-browser Consumer test complementing `vitest:contract-test`'s Node-side one. Not built out as its own `make` target (yet) - this is the reconnaissance, not the feature.
  - **Gateway traces (Kong, agentgateway)**: both export traces to the observability Collector (`http://otel-collector:4318`, reachable because both are on `apps-network`). Kong: the `opentelemetry` plugin on the `apps_backend` service in `declarative.yml` (endpoint `.../v1/traces`, `service.name: nb-kong`) plus `KONG_TRACING_INSTRUMENTATIONS=request` / `KONG_TRACING_SAMPLING_RATE=1.0` in `kong/docker-compose.yml`; in DB mode (the default) it takes effect only after `make kong:reset`. With the Collector down, requests still succeed (Kong logs `[otel] failed to send request`) - verified. agentgateway: `config.tracing` (`otlpEndpoint`, `otlpProtocol: http`, `randomSampling: true` - the default is false, which exports nothing unless the request already carries a trace); the block was picked up only after a container restart, not by the live reload of the file. Verified in Tempo: Kong -> backend and agentgateway `tools/call` -> backend are each one trace (context is passed on; Kong's `header_type` is the default `preserve`). agentgateway also exports access logs over OTLP (`frontendPolicies.accessLog.otlp` -> `otel-collector:4318/v1/logs`): they reach Loki as `service_name="agentgateway"` with the request fields as labels and `trace_id`/`span_id` (the record body is empty). Kong 3.6.1's `opentelemetry` plugin is traces-only (no log/metric export in its schema), so Kong's logs are not in Loki. Not done: Kong's `prometheus` plugin / agentgateway's stats port (15020) as Prometheus targets, Kong logs to Loki.
  - **Kong defaults to DB mode** (`KONG_DB` falls back to `postgres` in `kong/docker-compose.yml`, `kong/Makefile` and `kong/bin/reset_config.sh`; `.env.example` agrees), so Kong Manager can save edits; `KONG_DB=off` gives DB-less mode (reads `declarative.yml` only, read-only Admin API).
  - **Keycloak** and **Vault** are the only two test/verification modules that reach into `apps/backend`'s own Python code rather than treating it as a black box the way Kong/agentgateway do - a deliberate exception, since "does the real backend accept a token from a real IdP" and "does the real backend actually source its DB credential from a real secret store at startup" can't be demonstrated any other way. Both default to fully off (`KEYCLOAK_ISSUER`/`VAULT_ADDR`+`VAULT_TOKEN` all empty), so a checkout with neither module ever started behaves byte-for-byte as before either existed.
    - **Keycloak** (`quay.io/keycloak/keycloak`, `start-dev --import-realm`) imports a fixed realm on every start from `keycloak/realm/nasebanal-realm.json` (realm `nasebanal`, one public client `apps-demo` with both the browser's Authorization Code + PKCE flow and the password grant enabled, sign-up enabled, and one demo user, `keycloak-demo`/`nasebanal-demo`) - no persistent volume declared, so there's nothing to `reset` beyond a `restart` (see "Persistent state and `reset` targets" above). **One variable, `KEYCLOAK_ISSUER`, turns on both halves**: `apps/backend` starts accepting Keycloak JWTs (`app/auth.py`'s `get_current_username` - the same dependency every protected route already used - tries a token as a Keycloak JWT first, via `PyJWKClient`, and falls through to the legacy opaque-token lookup if that fails, or `KEYCLOAK_ISSUER` is unset, or the token has no `.` in it), and `apps/frontend` gets it as `NEXT_PUBLIC_KEYCLOAK_ISSUER` so the login modal shows a Demo/Keycloak toggle with Keycloak-hosted sign-up (`src/lib/oidc.ts` is a hand-written Authorization Code + PKCE flow, `src/app/auth/callback/page.tsx` redeems the code; no OIDC library; logout also ends the Keycloak session). It is the address the *browser* logs in at (`http://localhost:8180/realms/nasebanal`), and `keycloak/docker-compose.yml` pins every token's `iss` to it with `KC_HOSTNAME` - so it no longer matters which address a token request arrived on. The backend fetches the signing keys from a *different* address, `KEYCLOAK_JWKS_URL` (default `http://keycloak:8080/...`, the in-network one), because from inside `apps-network` `localhost` is the backend container itself. `make keycloak:verify-apps` gets a token with the password grant and `POST`s it to the real `/accounts`.
    - **Vault** (`hashicorp/vault`, dev-mode server - `VAULT_DEV_ROOT_TOKEN_ID` sets a fixed root token, auto-unseals, mounts KV v2 at `secret/`) issues `apps/backend`'s MySQL credential. Dev mode is in-memory only (no volume, same "no persistent state" shape as Keycloak above - and locust). `make vault:setup-mysql` (`vault/bin/setup_mysql.sh`, run inside the vault container, idempotent) enables the **database secrets engine**, points it at apps' MySQL as root, and defines the `apps-backend` role (creation/revocation statements, `default_ttl` 1h, `max_ttl` 24h): asking `database/creds/apps-backend` makes Vault CREATE a new MySQL user (`v-token-apps-backe-...`, random password, `GRANT ALL ON demo.*`) with a lease and DROP it when the lease ends. `app/config.py`'s `Settings` calls `_fetch_vault_mysql_credentials()` at import time when both `VAULT_ADDR` and `VAULT_TOKEN` are set: it tries the dynamic credential first (retrying HTTP 5xx for up to ~60s, because right after a `down` + `up` MySQL is still starting and Vault answers 500 - falling back on the first failure would silently leave the backend with no password), then the older static `secret/apps/mysql` KV secret (`make vault:put-mysql-secret`), then the plain `MYSQL_USER`/`MYSQL_PASSWORD` env vars (which `apps/docker-compose.yml` fills from `APPS_MYSQL_*`); a background thread renews the lease at half the TTL. Uses stdlib `urllib`, not `requests`. The backend's MySQL login has its own override, `BACKEND_MYSQL_USER`/`BACKEND_MYSQL_PASSWORD` in `apps/docker-compose.yml` (default: the shared `APPS_MYSQL_USER`/`APPS_MYSQL_PASSWORD` - `demo`/`demo`), written with `-` not `:-` so a *set but empty* `BACKEND_MYSQL_PASSWORD=` is kept: the backend then has no password of its own, which is the scenario's before/after - `make vault:prove-needs-vault` (no Vault, no password -> `Access denied ... using password: NO` on every `[db] attempt`, `wait_for_database` now prints each failure) vs `make vault:verify-apps` (no password + Vault -> `[vault] issued a dynamic MySQL user ...` in `docker logs nb-backend` - `print()`, not `logging`, since nothing has configured a root handler yet - a real `GET /accounts/balances` round-trip, and the user listed by `make vault:db-users`). Both set the variables for one `--force-recreate` only, never `.env`. Dynamic users outlive `vault:down` (dev mode forgets the leases, so nothing drops them) until `apps:reset` wipes the database.
  - **agentgateway** (`cr.agentgateway.dev/agentgateway`, MCP/A2A proxy) is a second, independent way to expose `apps/backend` as MCP tools - `apps/backend` already mounts its own native MCP server at `/mcp` (via `fastapi-mcp`), but `agentgateway/config.yaml` instead builds tools entirely from the OpenAPI contract, no backend-side MCP code involved. Its `openapi.schema` field supports `file`/`inline`/`url` sources (`FileInlineOrRemote`, untagged in agentgateway's own config schema); `url: http://backend:8080/openapi.json` fetches the live schema directly, so - unlike Specmatic/ZAP's `api-scan`, which both pull a local copy first - there's no separate fetch step. MCP target names must match `[a-z0-9.-]+` (`_`/`+` are reserved MCP delimiters) - `apps-backend`, not `apps_backend`, confirmed by a rejected startup (`invalid MCP target name`) before catching it. Verified end-to-end via the MCP Streamable HTTP handshake by hand (`agentgateway/bin/list_tools.sh`, what `make agentgateway:tools` runs): `tools/list` returns six tools - one per `openapi.yaml` operation, named/described straight from it - and calling `list_balances_accounts_balances_get` through the gateway returned the same live data `GET /accounts/balances` itself does. Host-published on `8010`, not agentgateway's own `3000` default - confirmed something else already listening on host `:3000` (a Node dev server), a collision likely for anyone else too.
    - agentgateway also ships a real dashboard UI - a React SPA, built into the official image by default (`Dockerfile`'s `CARGO_FEATURES=agentgateway-app/ui`; `admin_router()` in `crates/agentgateway/src/management/admin.rs` serves it at `/` when that feature is compiled in, redirecting to `/ui`), confirmed by fetching it directly (`308` → `/ui`, then a real `index.html` referencing hashed JS/CSS assets, both `200`). It's served off the **admin** port (not the MCP one), which defaults to loopback-only *inside the container* (`config.rs`'s `admin_addr` defaults to `Address::Localhost(_, 15000)`) - unreachable from the host even with the port published, confirmed directly (connection refused). `agentgateway/config.yaml` sets `config.adminAddr: 0.0.0.0:15000` to fix that - note the nesting: `adminAddr` as a top-level key is rejected (`unknown field`), it belongs under `config:`, a `LocalConfig` struct field of type `Option<RawConfig>` distinct from the routing-level `binds`/`routes`/etc. keys sitting alongside it.
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
| `zap:baseline` | Passive DAST scan of `apps/frontend` | Yes | Never sends an attack payload - spiders + observes only. |
| `zap:full-scan` | Active DAST scan of `apps/frontend` | Yes | Sends real attack payloads (SQLi, XSS, ...) - `apps` only, never an external host. |
| `zap:api-scan` | Active, OpenAPI-driven DAST scan of `apps/backend` | Yes | Scans every route in `apps/backend/openapi.yaml`'s live schema, not just what a spider crawls. |
| `agentgateway` | Long-running MCP/A2A gateway exposing `apps/backend` as MCP tools | Yes | Builds tools live from `openapi.yaml` (`schema.url`), independent of `apps/backend`'s own native `/mcp` mount - `make agentgateway:tools` verifies. |
| `observability` | Long-running OTel Collector + Prometheus + Alertmanager + Tempo + Loki + Grafana receiving OTLP from `apps/backend` | Yes | `apps/backend` exports only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (off by default, `apps/backend/app/telemetry.py`) - `make observability:verify` checks each component and that `nb-backend` metrics/traces/logs arrived; `make observability:alerts` shows what Alertmanager holds and what its webhook sink (`alert-sink`, a stand-in for Slack/email) received. Logs ship only failed requests (status >= 400) and app log lines - not one line per request, which a Kafka-fed run would turn into millions. Alert rules are in `observability/alert-rules.yml`. Grafana on `3030` (not its `3000` default, a common host dev-server port); Prometheus on `9094` (`9091` is specmatic); Alertmanager on `9095` (not its `9093` default - that is Kafka's controller port). Exists as a local OTLP backend standing in for NewRelic, which the real NASEBANAL apps use. |

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
  issues a signed token per call, valid only with the backend's
  `TOKEN_SECRET`), not something derivable from the schema. Note:
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

### Kong as the swap point to Specmatic's mock

`apps_backend`'s `url` (see the Kong bullet above) can point at Specmatic's
mock instead of the real backend, and neither `apps/frontend` nor anything
hitting `/api/*` needs to change - only `kong/conf/declarative.yml` and a
`kong:reset`: just `http://specmatic-stub:9091`, since its mock paths match
the real API directly. Verified end-to-end, not just wired up: repointed
`apps_backend.url` at the mock, `kong:reset`, then `curl`'d
`/api/accounts/balances` and `/api/accounts/1` through `localhost:8000` and got
back exactly the `openapi.yaml` example values, confirmed against Specmatic's
own request log that it was the one actually serving it. See README's "Kong:
routing to the real backend, or to a contract mock instead" for the exact
commands.

Locust is excluded from this table on purpose: it already writes its own
timestamped `locust/logs/<timestamp>/report.html` per run (pre-existing,
unrelated to this convention).

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
