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
- **[Consul](https://www.consul.io/)** — service registry/discovery
- **[Vitest](https://vitest.dev/)** — `apps/frontend` unit tests
- **[pytest](https://docs.pytest.org/)** — `apps/backend` unit tests
- **[Playwright](https://playwright.dev/)** — E2E browser tests
- **[Specmatic](https://specmatic.io/)** — OpenAPI contract tests
- **[Microcks](https://microcks.io/)** — API mocking, seeded from `apps/backend`'s OpenAPI schema
- **[Locust](https://locust.io/)** — load testing
- **[OWASP ZAP](https://www.zaproxy.org/)** — web app vulnerability scanning (DAST)
- **[agentgateway](https://agentgateway.dev/)** — MCP/A2A gateway for AI agent connectivity
- **[Observability](#observability-opentelemetry-prometheus-tempo-and-grafana)** — [OpenTelemetry](https://opentelemetry.io/) Collector + [Prometheus](https://prometheus.io/) + [Tempo](https://grafana.com/oss/tempo/) + [Grafana](https://grafana.com/oss/grafana/), receiving OTLP from `apps/backend`

### Endpoints

Every module prints its own "Endpoints once started" block from `make <module>:up` (or plain `make <module>`) - this is the same information gathered in one place, across every module, for reference without starting anything. The "Host-published" column is reachable from your host machine (browser, `curl`, etc.); the "Container network hostname" column is the Docker Compose **service name** - only resolvable from *inside* `apps-network` (i.e. from another container joined to it, e.g. Kong's `apps_backend` service, or one test tool container calling another) - not from your host machine, and often a different port than the host-published one. A module needs to actually be up (`make <module>:up`) for its own row to answer either way.

| Module | Endpoint | Host-published | Container network hostname | Notes |
|---|---|---|---|---|
| apps | Frontend | http://localhost:5173 | `frontend:5173` | Next.js |
| apps | API docs (Scalar) | http://localhost:5173/api-specs | `frontend:5173/api-specs` | Reads the backend's live OpenAPI schema |
| apps | Backend REST | http://localhost:8080 | `backend:8080` | FastAPI |
| apps | Backend GraphQL | http://localhost:8080/graphql | `backend:8080/graphql` | Strawberry |
| apps | MCP server | http://localhost:8080/mcp | `backend:8080/mcp` | Streamable HTTP |
| apps | MySQL | localhost:3306 | `mysql-server:3306` | database `testdb` |
| Kong | Proxy | http://localhost:8000 | `kong:8000` | HTTPS: 8443 (host), `kong:8443` (in-network) |
| Kong | Proxy `/api/*` | http://localhost:8000/api/accounts | `kong:8000/api/accounts` | -> `apps_backend` (real backend by default - see [Kong: routing...](#kong-routing-to-the-real-backend-or-to-a-contract-mock-instead)), needs `apps:up` |
| Kong | Proxy `/mock`, `/echo/get` | http://localhost:8000/mock, http://localhost:8000/echo/get | `kong:8000/mock`, `kong:8000/echo/get` | httpbin-backed demo routes, no dependency on `apps` |
| Kong | Admin API | http://localhost:8001 | `kong:8001` | HTTPS: 8444 (host), `kong:8444` (in-network) |
| Kong | Manager UI | http://localhost:8002 | `kong:8002` | HTTPS: 8445 (host), `kong:8445` (in-network); edits need `KONG_DB=postgres` |
| Kafka | Broker | localhost:9092 | `kafka:29092` | `KAFKA_PORT`; the in-network listener is a *different* port (`29092`, `PLAINTEXT_INTERNAL`) than the host-published one (`9092`, `PLAINTEXT`) - see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS` comment |
| Kafka | kafka-bridge health | http://localhost:8090/health | `kafka-bridge:8090/health` | Only once `kafka:bridge-up` has run; `KAFKA_BRIDGE_HEALTH_PORT` |
| Specmatic | Mock server | http://localhost:9091 | `specmatic-stub:9091` | `SPECMATIC_STUB_PORT`; needs `apps:up` first (`make specmatic:stub-up`) |
| Microcks | UI / mock API | http://localhost:9090 | `microcks:8080` | `MICROCKS_PORT` maps to a *different* in-network port (`8080`) - see `microcks/docker-compose.yml` |
| Consul | HTTP API / UI | http://localhost:8500 | `consul:8500` | `CONSUL_HTTP_PORT` |
| Consul | DNS | localhost:8600 | `consul:8600` | `CONSUL_DNS_PORT` |
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
   make microcks:up

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

   # Consul (register apps' backend/mysql - needs apps:up)
   make consul:up
   make consul:register-apps
   make consul:verify-apps
   make consul:open

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

`openapi.yaml` also carries its own inline `examples:` (named, matching keys between request and response) for the read operations — separate from `prepare_contract.sh`'s dynamically-generated ones, and there for a different consumer: Microcks, below.

### Kong: routing to the real backend, or to a contract mock instead

`apps_backend` (Kong Manager → **Gateway Services**) proxies `http://localhost:8000/api/*` to `apps/backend`'s own root (`strip_path: true`, so `/api/accounts` reaches `backend:8080/accounts`). `apps/frontend` can go through it instead of calling the backend directly:

```bash
make kong:up KONG_DB=postgres   # Kong Manager needs DB mode - the default DB-less mode's Admin API is read-only, so it can display apps_backend but can't save an edit to it
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
   | Microcks (`make microcks:up` + `make microcks:import-openapi` first) | `microcks` | `8080` | `/rest/nb-quickstarts+apps+backend/0.1.0` |

3. `curl http://localhost:8000/api/accounts/balances` (or reload `apps/frontend`, if it's routed through Kong) to confirm - allow a couple of seconds for the change to propagate to Kong's own worker processes.
4. To go back to the real backend: edit `apps_backend` again, Host `backend` / Port `8080` / Path empty, **Save**.

Microcks can't mock `POST /accounts` - it needs a real bearer token, which an OpenAPI example has no way to carry (a header, not part of the request body) - but its read endpoints (`/health`, `/auth/login`, `GET /accounts`, `GET /accounts/balances`, `GET /accounts/{account_id}`) work fine, serving `openapi.yaml`'s inline examples.

Verified this way, not just described: every request during a real `make playwright:test` run against a Kong-routed frontend showed up in Kong's own access log going to `/api/*`, and pointing `apps_backend` at each mock in turn returned exactly the example values from `openapi.yaml`, confirmed via `curl` and Microcks'/Specmatic's own request logs.

There's only ever one `apps_backend` service to edit — no separate service per backend/mock to flip between. (An earlier attempt registered three services, one per target, meant to be toggled by an "enabled" flag - that doesn't work: Kong's `Route` object has no `enabled` field, only `Service` does, and disabling a `Service` behind an already-matched `Route` doesn't fail over to another route.) If Kong Manager's edit doesn't seem to stick, or you just want a clean slate regardless of what got changed live, `make kong:reset` reloads everything straight from `kong/conf/declarative.yml`, which defaults `apps_backend` back to the real backend.

### agentgateway: exposing apps/backend as MCP tools

`apps/backend` already mounts its own MCP server natively at `/mcp` (via `fastapi-mcp`, auto-derived from its REST routes - see [Endpoints](#endpoints)). agentgateway is a different way to get there: instead of backend-side MCP code, it builds MCP tools *entirely from the OpenAPI contract* (`apps/backend/openapi.yaml`) - the same contract Specmatic/Microcks/Kong already build against, fetched live from `/openapi.json` (`agentgateway/config.yaml`'s `schema.url`, no separate fetch step needed).

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

`apps/backend` can export OpenTelemetry traces (FastAPI requests + SQLAlchemy queries) and HTTP server metrics over OTLP. It's **off by default** - `apps:up` behaves exactly as before unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The `observability` module is the local place to send it: an OTel Collector receives OTLP, forwards traces to Tempo and exposes metrics for Prometheus, and Grafana ships with the data sources and one dashboard already provisioned.

```bash
# .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

make observability:up
make apps:restart          # backend reads the endpoint at startup
make locust:test           # or just click around the frontend
make observability:verify  # each component ready + nb-backend metrics/traces arrived
make observability:open    # Grafana -> NASEBANAL -> "Apps backend (OpenTelemetry)"
```

The dashboard shows request rate per path, 5xx ratio, p50/p95/p99 latency, active requests / DB connections in use, and recent traces (click through to the span waterfall, including each SQL query). `/health` is excluded from instrumentation, since Consul and healthchecks would otherwise dominate every panel.

The instrumentation is standard OTel SDK code (`apps/backend/app/telemetry.py`) that honors the usual `OTEL_*` env vars, so pointing `OTEL_EXPORTER_OTLP_ENDPOINT` (plus `OTEL_EXPORTER_OTLP_HEADERS`) at another OTLP backend such as NewRelic - which the real NASEBANAL apps use - works without code changes. Only the Collector's config (`observability/otel-collector.yaml`) is specific to the local stack.

Not covered here: the real Cloudflare Workers apps (`wrangler dev` doesn't export to Destinations, and Cloudflare can't reach a `localhost` collector), and Kong/Consul/agentgateway/Kafka metrics (each has its own Prometheus/OTel integration that could be added to `observability/prometheus.yml` / their own config).

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
make kong:up KONG_DB=postgres
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_MYSQL_HOST=prod-db
```

`apps/` holds the actual apps under test - `apps/backend` (FastAPI: REST + GraphQL + an MCP server, over a MySQL-backed accounting ledger), `apps/frontend` (Next.js), and `mysql-server`. Its lifecycle is independent from every test tool - `apps:up`/`apps:down` only, never started or stopped automatically by pytest/vitest/playwright/specmatic/locust/etc. See the [Endpoints](#endpoints) table above for every URL it exposes once up, and `AGENTS.md` for the full architecture writeup.

### Apps

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080` | Where `apps/frontend` calls the backend - direct, or `http://localhost:8000/api` to route through Kong instead (needs `kong:up` + `apps:restart`) |
| `NEXT_PUBLIC_KAFKA_BRIDGE_HEALTH_URL` | `http://localhost:8090` | Where the frontend checks kafka-bridge's health - see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion) |

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

### Consul

| Variable | Default | Description |
|---|---|---|
| `CONSUL_HTTP_PORT` | `8500` | HTTP API / UI |
| `CONSUL_DNS_PORT` | `8600` | DNS interface |

### Specmatic, Microcks & Playwright

| Variable | Default | Description |
|---|---|---|
| `SPECMATIC_STUB_PORT` | `9091` | `specmatic:stub-up`'s mock server port |
| `MICROCKS_PORT` | `9090` | Microcks UI / mock API port |
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
| `PROMETHEUS_PORT` | `9094` | Host-published Prometheus port (`9090`/`9091` are taken by Microcks/Specmatic) |
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

`apps`, `kong`, `kafka`, `consul`, and `observability` each keep their data in a named
Docker volume, so a plain `down`/`restart` preserves it. Each has its own
`reset` command that wipes that volume and starts fresh (`make all:reset`
runs all five, plus a plain restart for `microcks`/`locust`, which hold no
persistent state to begin with):

| Module | What persists | Docker volume | Reset command |
| --- | --- | --- | --- |
| `apps` | MySQL data (`testdb`) | `apps_apps-db-data` | `make apps:reset` |
| `kong` | Gateway services/routes (`KONG_DB=postgres` mode only) | `kong_kong-db-data` | `make kong:reset` |
| `kafka` | Topics and their messages | `kafka_kafka-data` | `make kafka:reset` |
| `consul` | Service catalog/registrations | `consul_consul-data`, `consul_consul-config` | `make consul:reset` |
| `observability` | Prometheus metrics, Tempo traces, Grafana state | `observability_prometheus-data`, `observability_tempo-data`, `observability_grafana-data` | `make observability:reset` |

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

make microcks:up            # long-running mock server
make microcks:import-openapi # fetches the backend's live OpenAPI schema and loads it (requires apps:up)
make microcks:open
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 NASEBANAL
