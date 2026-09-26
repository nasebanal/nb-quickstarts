# NASEBANAL Quickstarts

**NASEBANAL Quickstarts helps you verify how the [NASEBANAL Stack](https://www.nasebanal.com) actually behaves** — the proven open-source technologies NASEBANAL builds on, not a scaffold for every technology out there. Each module spins up one piece of that stack (or a tool that verifies it) via Docker Compose + `make`, so you can try it, test against it, and see how the pieces fit together. Like the constituents of the NASEBANAL Stack itself, which modules are here may change as the stack evolves.

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Sample Scenarios](#-sample-scenarios)
- [Configuration](#configuration)
- [License](#license)

## 🚀 Overview

Supported OSS, one module per technology:

- **[apps](#apps)** — the test-target stack itself: [FastAPI](https://fastapi.tiangolo.com/) (REST + GraphQL via [Strawberry](https://strawberry.rocks/) + an [MCP](https://modelcontextprotocol.io/) server via [fastapi-mcp](https://github.com/tadata-org/fastapi_mcp)), [Next.js](https://nextjs.org/), [MySQL](https://www.mysql.com/)
- **[Kong](https://konghq.com/products/kong-gateway)** — API gateway
- **[Kafka](https://kafka.apache.org/)** — event streaming
- **[Keycloak](https://www.keycloak.org/)** — OIDC identity provider: a real login (with sign-up) on the login page, issuing JWTs the real backend validates
- **[Vault](https://www.vaultproject.io/)** — issues the real backend a fresh, short-lived MySQL user on demand, so it has no database password of its own
- **[Vitest](https://vitest.dev/)** — `apps/frontend` unit tests
- **[pytest](https://docs.pytest.org/)** — `apps/backend` unit tests
- **[Playwright](https://playwright.dev/)** — E2E browser tests
- **[Specmatic](https://specmatic.io/)** — OpenAPI contract tests
- **[Locust](https://locust.io/)** — load testing
- **[OWASP ZAP](https://www.zaproxy.org/)** — web app vulnerability scanning (DAST)
- **[agentgateway](https://agentgateway.dev/)** — MCP/A2A gateway for AI agent connectivity
- **[Observability](#observability-opentelemetry-prometheus-tempo-and-grafana)** — [OpenTelemetry](https://opentelemetry.io/) Collector + [Prometheus](https://prometheus.io/) + [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) + [Tempo](https://grafana.com/oss/tempo/) + [Loki](https://grafana.com/oss/loki/) + [Grafana](https://grafana.com/oss/grafana/), receiving OTLP from `apps/backend`

### Endpoints

Every module prints its own "Endpoints once started" block from `make <module>:up` (or plain `make <module>`) - this is the same information gathered in one place, across every module, for reference without starting anything. The "Host-published" column is reachable from your host machine (browser, `curl`, etc.); the "Container network hostname" column is the Docker Compose **service name** - only resolvable from *inside* `apps-network` (i.e. from another container joined to it, e.g. Kong's `apps_backend` service, or one test tool container calling another) - not from your host machine, and often a different port than the host-published one. A module needs to actually be up (`make <module>:up`) for its own row to answer either way.

| Module | Endpoint | Host-published | Container network hostname | Notes |
|---|---|---|---|---|
| apps | Frontend | http://localhost:5173 | `frontend:5173` | Next.js |
| apps | API docs (Scalar) | http://localhost:5173/api-specs | `frontend:5173/api-specs` | Reads the backend's live OpenAPI schema |
| apps | Docs | http://localhost:5173/docs | `frontend:5173/docs` | Overview (purpose, structure, scenarios), Getting Started and seven scenarios starting with verification of the demo app - same Header/Footer as `/`, opens in a new tab from the header's "Docs" link |
| apps | Backend REST | http://localhost:8080 | `backend:8080` | FastAPI |
| apps | Backend GraphQL | http://localhost:8080/graphql | `backend:8080/graphql` | Strawberry |
| apps | MCP server | http://localhost:8080/mcp | `backend:8080/mcp` | Streamable HTTP |
| apps | MySQL | localhost:3306 | `mysql-server:3306` | database `demo` |
| Kong | Proxy | http://localhost:8000 | `kong:8000` | HTTPS: 8443 (host), `kong:8443` (in-network) |
| Kong | Proxy `/api/*` | http://localhost:8000/api/accounts | `kong:8000/api/accounts` | -> `apps_backend` (real backend by default - see [Kong: routing...](#kong-routing-to-the-real-backend-or-to-a-contract-mock-instead)), needs `apps:up` |
| Kong | Proxy `/mock`, `/echo/get` | http://localhost:8000/mock, http://localhost:8000/echo/get | `kong:8000/mock`, `kong:8000/echo/get` | httpbin-backed demo routes, no dependency on `apps` |
| Kong | Admin API | http://localhost:8001 | `kong:8001` | HTTPS: 8444 (host), `kong:8444` (in-network) |
| Kong | Manager UI | http://localhost:8002 | `kong:8002` | HTTPS: 8445 (host), `kong:8445` (in-network); edits need DB mode (the default) |
| Kafka | Broker | localhost:9092 | `kafka:29092` | `KAFKA_PORT`; the in-network listener is a *different* port (`29092`, `PLAINTEXT_INTERNAL`) than the host-published one (`9092`, `PLAINTEXT`) - see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS` comment |
| Kafka | kafka-bridge health | http://localhost:8090/health | `kafka-bridge:8090/health` | Only once `kafka:bridge-up` has run; `KAFKA_BRIDGE_HEALTH_PORT` |
| Specmatic | Mock server | http://localhost:9091 | `specmatic-stub:9091` | `SPECMATIC_STUB_PORT`; needs `apps:up` first (`make specmatic:stub-up`) |
| Keycloak | Admin console | http://localhost:8180/admin | `keycloak:8080/admin` | `KEYCLOAK_PORT`; realm `nasebanal`, admin/admin by default |
| Keycloak | Token endpoint (realm `nasebanal`) | http://localhost:8180/realms/nasebanal/... | `keycloak:8080/realms/nasebanal/...` | Client `apps-demo`, user `keycloak-demo` / `nasebanal-demo` - see [Keycloak: a real login, and a real token the backend verifies](#keycloak-a-real-login-and-a-real-token-the-backend-verifies) |
| Vault | UI / API | http://localhost:8200 | `vault:8200` | `VAULT_PORT`; dev-mode root token `VAULT_ROOT_TOKEN` |
| Locust | Web UI | http://localhost:8089 | `locust-master:8089` | |
| agentgateway | MCP (Streamable HTTP) | http://localhost:8010/mcp | `agentgateway:3000/mcp` | `AGENTGATEWAY_PORT`; needs `apps:up` (fetches `apps/backend`'s live OpenAPI schema) |
| agentgateway | Dashboard UI | http://localhost:15000 | `agentgateway:15000` | `AGENTGATEWAY_ADMIN_PORT`; redirects to `/ui` |
| Observability | Grafana | http://localhost:3030 | `grafana:3000` | `GRAFANA_PORT`; anonymous Admin, no login; dashboard "Apps backend (OpenTelemetry)" is pre-provisioned |
| Observability | Prometheus | http://localhost:9094 | `prometheus:9090` | `PROMETHEUS_PORT` |
| Observability | Tempo (query API) | http://localhost:3200 | `tempo:3200` | `TEMPO_PORT` |
| Observability | OTLP (HTTP / gRPC) | http://localhost:4318, localhost:4317 | `otel-collector:4318`, `otel-collector:4317` | `OTEL_HTTP_PORT` / `OTEL_GRPC_PORT`; what apps export to |

## 🏁 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/nasebanal/nb-quickstarts.git
   cd nb-quickstarts
   ```

2. **Configure environment variables (optional)**
   ```bash
   # Copy the example .env file and customize it
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Run quickstarts**
   ```bash
   # View available services
   make

   # Apps (test target apps: MySQL + Python backend + Next.js frontend)
   make apps:up
   make apps:down

   # Test/verification tools against apps (see "Test/verification tools" below)
   make pytest:test
   make vitest:test
   make playwright:test
   make specmatic:test

   # Kong API Gateway
   make kong:up
   make kong:open

   # Kafka
   make kafka:up
   make kafka:add-topics
   make kafka:list-topics

   # Locust Load Testing (configure in .env, then run)
   make locust:up
   make locust:open

   # Keycloak (a real login with sign-up, and JWTs the real backend verifies -
   # needs apps:up, plus KEYCLOAK_ISSUER set + apps:restart to turn it on)
   make keycloak:up
   make keycloak:login
   make keycloak:verify-apps
   make keycloak:open

   # Vault (issues the real backend a fresh MySQL user - needs apps:up)
   make vault:up
   make vault:setup-mysql
   make vault:verify-apps
   make vault:open

   # OWASP ZAP (vulnerability scanning against apps - needs apps:up)
   make zap:baseline

   # agentgateway (exposes apps/backend as MCP tools - needs apps:up)
   make agentgateway:up
   make agentgateway:tools
   make agentgateway:open

   # Observability (OTel Collector + Prometheus + Tempo + Grafana)
   # Set OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 in .env first,
   # then apps:restart so apps/backend starts exporting.
   make observability:up
   make observability:verify
   make observability:open
   ```

## 🧪 Sample Scenarios

Hands-on, scenario-based walkthroughs for each tool - what to run, in what order, and what you should see happen. For quick flag/env-var reference instead, see [Configuration](#configuration) below.

### Login, profile and the database

The login takes a username and password, checked against the `users` table in MySQL: one user is seeded (`apps/backend/app/seed.py`): `demo`, password `demo`, `demo@nasebanal.com`. After logging in, the header's user menu leads to a **Profile** page — the email is shown (recorded, not editable), the display name and language can be changed and are saved with `PUT /me/profile`. The database is easy to look at:

```bash
make apps:sql                                   # phpMyAdmin at http://localhost:8081, already logged in to demo
make apps:mysql                                 # a mysql shell
make apps:mysql SQL="SELECT username, email, display_name, language, provider FROM users"
```

### Specmatic: contract testing (Provider and Consumer)

`apps/backend/openapi.yaml` is the contract — a checked-in, hand-maintained OpenAPI file, not one generated from the route code (`app/main.py` serves it verbatim at `GET /openapi.json`). That's a deliberate reversal from earlier in this repo's history: a schema generated *from* the implementation can never structurally disagree with it, so a provider verification test run against it can only ever catch behavioral bugs, never real contract drift. A physically separate file makes "does the implementation still honor this contract" a real, failable question — the actual point of Contract-Driven Development, where a Consumer and a Provider both build against one shared file independently. The tradeoff: `openapi.yaml` can drift from what the code actually does if you change one and forget the other — keeping them in sync by hand is the ongoing cost, and `specmatic:test` is what catches it when they diverge.

Specmatic checks the contract from both directions:

```bash
make apps:up
make specmatic:test          # Provider: real requests against the real running backend
```

```bash
make apps:up                 # needed once, to seed the stub's schema + examples
make specmatic:stub-up       # mock server built from the same contract (localhost:9091)
make vitest:contract-test    # Consumer: apps/frontend's real api.ts calls against the mock, not a mocked fetch or the real backend
```

`specmatic/bin/prepare_contract.sh` (shared by both `specmatic:test` and `specmatic:stub-up`) fetches the live schema and builds 7 externalized examples fresh on every run — a real bearer token, an id that actually exists, and deliberately-invalid requests covering every documented non-2xx response — so Specmatic's own coverage report reaches 100%. See `AGENTS.md`'s Specmatic section for the full story, including a dead end (Specmatic's own security-token config parses correctly but has no effect on generated requests) and why `SPECMATIC_GENERATIVE_TESTS` was tried and rejected in favor of explicit negative examples.

### Kong: routing to the real backend, or to a contract mock instead

`apps_backend` (Kong Manager → **Gateway Services**) proxies `http://localhost:8000/api/*` to `apps/backend`'s own root (`strip_path: true`, so `/api/accounts` reaches `backend:8080/accounts`). `apps/frontend` can go through it instead of calling the backend directly:

```bash
make kong:up   # DB mode (KONG_DB=postgres) is the default, so Kong Manager can save edits; KONG_DB=off is DB-less: declarative.yml only, read-only Admin API
# .env: NEXT_PUBLIC_API_BASE=http://localhost:8000/api
make apps:restart   # frontend needs recreating - Next.js dev mode bakes NEXT_PUBLIC_* into the bundle at server start
```

`apps_backend`'s Host/Port/Path, edited right from Kong Manager's screen, is the seam: repoint it at a mock built from the same contract instead of the real backend, and neither `apps/frontend` nor any test hitting `/api/*` needs to change at all. An edit takes effect within a couple of seconds - no restart, no reset.

1. `make kong:open` (or open http://localhost:8002) → **Gateway Services** → `apps_backend` → **Edit**.
2. Set **Host** / **Port** / **Path** to one of the targets below, then **Save** (Host/Port here are Docker Compose **service names** on `apps-network`, not `localhost` - only resolvable from inside that network, which is why Kong itself joins it):

   | Target | Host | Port | Path |
   |---|---|---|---|
   | Real backend (default) | `backend` | `8080` | *(empty)* |
   | Specmatic's stub (`make specmatic:stub-up` first) | `specmatic-stub` | `9091` | *(empty)* |

3. `curl http://localhost:8000/api/accounts/balances` (or reload `apps/frontend`, if it's routed through Kong) to confirm - allow a couple of seconds for the change to propagate to Kong's own worker processes.
4. To go back to the real backend: edit `apps_backend` again, Host `backend` / Port `8080` / Path empty, **Save**.

Verified this way, not just described: every request during a real `make playwright:test` run against a Kong-routed frontend showed up in Kong's own access log going to `/api/*`, and pointing `apps_backend` at Specmatic's mock returned exactly the example values from `openapi.yaml`, confirmed via `curl` and Specmatic's own request log.

There's only ever one `apps_backend` service to edit — no separate service per backend/mock to flip between. (An earlier attempt registered three services, one per target, meant to be toggled by an "enabled" flag - that doesn't work: Kong's `Route` object has no `enabled` field, only `Service` does, and disabling a `Service` behind an already-matched `Route` doesn't fail over to another route.) If Kong Manager's edit doesn't seem to stick, or you just want a clean slate regardless of what got changed live, `make kong:reset` reloads everything straight from `kong/conf/declarative.yml`, which defaults `apps_backend` back to the real backend.

### Keycloak: a real login, and a real token the backend verifies

`apps/backend`'s `POST /accounts` is protected by `app/auth.py`'s `get_current_username` — until now, only satisfiable with a mock token from `POST /auth/login` (a username, no password). Keycloak adds a real OIDC login: the login page gets a **Demo login / Keycloak** toggle (with **Sign up**), you authenticate at Keycloak like you would with "Sign in with Google", and the backend accepts the JWT Keycloak issued on the exact same route. One variable turns on both the backend and the login page:

```bash
make apps:up
make keycloak:up
# .env: KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal
make apps:restart          # backend and frontend need recreating to pick it up
```

Then open http://localhost:5173, click Login, pick **Keycloak**, and sign in as `keycloak-demo` / `nasebanal-demo` (or **Sign up** for a new user — the form is Keycloak's own; `make keycloak:open` shows the user in the admin console). The user menu shows a Keycloak badge, and recording a transaction succeeds because the backend verified the token's signature against Keycloak's public keys.

Without a browser: `make keycloak:verify-apps` gets a token for the demo user (password grant) and sends it as `Authorization: Bearer` to `POST /accounts`; `make keycloak:login` just prints one, for trying by hand with curl. A token without a valid signature, or no token at all, gets a `401`. `KEYCLOAK_ISSUER` is the address the *browser* logs in at (and the `iss` every token carries); the backend fetches the signing keys from `KEYCLOAK_JWKS_URL` (default `http://keycloak:8080/...`, the in-network address). Setting `KEYCLOAK_ISSUER` back to empty and restarting returns to mock-token-only.

### Vault: the backend has no MySQL password - Vault creates a user for it

The backend normally logs in to MySQL with `APPS_MYSQL_PASSWORD` from `.env` (default `demo`). With Vault it doesn't have one at all: it asks Vault's **database secrets engine** for a credential at startup, and Vault creates a brand-new, short-lived MySQL user (`v-token-apps-backe-...`, random password, limited to `demo`) with a lease — and drops it again when the lease ends.

```bash
make apps:up
make vault:up
make vault:setup-mysql        # enable the engine + the apps-backend role (idempotent)
make vault:prove-needs-vault  # backend with NO password and NO Vault: "Access denied ... (using password: NO)"
make vault:verify-apps        # NO password but WITH Vault: logs in on a Vault-issued user
make vault:db-users           # the v-token-... users in MySQL itself
make vault:leases             # Vault's live leases for them
```

Both prove targets recreate the backend once with `BACKEND_MYSQL_PASSWORD` set but empty (and, for the second, `VAULT_ADDR`/`VAULT_TOKEN`) — `.env` is untouched. To do it by hand instead, set `BACKEND_MYSQL_PASSWORD=` (empty) in `.env` and `apps:restart` to watch the backend fail, then add `VAULT_ADDR=http://vault:8200` and `VAULT_TOKEN=nb-vault-root-token` and `apps:restart` again; each backend start gets a different Vault-issued user. `make apps:restart` after removing those lines returns to the normal configuration. The older static path still works as a fallback (`make vault:put-mysql-secret` writes a fixed credential to `secret/apps/mysql`).

Vault's dev server is in-memory only — everything written to it is gone on `vault:down`/`vault:restart`, by design (see `AGENTS.md`); users it already created stay in MySQL until `make apps:reset`.

### agentgateway: exposing apps/backend as MCP tools

`apps/backend` already mounts its own MCP server natively at `/mcp` (via `fastapi-mcp`, auto-derived from its REST routes - see [Endpoints](#endpoints)). agentgateway is a different way to get there: instead of backend-side MCP code, it builds MCP tools *entirely from the OpenAPI contract* (`apps/backend/openapi.yaml`) - the same contract Specmatic/Kong already build against, fetched live from `/openapi.json` (`agentgateway/config.yaml`'s `schema.url`, no separate fetch step needed).

```bash
make apps:up
make agentgateway:up
make agentgateway:tools   # does the MCP handshake by hand, lists what's actually being served
```

Verified end-to-end: `agentgateway:tools` lists six tools - `health_health_get`, `login_auth_login_post`, `list_accounts_accounts_get`, `create_account_accounts_post`, `list_balances_accounts_balances_get`, `get_account_accounts__account_id__get` - one per `openapi.yaml` operation, with names/descriptions taken straight from it. Calling `list_balances_accounts_balances_get` through the gateway (`POST /mcp`, `tools/call`) returned the same live balances `GET /accounts/balances` itself does - confirmed against a running `apps/backend` with real transaction data from earlier Locust/Specmatic runs already in it.

Point an MCP client (Claude Desktop, [mcp-inspector](https://github.com/modelcontextprotocol/inspector), ...) at `http://localhost:8010/mcp` to use it interactively. `create_account_accounts_post` needs a real bearer token, same as `POST /accounts` itself does everywhere else - call `login_auth_login_post` first and pass its token back as an `Authorization` header, or the tool call 401s the same way an unauthenticated `curl` would.

agentgateway also ships a real dashboard UI (a React SPA, built into the image by default - `Dockerfile`'s `CARGO_FEATURES=agentgateway-app/ui`), served off its **admin** port, separate from the MCP port above:

```bash
make agentgateway:open   # http://localhost:15000 -> redirects to /ui
```

Its admin port binds to loopback-only inside the container by default (`config.adminAddr`, unset) - unreachable from the host even with the port published, confirmed directly (`308` then nothing). `agentgateway/config.yaml` sets `config.adminAddr: 0.0.0.0:15000` so it actually answers on the port `docker-compose.yml` publishes.

agentgateway fetches `apps/backend`'s OpenAPI schema once, at its own startup - not lazily on first request. If `apps/backend` isn't actually accepting connections yet at that exact moment (e.g. it just restarted), agentgateway exits with `Error: fetch http://backend:8080/openapi.json ... Connection refused` instead of retrying - confirmed directly. `make agentgateway:restart` once `apps:up`'s backend is confirmed healthy resolves it.

### Observability: OpenTelemetry, Prometheus, Tempo and Grafana

`apps/backend` can export OpenTelemetry traces (FastAPI requests + SQLAlchemy queries), HTTP server metrics and application logs over OTLP. It's **off by default** - `apps:up` behaves exactly as before unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The `observability` module is the local place to send it: an OTel Collector receives OTLP, forwards traces to Tempo and logs to Loki and exposes metrics for Prometheus, and Grafana ships with the data sources and one dashboard already provisioned. Prometheus also evaluates alert rules (`observability/alert-rules.yml`) and sends firing alerts to Alertmanager, which routes them to a webhook sink that stands in for Slack/email - `make observability:alerts` shows the result.

```bash
# .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

make observability:up
make apps:restart          # backend reads the endpoint at startup
make locust:test           # or just click around the frontend
make observability:verify  # each component ready + nb-backend metrics/traces arrived
make observability:open    # Grafana -> NASEBANAL -> "Apps backend (OpenTelemetry)"
```

The dashboard shows request rate per path, 5xx ratio, p50/p95/p99 latency, active requests / DB connections in use, and recent traces (click through to the span waterfall, including each SQL query). `/health` is excluded from instrumentation, since healthchecks would otherwise dominate every panel.

The instrumentation is standard OTel SDK code (`apps/backend/app/telemetry.py`) that honors the usual `OTEL_*` env vars, so pointing `OTEL_EXPORTER_OTLP_ENDPOINT` (plus `OTEL_EXPORTER_OTLP_HEADERS`) at another OTLP backend such as NewRelic - which the real NASEBANAL apps use - works without code changes. Only the Collector's config (`observability/otel-collector.yaml`) is specific to the local stack.

Not covered here: the real Cloudflare Workers apps (`wrangler dev` doesn't export to Destinations, and Cloudflare can't reach a `localhost` collector), and Kafka metrics, and Kong's/agentgateway's metrics (each has its own Prometheus/OTel integration that could be added to `observability/prometheus.yml` / their own config). Kong and agentgateway do export **traces** to the same Collector (`opentelemetry` plugin on Kong's `apps_backend` service; `config.tracing` in `agentgateway/config.yaml`), and the trace context is passed on, so a request through either gateway is one trace with the backend's spans under the gateway's - see Scenario 4. The Grafana dashboard's bottom panel, "Gateway traces", lists them.

### Kafka bridge: comparing REST vs. Kafka-buffered ingestion

`make kafka:bridge-up` starts a small standalone consumer (`kafka/bridge/`) that reads events off the Kafka topic and forwards each one to a REST backend via `POST /accounts` — `apps/backend` by default, but `KAFKA_BRIDGE_TARGET_URL` can point anywhere, same as every other test tool's target host. It's deliberately separate from `kafka:up` (opt in explicitly) and lives in its own container rather than inside `apps/backend`, so a Kafka or backend outage only ever affects the bridge itself — it just retries forever, and only commits a Kafka offset after a successful delivery, so an outage pauses ingestion rather than losing events.

```bash
make apps:up
make kafka:up
make kafka:bridge-up
```

Two matching Locust scenarios make the case for putting Kafka in front of a write path at all — same event, same volume, two paths in. Use the **same** users / spawn rate for both; these are the settings where direct REST fails (single laptop, this repo's default limits: SQLAlchemy's default connection pool, a single `uvicorn` worker in `--reload` mode, 3 Locust workers):

| Users / spawn rate | Run time | Direct REST (`locustfile_http_overload.py`) | Via Kafka (`locustfile_kafka.py`) |
|---|---|---|---|
| 100 / 20 | 30s | 0% failures, but median already ~220ms (p95 ~570ms) - too light to show errors | - |
| **300 / 100** | 40s | **~30% failures**, median at the 30s DB-pool timeout | 1.66M events, **0% failures**, ~4ms median, backend `/health` ~3ms |
| **600 / 200** | 60s | **~79% failures** (500s, connection resets, 30s+ latency) | 1.24M events, **0% failures**, ~24ms median, backend `/health` ~2ms |

**Steps** (300 / 100 shown; swap in 600 / 200 / `60s` for the heavier run):

1. Start the target and the Kafka path (optionally Grafana too - set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` in `.env`, then `apps:restart`):
   ```bash
   make apps:up
   make kafka:up && make kafka:bridge-up
   make observability:up        # optional: watch it live at http://localhost:3030
   ```
2. **Direct REST - this is the one that errors:**
   ```bash
   make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s
   ```
   Or with the UI: `make locust:up LOCUST_FILE=locustfile_http_overload.py`, then enter `300` / `100` at http://localhost:8089.
3. **Wait for the backend to recover** before the next run. After a run this heavy it stays unresponsive for ~90s, until the DB-pool waits queued behind it time out:
   ```bash
   until curl -sf -m 5 http://localhost:8080/health >/dev/null; do sleep 10; done
   ```
4. **The same load through Kafka:**
   ```bash
   make locust:test LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s
   ```
   (`make locust:up LOCUST_FILE=locustfile_kafka.py` + the same `300` / `100` in the UI works too. To switch between the two cleanly in UI mode, use `make locust:restart`.)
5. **Compare**: `Failure Count` per row in `locust/logs/<timestamp>/locust_stats.csv` (or that run's `report.html`), and `curl -w '%{time_total}\n' http://localhost:8080/health` while each runs. In Grafana ("Apps backend (OpenTelemetry)"): 5xx ratio, p95 latency and DB connections used spike during step 2 and stay flat during step 4.

Kafka stays flat because `kafka-bridge` drains the topic at its own steady, sequential pace and never forwards a burst to the backend. That also means the topic keeps draining into the backend long after step 4 ends (right after a 300 / 100 run, the bridge's consumer lag was still ~1.6M events - check with `docker exec nb-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --all-groups`); `make kafka:reset` clears the backlog before a fresh comparison.

### Locust load testing scenarios

Load tests are driven by `make locust:up` (UI mode - start containers, then
configure and launch the test from the browser at http://localhost:8089) or
`make locust:test` (headless - starts immediately, no UI, bounded by
`LOCUST_RUN_TIME`). Pick the test by setting `LOCUST_FILE` (which test) and
optionally `LOCUST_TAGS` (which subset) — in `.env` or on the command line.
To switch test types cleanly, use `make locust:restart` (or `make
locust:down` then `make locust:up`). For the full list of tunable env vars, see
[Locust](#locust) in Configuration.

```bash
# HTTP Load Testing
make locust:up LOCUST_FILE=locustfile_http.py
make locust:up LOCUST_FILE=locustfile_http.py LOCUST_TAGS=http-root
make locust:up LOCUST_FILE=locustfile_http.py LOCUST_TAGS=http-login

# GraphQL Load Testing
make locust:up LOCUST_FILE=locustfile_graphql.py
make locust:up LOCUST_FILE=locustfile_graphql.py LOCUST_TAGS=graphql-query
make locust:up LOCUST_FILE=locustfile_graphql.py LOCUST_TAGS=graphql-mutation

# MySQL Load Testing
make locust:up LOCUST_FILE=locustfile_mysql.py
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_TAGS=mysql-select
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_TAGS=mysql-cartesian
```

> `make locust:up` no longer starts the target apps. Run `make apps:up`
> first to target the bundled apps, or point `LOCUST_HTTP_HOST`/
> `LOCUST_MYSQL_HOST` at an external host instead.

> **Warning: `make locust:test` runs without user intervention.**
> It starts the load test automatically (headless, no UI) and continues until explicitly stopped.
> **Always set `LOCUST_RUN_TIME`** to limit the test duration and prevent unintended sustained load on the target system.
> If `LOCUST_RUN_TIME` is not set, `make locust:test` will exit with an error to avoid runaway load tests.

### Cluster load testing

Distributed load testing across multiple PCs:

**Master (PC1):**
```bash
make apps:up
make locust:up LOCUST_FILE=locustfile_http.py
# Access UI at http://localhost:8089
```

**Workers (PC2+):**
```bash
make locust:join-cluster LOCUST_MASTER_HOST=<PC1-IP> LOCUST_WORKERS=5
```

**Requirements:**
- Network connectivity between master and workers
- Ports 8089 (UI), 5557 (master-worker communication), 5558 (master-worker communication) accessible
- Same `LOCUST_FILE` on all machines

### OWASP ZAP: scanning apps for vulnerabilities

Three scans, all one-shot (`docker compose run --rm`, no `up`/`down`) and all requiring `make apps:up` first:

```bash
make apps:up
make zap:baseline    # passive scan of apps/frontend - spiders + observes, never attacks (~1-2 min)
```

```bash
make zap:full-scan   # active scan of apps/frontend - sends real attack payloads (SQLi, XSS, ...), several minutes+
```

```bash
make zap:api-scan    # scans apps/backend directly from its live OpenAPI schema (apps/backend/openapi.yaml) - endpoint-aware, so it exercises every documented route, not just what a spider happens to crawl
```

```bash
make zap:scan        # runs all three above in sequence, stops at the first one that fails
make zap:stop        # kills a scan that's running elsewhere (another shell, a background job) - Ctrl+C works fine for one running in your own terminal
```

Verified end-to-end against this repo's own `apps`: `baseline` found 12 WARN-level findings (missing security headers like CSP/`X-Content-Type-Options`, mostly - `apps/frontend` is a dev-mode Next.js server, not hardened for production) and 0 FAIL; `api-scan` ran every active rule (SQLi, XXE, command injection, SSTI, ...) against every `apps/backend` route from the OpenAPI schema and came back 116 PASS, 2 WARN (the same missing-header class), 0 FAIL.

Same pass/fail convention as `pytest`/`specmatic`: a real (non-INFO) alert exits non-zero, so `zap:baseline` etc. can gate a pipeline the same way; see `zap/report/<scan>-report.html` for what was actually found.

**`zap:full-scan` and `zap:api-scan` send real attack payloads** - only ever point these at `apps` (this repo's own bundled test target, exactly what the Makefile does), never at an external host. Unlike Locust or Playwright, `zap`'s targets aren't overridable via an env var for this reason - there's no `ZAP_TARGET_URL` to accidentally repoint at production.

**`zap:full-scan` can overload `apps/frontend`'s dev server.** Confirmed directly: a full scan's attack payloads against the many hashed `_next/static/*` asset URLs a Next.js dev server (Turbopack) generates drove it into a recompile/cache-rewrite loop, pinning the container's CPU at 800%+ - it stayed unresponsive even after the scan itself was stopped, and needed `docker compose -p apps -f apps/docker-compose.yml restart frontend` to recover. Use `zap:stop` to kill a runaway scan, and restart `apps/frontend` afterward if it's still unresponsive.

## ⚙️ Configuration

Every module reads its settings from one `.env` file at the repo root (`cp .env.example .env` first - see [Getting Started](#-getting-started)). Below are each module's main parameters; `.env.example` has the full list, including lower-level ones (Kafka's KRaft/listener settings, image versions, MySQL credentials, ...) most people never need to touch. Override any of them via `.env` or inline on the command line:

```bash
make kong:up
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_MYSQL_HOST=prod-db
```

`apps/` holds the actual apps under test - `apps/backend` (FastAPI: REST + GraphQL + an MCP server, over a MySQL-backed accounting ledger), `apps/frontend` (Next.js), and `mysql-server`. Its lifecycle is independent from every test tool - `apps:up`/`apps:down` only, never started or stopped automatically by pytest/vitest/playwright/specmatic/locust/etc. See the [Endpoints](#endpoints) table above for every URL it exposes once up, and `AGENTS.md` for the full architecture writeup.

### Apps

| Variable | Default | Description |
|---|---|---|
| `APPS_MYSQL_USER` / `APPS_MYSQL_PASSWORD` | `demo` / `demo` | The application's MySQL login. Used by `apps/backend`, the SQL client, the Vault module and Locust's MySQL scenario. Created when the data volume is first initialised - changing them later needs `make apps:reset`. A blank value falls back to the default; it does **not** mean "no password" |
| `APPS_MYSQL_DATABASE` / `APPS_MYSQL_ROOT_PASSWORD` | `demo` / `rootpassword` | The database name, and the root password (used by the SQL client and `make apps:mysql`) |
| `APPS_MYSQL_PORT` / `APPS_MYSQL_VERSION` | `3306` / `8.4.7` | Host-published MySQL port, and the image version |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080` | Where `apps/frontend` calls the backend - direct, or `http://localhost:8000/api` to route through Kong instead (needs `kong:up` + `apps:restart`) |
| `NEXT_PUBLIC_KAFKA_BRIDGE_HEALTH_URL` | `http://localhost:8090` | Where the frontend checks kafka-bridge's health - see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion) |
| `KEYCLOAK_ISSUER` | *(empty = off)* | Turns on Keycloak for `apps/backend` and the login page: `http://localhost:8180/realms/nasebanal` - see [Keycloak](#keycloak) |
| `VAULT_ADDR` / `VAULT_TOKEN` | *(both empty = off)* | Where `apps/backend` asks for a Vault-issued MySQL credential - see [Vault](#vault) |

### Kong

| Variable | Default | Description |
|---|---|---|
| `KONG_DB` | `postgres` | `postgres` (DB mode - needed for Kong Manager edits to stick) or `off` (DB-less, reads `kong/conf/declarative.yml` only) |
| `KONG_VERSION` | `3.6.1` | Kong Docker image tag |
| `KONG_PG_USER` / `KONG_PG_PASSWORD` / `KONG_PG_DATABASE` | `kong` / `kongpass` / `kong` | Postgres credentials, `KONG_DB=postgres` mode only |

### Kafka

| Variable | Default | Description |
|---|---|---|
| `KAFKA_PORT` | `9092` | Host-published broker port |
| `KAFKA_TOPIC_NAME` | `quickstart-events` | Topic `kafka:add-topics` creates and everything else reads/writes |
| `KAFKA_TOPIC_PARTITIONS` | `1` | Partition count for that topic |
| `KAFKA_BRIDGE_TARGET_URL` | `http://backend:8080` | Where kafka-bridge forwards events via `POST /accounts` - see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion) |
| `KAFKA_BRIDGE_HEALTH_PORT` | `8090` | kafka-bridge's own `/health` port |

### Keycloak

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_PORT` | `8180` | Host-published admin console / realm port |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | `admin` / `admin` | Admin console login |
| `KEYCLOAK_ISSUER` (an `apps` variable - see [Apps](#apps) below) | *(empty = off)* | Turns on Keycloak for `apps/backend` and the login page - `http://localhost:8180/realms/nasebanal` (the address the browser logs in at; match `KEYCLOAK_PORT`), plus `apps:restart` |

### Vault

| Variable | Default | Description |
|---|---|---|
| `VAULT_PORT` | `8200` | Host-published UI / API port |
| `VAULT_ROOT_TOKEN` | `nb-vault-root-token` | Dev-mode root token |
| `VAULT_ADDR` / `VAULT_TOKEN` (`apps` variables - see [Apps](#apps) below) | *(both empty = off)* | Where `apps/backend` asks for a Vault-issued MySQL credential - `http://vault:8200` / `nb-vault-root-token` to turn it on (plus `apps:restart`); `make vault:verify-apps` sets them for one recreate instead |

### Specmatic & Playwright

| Variable | Default | Description |
|---|---|---|
| `SPECMATIC_STUB_PORT` | `9091` | `specmatic:stub-up`'s mock server port |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` | URL Playwright navigates to (runs on the host network, not `apps-network`) |

### Locust

| Variable | Default | Description |
|---|---|---|
| `LOCUST_FILE` | `locustfile_http.py` | Which scenario to run - see [Locust load testing scenarios](#locust-load-testing-scenarios) |
| `LOCUST_TAGS` | *(empty)* | Filter to a subset of tasks within that file |
| `LOCUST_WORKERS` | `5` | Number of worker containers |
| `LOCUST_USERS` | `10` | Concurrent simulated users (also settable from the UI in `locust:up`) |
| `LOCUST_SPAWN_RATE` | `1` | Users spawned per second |
| `LOCUST_RUN_TIME` | *(empty)* | **Required** for `locust:test` (headless) - e.g. `60s`, `1h30m` |
| `LOCUST_HTTP_HOST` | `http://backend:8080` | Target for the HTTP/GraphQL scenarios |
| `LOCUST_MYSQL_HOST` | `mysql-server` | Target for the MySQL scenario |
| `LOCUST_MASTER_HOST` | *(unset)* | Master's IP, for `locust:join-cluster` from another PC - see [Cluster load testing](#cluster-load-testing) |

Any of the target-host variables (`LOCUST_HTTP_HOST`, `LOCUST_MYSQL_HOST`, ...) can point at an external host instead of the bundled apps, without starting `apps` at all:

```bash
make locust:up LOCUST_FILE=locustfile_http.py LOCUST_HTTP_HOST=https://staging.example.com
```

### ZAP

| Variable | Default | Description |
|---|---|---|
| `ZAP_VERSION` | `2.17.0` | `zaproxy/zap-stable` image tag |

No target-host variable, unlike every module above - see [OWASP ZAP: scanning apps for vulnerabilities](#owasp-zap-scanning-apps-for-vulnerabilities) for why.

### agentgateway

| Variable | Default | Description |
|---|---|---|
| `AGENTGATEWAY_VERSION` | `v1.5.0` | `cr.agentgateway.dev/agentgateway` image tag |
| `AGENTGATEWAY_PORT` | `8010` | Host-published MCP endpoint port - defaults away from agentgateway's own `3000` default, a common Node/React dev-server port already likely to be taken on the host |
| `AGENTGATEWAY_ADMIN_PORT` | `15000` | Host-published dashboard UI / admin API port |

### Observability

| Variable | Default | Description |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | *(empty = off)* | Where `apps/backend` exports OTLP. Set to `http://otel-collector:4318` for the local stack (needs `apps:restart`) |
| `GRAFANA_PORT` | `3030` | Host-published Grafana port - defaults away from Grafana's own `3000`, a common Node/React dev-server port |
| `PROMETHEUS_PORT` | `9094` | Host-published Prometheus port (`9091` is taken by Specmatic) |
| `TEMPO_PORT` | `3200` | Host-published Tempo query API port |
| `OTEL_GRPC_PORT` / `OTEL_HTTP_PORT` | `4317` / `4318` | Host-published OTLP ports |
| `PROMETHEUS_RETENTION` | `7d` | How long Prometheus keeps metrics |
| `OTEL_COLLECTOR_VERSION` / `PROMETHEUS_VERSION` / `TEMPO_VERSION` / `GRAFANA_VERSION` | see `.env.example` | Image tags |

### Test Results

Every `make <module>:test` run leaves a browsable report behind. These are all gitignored - regenerated on every run, never checked in:

| Module | Report file(s) |
|---|---|
| `pytest` | `pytest/report/report.html` |
| `vitest` | `vitest/report/index.html` |
| `vitest:contract-test` | `vitest/report-contract/index.html` |
| `playwright` | `playwright/report/index.html` |
| `specmatic` | `specmatic/report/html/index.html`, plus `specmatic/junit/TEST-junit-jupiter.xml` |
| `locust` | `locust/logs/<timestamp>/report.html`, plus the files below |
| `zap` | `zap/report/<scan>-report.html` (also `.json`) - `baseline`/`full-scan`/`api-scan`, overwritten each run |

**Locust** writes a whole timestamped directory per run, `locust/logs/YYYYMMDD_HHMMSS/`:

- `target_host.txt` - the run's own config (target host, locustfile, tags, workers)
- `result.log` / `master.log` - container output / Locust framework logs
- `debug.log` - worker debug messages (only if `LOCUST_DEBUG_MODE=true`)
- `locust_stats.csv` / `locust_stats_history.csv` - current aggregated stats / time-series data (appended every second)
- `locust_failures.csv` / `locust_exceptions.csv` - failure and exception records
- `report.html` - the final test report

### Persistent state / reset

`apps`, `kong`, `kafka`, and `observability` each keep their data in a named
Docker volume, so a plain `down`/`restart` preserves it. Each has its own
`reset` command that wipes that volume and starts fresh (`make all:reset`
runs all four, plus a plain restart for `locust`, which holds no
persistent state to begin with):

| Module | What persists | Docker volume | Reset command |
| --- | --- | --- | --- |
| `apps` | MySQL data (`demo`) | `apps_apps-db-data` | `make apps:reset` |
| `kong` | Gateway services/routes (`KONG_DB=postgres` mode only) | `kong_kong-db-data` | `make kong:reset` |
| `kafka` | Topics and their messages | `kafka_kafka-data` | `make kafka:reset` |
| `observability` | Prometheus metrics, Tempo traces, Loki logs, Alertmanager state, Grafana state | `observability_prometheus-data`, `observability_tempo-data`, `observability_loki-data`, `observability_alertmanager-data`, `observability_grafana-data` | `make observability:reset` |

These are Docker-managed volumes, not host directories — there's no
`./data/...` folder in this repo to go look at. Inspect one with
`docker volume inspect <name>` (its `Mountpoint` is a path inside Docker
Desktop's own VM, not your machine's filesystem directly); on macOS,
everything Docker manages ultimately lives inside one shared virtual disk
image at `~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`.

### Test/verification tools

These are separate modules from `apps` (see `AGENTS.md` for the full design). Long-running services follow the usual `build`/`up`/`down`/`status`/`restart`/`open` pattern; one-shot test runners use a single `test` target instead (`docker compose run --rm`, no `up`/`down`).

```bash
make apps:up                # start the apps under test first

make pytest:test            # apps/backend unit tests (in-memory SQLite, apps:up not required)
make vitest:test            # apps/frontend unit tests (fetch mocked, apps:up not required)
make playwright:test        # E2E browser test against the running frontend (requires apps:up)
make specmatic:test         # Provider contract test: does the backend honor apps/backend/openapi.yaml? (requires apps:up)

make specmatic:stub-up      # mock server built from the same contract (requires apps:up)
make vitest:contract-test   # Consumer contract test: does the frontend's API usage hold up against it?

```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 NASEBANAL

### Trademarks

The MIT License covers the code in this repository. It does not grant any right to use the "NASEBANAL" name, the "NASEBANAL Stack" name, or the NASEBANAL logo. You are welcome to fork and modify this project, but please do not use these names or logos in a way that suggests your modified version is the official NASEBANAL project or is endorsed by NASEBANAL. Keep the copyright notice and license text as required by the MIT License.

Other product names mentioned in this repository (Kong, Kafka, Keycloak, Vault, etc.) are trademarks of their respective owners.
