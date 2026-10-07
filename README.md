# NASEBANAL Quickstarts

**NASEBANAL Quickstarts helps you verify how the [NASEBANAL Stack](https://www.nasebanal.com) actually behaves** — the proven open-source technologies NASEBANAL builds on, not a scaffold for every technology out there. Each module spins up one piece of that stack (or a tool that verifies it) via Docker Compose + `make`, so you can try it, test against it, and see how the pieces fit together. Like the constituents of the NASEBANAL Stack itself, which modules are here may change as the stack evolves.

[![NASEBANAL Quickstarts - Quick Demo (YouTube)](https://img.youtube.com/vi/Yf3kcHc-vGQ/hqdefault.jpg)](https://youtu.be/Yf3kcHc-vGQ)

▶ [Watch the quick demo on YouTube](https://youtu.be/Yf3kcHc-vGQ)

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

**Authentication**: every route needs an access token (an RS256 JWT from `POST /auth/login`, or a Keycloak one), except `/health`, `/auth/login`, `/.well-known/jwks.json` (the public key that verifies the tokens) and the MCP login's OAuth plumbing. `/graphql` and `/mcp` need one too. The contract (`shared/openapi/openapi.yaml`) says so with a global `security` and a `401` on every protected operation.

Every module prints its own "Endpoints once started" block from `make <module>:up` (or plain `make <module>`) - this is the same information gathered in one place, across every module, for reference without starting anything. The "Host-published" column is reachable from your host machine (browser, `curl`, etc.); the "Container network hostname" column is the Docker Compose **service name** - only resolvable from *inside* `apps-network` (i.e. from another container joined to it, e.g. Kong's `apps_backend` service, or one test tool container calling another) - not from your host machine, and often a different port than the host-published one. A module needs to actually be up (`make <module>:up`) for its own row to answer either way.

| Module | Endpoint | Host-published | Container network hostname | Notes |
|---|---|---|---|---|
| apps | Frontend | http://localhost:5173 | `frontend:5173` | Next.js |
| apps | API docs (Scalar) | http://localhost:5173/api-specs | `frontend:5173/api-specs` | Reads the contract straight from `shared/openapi/openapi.yaml` (no backend needed) |
| apps | Docs | http://localhost:5173/docs | `frontend:5173/docs` | Overview (purpose, structure, scenarios), Getting Started and eight scenarios starting with verification of the demo app - same Header/Footer as `/`, opens in a new tab from the header's "Docs" link |
| apps | Backend REST | http://localhost:8080 | `backend:8080` | FastAPI |
| apps | Backend GraphQL | http://localhost:8080/graphql | `backend:8080/graphql` | Strawberry |
| apps | MCP server | http://localhost:8080/mcp | `backend:8080/mcp` | Streamable HTTP |
| apps | MCP login (OAuth) | http://localhost:8080/.well-known/oauth-authorization-server, `/oauth/register`, `/oauth/authorize`, `/oauth/token` | `backend:8080/...` | On by default (`APPS_MCP_AUTH_REQUIRED=false` turns it off) - see [Also from Claude](#also-from-claude-or-another-mcp-client). Not part of the OpenAPI contract, and left out of the MCP tool list |
| apps | MCP login page | http://localhost:5173/mcp-authorize | `frontend:5173/mcp-authorize` | Where an MCP client's browser login lands (sign in, then **Allow**) |
| apps | MySQL | localhost:3306 | `mysql-server:3306` | database `demo` |
| Kong | Proxy | http://localhost:8000 | `kong:8000` | HTTPS: 8443 (host), `kong:8443` (in-network) |
| Kong | Proxy `/api/*` | http://localhost:8000/api/accounts | `kong:8000/api/accounts` | -> `apps_backend` (real backend by default - see [Kong: routing...](#kong-routing-to-the-real-backend-or-to-a-contract-mock-instead)), needs `apps:up` |
| Kong | Proxy `/mock`, `/echo/get` | http://localhost:8000/mock, http://localhost:8000/echo/get | `kong:8000/mock`, `kong:8000/echo/get` | httpbin-backed demo routes, no dependency on `apps` |
| Kong | Admin API | http://localhost:8001 | `kong:8001` | HTTPS: 8444 (host), `kong:8444` (in-network) |
| Kong | Manager UI | http://localhost:8002 | `kong:8002` | HTTPS: 8445 (host), `kong:8445` (in-network); edits need DB mode (the default) |
| Kafka | Broker | localhost:9092 | `kafka:29092` | `KAFKA_PORT`; the in-network listener is a *different* port (`29092`, `PLAINTEXT_INTERNAL`) than the host-published one (`9092`, `PLAINTEXT`) - see `kafka/docker-compose.yml`'s `KAFKA_LISTENERS` comment |
| Kafka | kafka-bridge health | http://localhost:8090/health | `kafka-bridge:8090/health` | Only once `kafka:bridge-up` has run; `KAFKA_BRIDGE_HEALTH_PORT` |
| Specmatic | Mock server | http://localhost:9091 | `specmatic-mock:9091` | `SPECMATIC_MOCK_PORT`; reads the checked-in shared contract and starts without `apps:up` (`make specmatic:mock-up`) |
| Keycloak | Admin console | http://localhost:8180/admin | `keycloak:8080/admin` | `KEYCLOAK_PORT`; realm `nasebanal`, admin/admin by default |
| Keycloak | Token endpoint (realm `nasebanal`) | http://localhost:8180/realms/nasebanal/... | `keycloak:8080/realms/nasebanal/...` | Client `apps-demo`, user `keycloak-demo` / `nasebanal-demo` - see [Keycloak: a real login, and a real token the backend verifies](#keycloak-a-real-login-and-a-real-token-the-backend-verifies) |
| Vault | UI / API | http://localhost:8200 | `vault:8200` | `VAULT_PORT`; dev-mode root token `VAULT_ROOT_TOKEN` |
| Locust | Web UI | http://localhost:8089 | `locust-master:8089` | |
| MCP Inspector | Web UI | http://localhost:6274 | `mcp-inspector:6274` | `APPS_MCP_INSPECTOR_PORT`; started by `apps:up`, opened by `make apps:mcp`; lists the backend's `/mcp` and agentgateway's `/mcp` (`apps/mcp-inspector/config.json`) |
| agentgateway | MCP (Streamable HTTP) | http://localhost:8010/mcp | `agentgateway:3000/mcp` | `AGENTGATEWAY_PORT`; reads `shared/openapi/openapi.yaml`; tool calls need `apps:up` |
| agentgateway | Dashboard UI | http://localhost:15000 | `agentgateway:15000` | `AGENTGATEWAY_ADMIN_PORT`; redirects to `/ui` |
| Observability | Grafana | http://localhost:3030 | `grafana:3000` | `OBSERVABILITY_GRAFANA_PORT`; anonymous Admin, no login; dashboard "Apps backend (OpenTelemetry)" is pre-provisioned |
| Observability | Prometheus | http://localhost:9094 | `prometheus:9090` | `OBSERVABILITY_PROMETHEUS_PORT` |
| Observability | Tempo (query API) | http://localhost:3200 | `tempo:3200` | `OBSERVABILITY_TEMPO_PORT` |
| Observability | OTLP (HTTP / gRPC) | http://localhost:4318, localhost:4317 | `otel-collector:4318`, `otel-collector:4317` | `OBSERVABILITY_OTEL_HTTP_PORT` / `OBSERVABILITY_OTEL_GRPC_PORT`; what apps export to |

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
   make apps:mcp     # MCP Inspector: try the backend's /mcp and agentgateway's /mcp

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
   # Set APPS_OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 in .env first,
   # then apps:restart so apps/backend starts exporting.
   make observability:up
   make observability:verify
   make observability:open
   ```

## 🧪 Sample Scenarios

Hands-on, scenario-based walkthroughs for each tool - what to run, in what order, and what you should see happen. For quick flag/env-var reference instead, see [Configuration](#configuration) below.

### Login, profile and the database

The login takes a username and password, checked against the `users` table in MySQL: one user is seeded (`apps/backend/app/seed.py`): `demo`, password `demo`, `demo@nasebanal.com`. After logging in, the header's user menu leads to a **Profile** page — the email is shown (recorded, not editable), the display name and language can be changed and are saved with `PUT /me/profile`.

Try it end to end: log in at http://localhost:5173 (`make apps:open`), and on the accounts page record a transaction - pick an account (e.g. Cash), enter a signed quantity (1000) and press **Record**. The balance table updates by itself (+1000, and one more transaction):

![Before recording: Cash and 1000 entered](apps/frontend/public/docs/screenshots/app-record.png)
![After recording: Cash 121000, 4 transactions](apps/frontend/public/docs/screenshots/app-recorded.png)

(Numbers shown are from a freshly reset stack, `make all:reset`.) The entry is now a row in MySQL - `source` is `api` since it came through the REST API; the first five rows are seed data. The database is easy to look at:

```bash
make apps:sql                                   # phpMyAdmin at http://localhost:8081, already logged in to demo
make apps:mysql                                 # a mysql shell
make apps:mysql SQL="SELECT username, email, display_name, language, provider FROM users"
```

![phpMyAdmin showing the transactions table with the new Cash 1000 row](apps/frontend/public/docs/screenshots/mysql-transactions.png)

### MCP: trying the backend's MCP server

`apps/backend` serves MCP natively at `/mcp`, and MCP Inspector (started by `apps:up`, official image) is the quickest way to try it. `make apps:mcp` opens it (its config carries the demo token as an `Authorization` header for both servers - `/mcp` requires a login, and `agentgateway` passes the header on to the backend, so tools that need a token such as `get_me_me_get` work from the Inspector too) with two servers listed - `apps-backend` (this one) and `agentgateway` (see [below](#agentgateway-exposing-appsbackend-as-mcp-tools); it only connects while `make agentgateway:up` is running). Its server list is the read-only `apps/mcp-inspector/config.json`, reached over `apps-network` by the Inspector's own server process; its UI token is pinned (`APPS_MCP_INSPECTOR_TOKEN`) and `apps:mcp` puts it in the URL.

1. `make apps:mcp` opens the Inspector with both servers listed (disconnected):

   ![MCP Inspector's Servers screen](apps/frontend/public/docs/screenshots/mcp-inspector-servers.png)

2. Flip the switch on `apps-backend` - the card turns green (Connected) and the log on the right shows the `initialize` / `tools/list` handshake:

   ![apps-backend connected](apps/frontend/public/docs/screenshots/mcp-inspector-connected.png)

3. Open the **Tools** tab and pick `list_accounts_accounts_get`:

   ![Tools tab](apps/frontend/public/docs/screenshots/mcp-inspector-tools.png)

4. Press **Execute Tool** - the Results panel shows the same data `GET /accounts` returns:

   ![Tool result](apps/frontend/public/docs/screenshots/mcp-inspector-result.png)

#### Also from Claude (or another MCP client)

MCP Inspector is only one client - any MCP client that speaks Streamable HTTP can use the same endpoint (agentgateway's own endpoint is registered in [its scenario](#agentgateway-exposing-appsbackend-as-mcp-tools)):

| | Claude Code | Claude Desktop |
|---|---|---|
| How it connects | Directly - Streamable HTTP is supported as is | Through the `mcp-remote` bridge (a local `http://` address can't be a custom connector, which needs a public https URL) |
| How to add | `claude mcp add --transport http <name> <url>` | An `mcpServers` entry in `claude_desktop_config.json` |
| Then | Restart Claude Code, or reconnect with `/mcp` - a running session doesn't pick up a newly added server | Restart Claude Desktop |
| Check | `/mcp` lists the servers and their tools | The servers' tools show up in a new chat |

**Claude Code:**

```bash
claude mcp add --transport http apps-backend http://localhost:8080/mcp
claude mcp list
```

`claude mcp list` shows `Connected` once the server is reachable, but a Claude Code session that was already running doesn't load its tools yet - restart Claude Code, or reconnect with `/mcp`, before asking for anything. Without a scope option the server is added to the current project only; add `-s user` to use it from any directory.

`/mcp` is behind a login (every tool but the health check, login and JWKS ones needs a token, and this is how an MCP client gets one), so after restarting: open `/mcp`, pick `apps-backend` (it says *needs authentication*) and **Authenticate**. The browser opens the app's own login at `http://localhost:5173/mcp-authorize` - **Demo login** (`demo` / `demo`) or, with `KEYCLOAK_ISSUER` set and `make keycloak:up` running, **Keycloak** (`keycloak-demo` / `nasebanal-demo`) - press **Allow**, and Claude Code shows *Authentication successful*; close the tab and ask for `get_me`. Claude Code keeps the token, so the browser should open again only after `claude mcp remove` or when `TOKEN_SECRET` changes. `APPS_MCP_AUTH_REQUIRED=false` in `.env` (+ `make apps:restart`) leaves `/mcp` open instead; MCP Inspector and agentgateway are covered below.

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "apps-backend": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8080/mcp"]
    }
  }
}
```

Then ask e.g. "list the accounts and their balances" - Claude calls `list_accounts_accounts_get` after you approve it. (`mcp-remote` runs the same browser login on its own when `/mcp` asks for it - not tried here.) Remove the Claude Code entries afterwards with `claude mcp remove <name>`.

### Specmatic: contract testing (Provider and Consumer)

`shared/openapi/openapi.yaml` is the contract — a checked-in, hand-maintained OpenAPI file, not one generated from the route code. It lives in `shared/` (mounted read-only by every module that needs it: the backend, the frontend's `/api-specs`, Specmatic, agentgateway), so none of them has to go through the backend to read it; the backend serves it verbatim at `GET /openapi.json`. That's a deliberate reversal from earlier in this repo's history: a schema generated *from* the implementation can never structurally disagree with it, so a provider verification test run against it can only ever catch behavioral bugs, never real contract drift. A physically separate file makes "does the implementation still honor this contract" a real, failable question — the actual point of Contract-Driven Development, where a Consumer and a Provider both build against one shared file independently. The tradeoff: `openapi.yaml` can drift from what the code actually does if you change one and forget the other — keeping them in sync by hand is the ongoing cost, and `specmatic:test` is what catches it when they diverge.

Specmatic checks the contract from both directions:

```bash
make apps:up
make specmatic:test          # Provider: real requests against the real running backend
```

```bash
make specmatic:mock-up       # mock server built from the same contract (localhost:9091)
make vitest:contract-test    # Consumer: apps/frontend's real api.ts calls against the mock, not a mocked fetch or the real backend
```

`shared/openapi/examples/` holds 20 checked-in externalized examples (shared by both `specmatic:test` and `specmatic:mock-up`) — a bearer token (the demo token is deterministic: an RS256 JWT for `demo` with a fixed issue and expiry time, signed with the checked-in demo key, so the files stay valid as long as that key and `JWT_ISSUER` aren't overridden - `apps/backend`'s tests fail if they drift), an id that actually exists, and deliberately-invalid requests covering every documented non-2xx response — so Specmatic's own coverage report reaches 100%. They are plain files: edit them by hand next to the contract. See `AGENTS.md`'s Specmatic section for the full story, including a dead end (Specmatic's own security-token config parses correctly but has no effect on generated requests) and why `SPECMATIC_GENERATIVE_TESTS` was tried and rejected in favor of explicit negative examples.

### JWT authentication: every route needs a token

`POST /auth/login` hands out an RS256 JWT (valid a day, `APPS_JWT_TTL_SECONDS`), and every route but `/health`, `/auth/login` and `/.well-known/jwks.json` - REST, GraphQL and MCP - checks it. The public key is published as a JWKS, so a gateway or another service can verify a token without sharing a secret. The walkthrough with real outputs is the docs' *Scenario 2* (http://localhost:5173/docs/scenario-auth); the short version:

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \
  -d '{"username":"demo","password":"demo"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/.well-known/jwks.json                    # the public key (kid matches the token's header)
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/accounts   # 401: no token
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" localhost:8080/accounts   # 200
```

A tampered, expired or unsigned (`alg: none`) token gets the same `401 {"detail":"invalid or missing token"}`. The automated checks: `make pytest:test` (`test_auth_required.py` walks every registered route and asserts the protected ones answer 401 without a token; `test_jwt_auth.py` covers the claims, expiry, tampering, a foreign key, issuer/audience, `alg: none`, HS256 key confusion and the JWKS), `make specmatic:test` (the contract's 401 examples against the real backend) and `make zap:api-scan` (ZAP logs in first and sends the token with every request).

### Kong: routing to the real backend, or to a contract mock instead

`apps_backend` (Kong Manager → **Gateway Services**) proxies `http://localhost:8000/api/*` to `apps/backend`'s own root (`strip_path: true`, so `/api/accounts` reaches `backend:8080/accounts`). `apps/frontend` can go through it instead of calling the backend directly:

```bash
make kong:up   # DB mode (KONG_DB=postgres) is the default, so Kong Manager can save edits; KONG_DB=off is DB-less: declarative.yml only, read-only Admin API
# .env: APPS_API_BASE=http://localhost:8000/api
make apps:restart   # frontend needs recreating - Next.js dev mode bakes NEXT_PUBLIC_* into the bundle at server start
```

`apps_backend`'s Host/Port/Path, edited right from Kong Manager's screen, is the seam: repoint it at a mock built from the same contract instead of the real backend, and neither `apps/frontend` nor any test hitting `/api/*` needs to change at all. An edit takes effect within a couple of seconds - no restart, no reset.

1. `make kong:open` (or open http://localhost:8002) → **Gateway Services** → `apps_backend` → **Edit**.
2. Set **Host** / **Port** / **Path** to one of the targets below, then **Save** (Host/Port here are Docker Compose **service names** on `apps-network`, not `localhost` - only resolvable from inside that network, which is why Kong itself joins it):

   | Target | Host | Port | Path |
   |---|---|---|---|
   | Real backend (default) | `backend` | `8080` | *(empty)* |
   | Specmatic's mock (`make specmatic:mock-up` first) | `specmatic-mock` | `9091` | *(empty)* |

3. Pointing at the mock? Also switch on the `mock-demo-token` plugin: every API route needs a bearer token now, and the mock answers only the one token its contract examples carry (the fixed demo token), not the token a login hands out. `kong/conf/declarative.yml` ships a `request-transformer` plugin on `apps_backend` with that name, switched off, that swaps the demo token in: `curl -X PATCH http://localhost:8001/plugins/mock-demo-token -d enabled=true` (or the toggle under **Plugins** in Kong Manager).
4. `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/accounts` (a token from `POST /api/auth/login`; or reload `apps/frontend`, if it's routed through Kong) to confirm - allow a couple of seconds for the change to propagate to Kong's own worker processes.
5. To go back to the real backend: edit `apps_backend` again, Host `backend` / Port `8080` / Path empty, **Save**, and switch the `mock-demo-token` plugin off again.

Verified this way, not just described: every request during a real `make playwright:test` run against a Kong-routed frontend showed up in Kong's own access log going to `/api/*`, and pointing `apps_backend` at Specmatic's mock returned exactly the example values from `openapi.yaml`, confirmed via `curl` and Specmatic's own request log.

There's only ever one `apps_backend` service to edit — no separate service per backend/mock to flip between. (An earlier attempt registered three services, one per target, meant to be toggled by an "enabled" flag - that doesn't work: Kong's `Route` object has no `enabled` field, only `Service` does, and disabling a `Service` behind an already-matched `Route` doesn't fail over to another route.) If Kong Manager's edit doesn't seem to stick, or you just want a clean slate regardless of what got changed live, `make kong:reset` reloads everything straight from `kong/conf/declarative.yml`, which defaults `apps_backend` back to the real backend.

### Kafka bridge: comparing REST vs. Kafka-buffered ingestion

`make kafka:bridge-up` starts a small standalone consumer (`kafka/bridge/`) that reads events off the Kafka topic and forwards each one to a REST backend via `POST /transactions` — `apps/backend` by default, but `KAFKA_BRIDGE_TARGET_URL` can point anywhere, same as every other test tool's target host. It's deliberately separate from `kafka:up` (opt in explicitly) and lives in its own container rather than inside `apps/backend`, so a Kafka or backend outage only ever affects the bridge itself — it just retries forever, and only commits a Kafka offset after a successful delivery, so an outage pauses ingestion rather than losing events.

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

1. Start the target and the Kafka path (optionally Grafana too - set `APPS_OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` in `.env`, then `apps:restart`):
   ```bash
   make apps:up
   make kafka:up && make kafka:bridge-up
   make observability:up        # optional: watch it live at http://localhost:3030
   ```
2. **Direct REST - this is the one that errors:**
   ```bash
   make locust:load LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s
   ```
   Or with the UI: `make locust:up LOCUST_FILE=locustfile_http_overload.py`, then enter `300` / `100` at http://localhost:8089.
3. **Wait for the backend to recover** before the next run. After a run this heavy it stays unresponsive for ~90s, until the DB-pool waits queued behind it time out:
   ```bash
   until curl -sf -m 5 http://localhost:8080/health >/dev/null; do sleep 10; done
   ```
4. **The same load through Kafka:**
   ```bash
   make locust:load LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s
   ```
   (`make locust:up LOCUST_FILE=locustfile_kafka.py` + the same `300` / `100` in the UI works too. To switch between the two cleanly in UI mode, use `make locust:restart`.)
5. **Compare**: `Failure Count` per row in `locust/logs/<timestamp>/locust_stats.csv` (or that run's `report.html`), and `curl -w '%{time_total}\n' http://localhost:8080/health` while each runs. In Grafana ("Apps backend (OpenTelemetry)"): 5xx ratio, p95 latency and DB connections used spike during step 2 and stay flat during step 4.

Kafka stays flat because `kafka-bridge` drains the topic at its own steady, sequential pace and never forwards a burst to the backend. That also means the topic keeps draining into the backend long after step 4 ends (right after a 300 / 100 run, the bridge's consumer lag was still ~1.6M events - check with `docker exec nb-kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --all-groups`); `make kafka:reset` clears the backlog before a fresh comparison.

### Keycloak: a real login, and a real token the backend verifies

`apps/backend`'s `POST /transactions` is protected by `app/auth.py`'s `get_current_username` — until now, only satisfiable with the token from `POST /auth/login` (the demo user's password). Keycloak adds a real OIDC login: the login page gets a **Demo login / Keycloak** toggle (with **Sign up**), you authenticate at Keycloak like you would with "Sign in with Google", and the backend accepts the JWT Keycloak issued on the exact same route. One variable turns on both the backend and the login page:

Starting Keycloak is not enough: the login page offers it (and the backend accepts its tokens) only when **`KEYCLOAK_ISSUER` is set in `.env`** - that one variable is how the apps learn Keycloak exists. Without it the login dialog shows only the demo login, even with Keycloak running. Three steps:

```bash
make apps:up
make keycloak:up                  # 1. start Keycloak
```

```bash
# 2. .env: uncomment this line (remove the leading "# "; it is commented out in .env.example) - this is what makes the login page show Keycloak
KEYCLOAK_ISSUER=http://localhost:8180/realms/nasebanal
```

```bash
make apps:restart                 # 3. backend and frontend need recreating to pick it up
```

No **Demo login / Keycloak** toggle? `KEYCLOAK_ISSUER` is missing from `.env` (or commented out with a `#`), or `apps:restart` has not run since you set it - `docker exec nb-frontend printenv NEXT_PUBLIC_KEYCLOAK_ISSUER` prints the issuer when it is on, nothing when it is off.

Then open http://localhost:5173, click Login, pick **Keycloak**, and sign in as `keycloak-demo` / `nasebanal-demo` (or **Sign up** for a new user — the form is Keycloak's own; `make keycloak:open` shows the user in the admin console). The user menu shows a Keycloak badge, and recording a transaction succeeds because the backend verified the token's signature against Keycloak's public keys.

The same Keycloak login also works for an MCP client: the page its browser login opens (`/mcp-authorize`) offers the same **Demo login / Keycloak** toggle - see [Also from Claude](#also-from-claude-or-another-mcp-client).

Without a browser: `make keycloak:verify-apps` gets a token for the demo user (password grant) and sends it as `Authorization: Bearer` to `POST /transactions`; `make keycloak:login` just prints one, for trying by hand with curl. A token without a valid signature, or no token at all, gets a `401`. `KEYCLOAK_ISSUER` is the address the *browser* logs in at (and the `iss` every token carries); the backend fetches the signing keys from `KEYCLOAK_JWKS_URL` (default `http://keycloak:8080/...`, the in-network address). Setting `KEYCLOAK_ISSUER` back to empty and restarting returns to mock-token-only.

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

Both prove targets recreate the backend once with `APPS_BACKEND_MYSQL_PASSWORD` set but empty (and, for the second, `VAULT_ADDR`/`VAULT_TOKEN`) — `.env` is untouched. To do it by hand instead, set `APPS_BACKEND_MYSQL_PASSWORD=` (empty) in `.env` and `apps:restart` to watch the backend fail, then add `VAULT_ADDR=http://vault:8200` and `VAULT_TOKEN=nb-vault-root-token` and `apps:restart` again; each backend start gets a different Vault-issued user. `make apps:restart` after removing those lines returns to the normal configuration. The older static path still works as a fallback (`make vault:put-mysql-secret` writes a fixed credential to `secret/apps/mysql`).

Vault's dev server is in-memory only — everything written to it is gone on `vault:down`/`vault:restart`, by design (see `AGENTS.md`); users it already created stay in MySQL until `make apps:reset`.

### agentgateway: exposing apps/backend as MCP tools

`apps/backend` already mounts its own MCP server natively at `/mcp` (via `fastapi-mcp`, auto-derived from its REST routes - see [Endpoints](#endpoints)). agentgateway is a different way to get there: instead of backend-side MCP code, it builds MCP tools *entirely from the checked-in OpenAPI contract* (`shared/openapi/openapi.yaml`) - the same contract Specmatic uses, read directly from the shared mount (`agentgateway/config.yaml`'s `schema.file`).

```bash
make agentgateway:up
make agentgateway:tools   # does the MCP handshake by hand, lists what's actually being served
make apps:up              # needed when calling the listed tools
make apps:mcp             # opens MCP Inspector - see "MCP: trying the backend's MCP server"
```

Verify it the same way as the backend (steps in [MCP: trying the backend's MCP server](#mcp-trying-the-backends-mcp-server)):

Switch `agentgateway` on, open **Tools**, pick `list_accounts_accounts_get` and press **Execute Tool**. The server name is now `rmcp` (agentgateway's own MCP implementation) and the result is the same account list, this time through the gateway:

![Through agentgateway](apps/frontend/public/docs/screenshots/mcp-inspector-agentgateway.png)

(The backend's native `/mcp` also exposes its two GraphQL routes as tools, so its tool list is longer than the eight agentgateway builds from the OpenAPI contract.)

Verified end-to-end: `agentgateway:tools` lists nine tools - `health_health_get`, `login_auth_login_post`, `get_me_me_get`, `update_profile_me_profile_put`, `get_jwks_well_known_jwks_json_get`, `list_transactions_transactions_get`, `create_transaction_transactions_post`, `get_transaction_transactions__transaction_id__get`, `list_accounts_accounts_get` - one per `openapi.yaml` operation, with names/descriptions taken straight from it. Calling `list_accounts_accounts_get` through the gateway (`POST /mcp`, `tools/call`) returned the same live balances `GET /accounts` itself does - confirmed against a running `apps/backend` with real transaction data from earlier Locust/Specmatic runs already in it.

**Register it in Claude Code, with a token** (needs `make agentgateway:up` and `make apps:up`). Every tool except `health`, `login` and the JWKS needs a bearer token, like the REST routes behind them, and the tool arguments have no `Authorization` header - without a token they answer `invalid or missing token`. So the token goes on the connection itself: agentgateway passes the connection's `Authorization` header through to the backend (checked with a demo token and with a Keycloak one). In this order:

```bash
# 1. get a token (a login lasts a day)
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'content-type: application/json' \
  -d '{"username":"demo","password":"demo"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "token: ${TOKEN:0:12}..."   # eyJ... (a JWT) means it worked

# 2. register agentgateway with it (drop the first line if it was never registered)
claude mcp remove agentgateway
claude mcp add --transport http agentgateway http://localhost:8010/mcp --header "Authorization: Bearer $TOKEN"

# 3. restart Claude Code (a running session does not pick up a newly added server), then ask it to call get_me
claude mcp list
```

`get_me` returning the demo user's profile means the token went through; `invalid or missing token` means the header was not registered - `claude mcp get` does not list headers (its `Connected` says nothing about them), `~/.claude.json` does. A Keycloak access token lasts minutes, a login token a day (`JWT_TTL_SECONDS`). Claude Desktop works the same way through the `mcp-remote` bridge (see [MCP](#mcp-trying-the-backends-mcp-server)) with its `--header` option - not tried here.

Point an MCP client (Claude Desktop, [mcp-inspector](https://github.com/modelcontextprotocol/inspector), ...) at `http://localhost:8010/mcp` to use it interactively. `create_transaction_transactions_post` needs a real bearer token, same as `POST /transactions` itself does everywhere else - call `login_auth_login_post` first and pass its token back as an `Authorization` header, or the tool call 401s the same way an unauthenticated `curl` would.

**Why not the browser login (Authenticate)?** agentgateway has no login of its own here, and `APPS_MCP_AUTH_REQUIRED` does not reach it - it builds its tools from the OpenAPI contract and calls the REST routes, never the backend's `/mcp`. So in Claude Code's `/mcp` the server shows *not authenticated* and **Authenticate** fails (`Dynamic Client Registration rejected (HTTP 406)`: every path other than `/mcp` is answered by agentgateway's MCP handler, so there is no OAuth endpoint to register with); pick **Reconnect** instead - it connects fine, and the header carries the token. A browser login through agentgateway itself would need `policies.mcpAuthentication`, which only validates JWTs - and the backend's tokens now are JWTs, published at `/.well-known/jwks.json`, so pointing it there is the natural next step. `provider: keycloak` is no way around it: agentgateway issue [#3668](https://github.com/agentgateway/agentgateway/issues/3668) makes Claude Code reject that login (RFC 9207 issuer mismatch).

agentgateway also ships a real dashboard UI (a React SPA, built into the image by default - `Dockerfile`'s `CARGO_FEATURES=agentgateway-app/ui`), served off its **admin** port, separate from the MCP port above:

```bash
make agentgateway:open   # http://localhost:15000 -> redirects to /ui
```

Its admin port binds to loopback-only inside the container by default (`config.adminAddr`, unset) - unreachable from the host even with the port published, confirmed directly (`308` then nothing). `agentgateway/config.yaml` sets `config.adminAddr: 0.0.0.0:15000` so it actually answers on the port `docker-compose.yml` publishes.

agentgateway reads the OpenAPI contract from the mounted `shared/openapi/openapi.yaml` (`schema.file`), so it starts without `apps/backend` running; only calling a tool needs the backend. (It used to fetch the live `/openapi.json` at startup and exit with `Connection refused` if the backend wasn't up yet.)

### Observability: OpenTelemetry, Prometheus, Tempo and Grafana

`apps/backend` can export OpenTelemetry traces (FastAPI requests + SQLAlchemy queries), HTTP server metrics and application logs over OTLP. It's **off by default** - `apps:up` behaves exactly as before unless `APPS_OTEL_EXPORTER_OTLP_ENDPOINT` is set. The `observability` module is the local place to send it: an OTel Collector receives OTLP, forwards traces to Tempo and logs to Loki and exposes metrics for Prometheus, and Grafana ships with the data sources and one dashboard already provisioned. Prometheus also evaluates alert rules (`observability/alert-rules.yml`) and sends firing alerts to Alertmanager, which routes them to a webhook sink that stands in for Slack/email - `make observability:alerts` shows the result.

```bash
# .env
APPS_OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

make observability:up
make apps:restart          # backend reads the endpoint at startup
make locust:load           # or just click around the frontend
make observability:verify  # each component ready + nb-backend metrics/traces arrived
make observability:open    # Grafana -> NASEBANAL -> "Apps backend (OpenTelemetry)"
```

The dashboard shows request rate per path, 5xx ratio, p50/p95/p99 latency, active requests / DB connections in use, and recent traces (click through to the span waterfall, including each SQL query). `/health` is excluded from instrumentation, since healthchecks would otherwise dominate every panel.

The instrumentation is standard OTel SDK code (`apps/backend/app/telemetry.py`) that honors the usual `OTEL_*` env vars, so pointing `APPS_OTEL_EXPORTER_OTLP_ENDPOINT` (plus `OTEL_EXPORTER_OTLP_HEADERS`) at another OTLP backend such as NewRelic - which the real NASEBANAL apps use - works without code changes. Only the Collector's config (`observability/otel-collector.yaml`) is specific to the local stack.

Not covered here: the real Cloudflare Workers apps (`wrangler dev` doesn't export to Destinations, and Cloudflare can't reach a `localhost` collector), and Kafka metrics, and Kong's/agentgateway's metrics (each has its own Prometheus/OTel integration that could be added to `observability/prometheus.yml` / their own config). Kong and agentgateway do export **traces** to the same Collector (`opentelemetry` plugin on Kong's `apps_backend` service; `config.tracing` in `agentgateway/config.yaml`), and the trace context is passed on, so a request through either gateway is one trace with the backend's spans under the gateway's - see Scenario 8. The Grafana dashboard's bottom panel, "Gateway traces", lists them.

### Locust load testing scenarios

Load tests are driven by `make locust:up` (UI mode - start containers, then
configure and launch the test from the browser at http://localhost:8089) or
`make locust:load` (headless - starts immediately, no UI, bounded by
`LOCUST_RUN_TIME`; the command waits for the run to finish and exits with Locust's
own code (`0` ok, `1` failed requests above `LOCUST_MAX_FAIL_RATIO`, `2` unhandled task exception) and prints
whether that means TEST FAILED or TOOL ERROR - same for every test target, see AGENTS.md). Pick the test by setting `LOCUST_FILE` (which test) and
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

> **Note: `make locust:load` is not part of `make all:test`** (it was `locust:test`, and `all:test` used to end with it) - a sustained load run isn't something every `all:test` should do. Run it explicitly.

> **Warning: `make locust:load` runs without user intervention.**
> It starts the load test automatically (headless, no UI) and continues until explicitly stopped.
> **Always set `LOCUST_RUN_TIME`** to limit the test duration and prevent unintended sustained load on the target system.
> If `LOCUST_RUN_TIME` is not set, `make locust:load` will exit with an error to avoid runaway load tests.

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
make zap:api-scan    # scans apps/backend directly from its live OpenAPI schema (shared/openapi/openapi.yaml) - endpoint-aware, so it exercises every documented route, not just what a spider happens to crawl
```

```bash
make zap:scan        # runs zap:baseline + zap:api-scan in sequence, stops at the first one that fails - deliberately excludes zap:full-scan (see the warning below), run that one explicitly
make zap:stop        # kills a scan that's running elsewhere (another shell, a background job) - Ctrl+C works fine for one running in your own terminal
```

```bash
make zap:full-scan   # ⚠️  active scan of apps/frontend - sends real attack payloads (SQLi, XSS, ...), several minutes+
                      #    Can pin apps/frontend's CPU into a runaway loop - see the warning below before running this.
```

Verified end-to-end against this repo's own `apps`: `baseline` found only WARN-level findings (missing security headers like CSP/`X-Content-Type-Options`, mostly - `apps/frontend` is a dev-mode Next.js server, not hardened for production) and 0 FAIL; `api-scan` ran every active rule (SQLi, XXE, command injection, SSTI, ...) against every `apps/backend` route from the OpenAPI schema - logged in as the demo user, since every route needs a token (`zap/hooks/bearer_token.py` adds the `Authorization` header to each request) - and came back with 0 FAIL (only the same missing-header class of WARN). Being logged in is what let it find a real bug: a `POST /transactions` name longer than its column used to be a 500, and is a 422 now. Both are cheap to run: measured directly, `baseline` took ~78s and `api-scan` ~45s, with `apps/frontend`/`apps/backend` staying at negligible CPU/memory throughout either one - that's why both are safe to bundle into `zap:scan`.

Same pass/fail convention as `pytest`/`specmatic`: a real (non-INFO) alert exits non-zero, so `zap:baseline` etc. can gate a pipeline the same way; see `zap/report/<scan>-report.html` for what was actually found.

**⚠️ `zap:api-scan` and `zap:full-scan` leave attack payloads in the database - run `make apps:reset` (then `make apps:up`) after them.** The scans log in and `POST /transactions` with SQL-injection / script strings as the account name, so the Balances table on `/accounts` fills with junk accounts (this is the payloads being stored as plain data, not a display bug). That is expected; reset to get a clean demo state back (`apps:reset` wipes the MySQL volume and the seed restores `demo` / `Cash`; it does not start `apps` again). `zap:baseline` only observes and writes nothing. Locust's load runs and Kafka-fed runs also write a lot of transactions, so the same reset applies after them.

**`zap:full-scan` and `zap:api-scan` send real attack payloads** - only ever point these at `apps` (this repo's own bundled test target, exactly what the Makefile does), never at an external host. Unlike Locust or Playwright, `zap`'s targets aren't overridable via an env var for this reason - there's no `ZAP_TARGET_URL` to accidentally repoint at production.

**⚠️ `zap:full-scan` can overload `apps/frontend`'s dev server - this is why it's excluded from `zap:scan`.** Confirmed directly: a full scan's attack payloads against the many hashed `_next/static/*` asset URLs a Next.js dev server (Turbopack) generates drove it into a recompile/cache-rewrite loop, pinning the container's CPU at 800%+ - it stayed unresponsive even after the scan itself was stopped, and needed `docker compose -p apps -f apps/docker-compose.yml restart frontend` to recover. Use `zap:stop` to kill a runaway scan, and restart `apps/frontend` afterward if it's still unresponsive. Only run `zap:full-scan` on its own, when you can watch for this.

## ⚙️ Configuration

Every module reads its settings from one `.env` file at the repo root (`cp .env.example .env` first - see [Getting Started](#-getting-started)). Below are each module's main parameters; `.env.example` has the full list, including lower-level ones (Kafka's KRaft/listener settings, image versions, MySQL credentials, ...) most people never need to touch. Override any of them via `.env` or inline on the command line:

```bash
make kong:up
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_MYSQL_HOST=prod-db
```

`apps/` holds the actual apps under test - `apps/backend` (FastAPI: REST + GraphQL + an MCP server, over a MySQL-backed accounting ledger), `apps/frontend` (Next.js), and `mysql-server`. Its lifecycle is independent from every test tool - `apps:up`/`apps:down` only, never started or stopped automatically by pytest/vitest/playwright/specmatic/locust/etc. See the [Endpoints](#endpoints) table above for every URL it exposes once up, and `AGENTS.md` for the full architecture writeup.

A variable that belongs to one module is prefixed with it (`APPS_`, `KONG_`, `KAFKA_`, `KEYCLOAK_`, `VAULT_`, `PLAYWRIGHT_`, `SPECMATIC_`, `ZAP_`, `AGENTGATEWAY_`, `OBSERVABILITY_`, `LOCUST_`); settings shared by several modules have no prefix and sit in the Common section at the top of `.env`.

### Common

| Variable | Default | Description |
|---|---|---|
| `NB_TOKEN` | *(unset)* | PAT / service-account token for NASEBANAL Assurance - what `<module>:report-upload` sends with. Unset = use the credentials from `nb auth login` (CI needs the token) |
| `NB_BASE_URL` | `https://api.assurance.nasebanal.com` | The Assurance **API** (not the web UI). A local `npm run dev` of nb-assurance-api is `http://localhost:8791` |
| `PROJECT_NAME` | `nb-quickstarts` | The Assurance project the runs go to (created on first upload) |
| `NB_RUN_KEY` | *(`local-<commit>-<day>`)* | Groups several uploads into one run |

### Apps

| Variable | Default | Description |
|---|---|---|
| `APPS_MYSQL_USER` / `APPS_MYSQL_PASSWORD` | `demo` / `demo` | The application's MySQL login. Used by `apps/backend`, the SQL client, the Vault module and Locust's MySQL scenario. Created when the data volume is first initialised - changing them later needs `make apps:reset`. A blank value falls back to the default; it does **not** mean "no password" |
| `APPS_MYSQL_DATABASE` / `APPS_MYSQL_ROOT_PASSWORD` | `demo` / `rootpassword` | The database name, and the root password (used by the SQL client and `make apps:mysql`) |
| `APPS_MYSQL_PORT` / `APPS_MYSQL_VERSION` | `3306` / `8.4` | Host-published MySQL port, and the image version |
| `APPS_MCP_INSPECTOR_PORT` / `APPS_MCP_INSPECTOR_VERSION` | `6274` / `2.9` | Host-published MCP Inspector UI port, and the image tag (minor-pinned) |
| `APPS_MCP_INSPECTOR_SANDBOX_PORT` | `6275` | Host-published port of the Inspector's MCP Apps sandbox |
| `APPS_MCP_INSPECTOR_TOKEN` | `nb-mcp-inspector-token` | The Inspector UI's auth token, pinned (random per start otherwise) and put in the URL by `make apps:mcp`. A fixed public default - local demo only |
| `APPS_API_BASE` | `http://localhost:8080` | Where `apps/frontend` calls the backend - direct, or `http://localhost:8000/api` to route through Kong instead (needs `kong:up` + `apps:restart`) |
| `APPS_KAFKA_BRIDGE_HEALTH_URL` | `http://localhost:8090` | Where the frontend checks kafka-bridge's health - see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion) |
| `APPS_MCP_AUTH_REQUIRED` | `true` | `/mcp` is behind a login: an MCP client such as Claude Code gets a 401, opens the browser on the frontend's `/mcp-authorize` page (the app's usual demo / Keycloak login) and carries the resulting token into every tool call. `false` leaves `/mcp` open (needs `apps:restart`) |
| `APPS_JWT_TTL_SECONDS` | `86400` | How long a login token stays valid (seconds). Tokens are RS256 JWTs signed with a checked-in demo key (`apps/backend/app/dev_jwt_key.pem`, not a secret); the public key is at `/.well-known/jwks.json` |
| `APPS_PUBLIC_BASE_URL` / `APPS_MCP_AUTHORIZE_URL` | `http://localhost:8080` / `http://localhost:5173/mcp-authorize` | The addresses the MCP client and browser use for the MCP login (host-published, not in-network) - change only when the backend / frontend are reached elsewhere |
| `KEYCLOAK_ISSUER` | *(unset = off)* | Turns on Keycloak for `apps/backend` and the login page: `http://localhost:8180/realms/nasebanal` - see [Keycloak](#keycloak) |
| `VAULT_ADDR` / `VAULT_TOKEN` | *(both unset = off)* | Where `apps/backend` asks for a Vault-issued MySQL credential - see [Vault](#vault) |

### Kong

| Variable | Default | Description |
|---|---|---|
| `KONG_DB` | `postgres` | `postgres` (DB mode - needed for Kong Manager edits to stick) or `off` (DB-less, reads `kong/conf/declarative.yml` only) |
| `KONG_VERSION` | `3.6` | Kong Docker image tag |
| `KONG_PG_USER` / `KONG_PG_PASSWORD` / `KONG_PG_DATABASE` | `kong` / `kongpass` / `kong` | Postgres credentials, `KONG_DB=postgres` mode only |

### Kafka

| Variable | Default | Description |
|---|---|---|
| `KAFKA_PORT` | `9092` | Host-published broker port |
| `KAFKA_TOPIC_NAME` | `quickstart-events` | Topic `kafka:add-topics` creates and everything else reads/writes |
| `KAFKA_TOPIC_PARTITIONS` | `1` | Partition count for that topic |
| `KAFKA_BRIDGE_TARGET_URL` | `http://backend:8080` | Where kafka-bridge forwards events via `POST /transactions` - see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion) |
| `KAFKA_BRIDGE_HEALTH_PORT` | `8090` | kafka-bridge's own `/health` port |

### Keycloak

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_PORT` | `8180` | Host-published admin console / realm port |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | `admin` / `admin` | Admin console login |
| `KEYCLOAK_ISSUER` (an `apps` variable - see [Apps](#apps) below) | *(unset = off)* | Turns on Keycloak for `apps/backend` and the login page - `http://localhost:8180/realms/nasebanal` (the address the browser logs in at; match `KEYCLOAK_PORT`), plus `apps:restart` |

### Vault

| Variable | Default | Description |
|---|---|---|
| `VAULT_PORT` | `8200` | Host-published UI / API port |
| `VAULT_ROOT_TOKEN` | `nb-vault-root-token` | Dev-mode root token |
| `VAULT_ADDR` / `VAULT_TOKEN` (`apps` variables - see [Apps](#apps) below) | *(both unset = off)* | Where `apps/backend` asks for a Vault-issued MySQL credential - `http://vault:8200` / `nb-vault-root-token` to turn it on (plus `apps:restart`); `make vault:verify-apps` sets them for one recreate instead |

### Specmatic & Playwright

| Variable | Default | Description |
|---|---|---|
| `SPECMATIC_MOCK_PORT` | `9091` | `specmatic:mock-up`'s mock server port |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` | URL Playwright navigates to (runs on the host network, not `apps-network`) |

### Locust

| Variable | Default | Description |
|---|---|---|
| `LOCUST_FILE` | `locustfile_http.py` | Which scenario to run - see [Locust load testing scenarios](#locust-load-testing-scenarios) |
| `LOCUST_TAGS` | *(empty)* | Filter to a subset of tasks within that file |
| `LOCUST_WORKERS` | `5` | Number of worker containers |
| `LOCUST_USERS` | `10` | Concurrent simulated users (also settable from the UI in `locust:up`) |
| `LOCUST_SPAWN_RATE` | `1` | Users spawned per second |
| `LOCUST_RUN_TIME` | *(empty)* | **Required** for `locust:load` (headless) - e.g. `60s`, `1h30m` |
| `LOCUST_MAX_FAIL_RATIO` | `0` | `locust:load`: allowed failure ratio (0-1); above it the run is TEST FAILED (exit 1) |
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
| `APPS_OTEL_EXPORTER_OTLP_ENDPOINT` | *(unset = off)* | Where `apps/backend` exports OTLP. Set to `http://otel-collector:4318` for the local stack (needs `apps:restart`) |
| `OBSERVABILITY_GRAFANA_PORT` | `3030` | Host-published Grafana port - defaults away from Grafana's own `3000`, a common Node/React dev-server port |
| `OBSERVABILITY_PROMETHEUS_PORT` | `9094` | Host-published Prometheus port (`9091` is taken by Specmatic) |
| `OBSERVABILITY_TEMPO_PORT` | `3200` | Host-published Tempo query API port |
| `OBSERVABILITY_OTEL_GRPC_PORT` / `OBSERVABILITY_OTEL_HTTP_PORT` | `4317` / `4318` | Host-published OTLP ports |
| `OBSERVABILITY_PROMETHEUS_RETENTION` | `7d` | How long Prometheus keeps metrics |
| `OBSERVABILITY_OTEL_COLLECTOR_VERSION` / `OBSERVABILITY_PROMETHEUS_VERSION` / `OBSERVABILITY_TEMPO_VERSION` / `OBSERVABILITY_GRAFANA_VERSION` | see `.env.example` | Image tags |

### Test Results

Every `make <module>:test` run leaves a browsable report behind. These are all gitignored - regenerated on every run, never checked in:

| Module | Report file(s) |
|---|---|
| `pytest` | `pytest/report/report.html`, plus `junit.xml` |
| `vitest` | `vitest/report/index.html`, plus `junit.xml` |
| `vitest:contract-test` | `vitest/report-contract/index.html`, plus `junit.xml` |
| `playwright` | `playwright/report/index.html`, plus `playwright/junit/junit.xml` |
| `specmatic` | `specmatic/report/test/html/index.html`, plus `specmatic/junit/TEST-junit-jupiter.xml` |
| `locust` | `locust/logs/<timestamp>/report.html`, plus the files below |
| `zap` | `zap/report/<scan>-report.html` (also `.json`) - `baseline`/`full-scan`/`api-scan`, overwritten each run |

**Send a run to NASEBANAL Assurance:** `make pytest:report-upload` (likewise `vitest:report-upload`, `playwright:report-upload`, `specmatic:report-upload`, `locust:report-upload`, `zap:report-upload`) uploads the last run's summary through the `nb` CLI. With no `NB_TOKEN` and no stored session it opens the browser for `nb auth login` (CI / no terminal: set `NB_TOKEN`). For production instead of a local `nb-assurance-api`, set for production instead of a local `nb-assurance-api`, `NB_BASE_URL` in `.env` - see `.env.example`. Everything uploaded for one commit on one day lands in one Assurance run (project `PROJECT_NAME`, default `nb-quickstarts`). `zap:report-upload` uploads every scan in `zap/report/` (converted to JUnit by `bin/zap_to_junit.mjs`, kind `security`, one suite per scan; an alert of Low or above counts as a failure) and, like `locust:report-upload` (after `make locust:load`), is not part of `all:report-upload`, just as neither Locust nor ZAP is part of `all:test`.

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
`reset` command that wipes that volume and starts fresh. `make all:reset`
is different: it runs `all:down`, wipes all four volumes and the test
tools' logs/reports, and starts nothing - every service is left stopped
(run `make all:up` afterwards). `make apps:reset` likewise only stops the
containers and wipes the volume - run `make apps:up` afterwards (which
recreates and seeds the database). The test tools
(`locust`, `pytest`, `vitest`, `playwright`, `specmatic`, `zap`) each have a
`reset` too, which just deletes the gitignored logs/reports their past runs
left on disk (`locust/logs`, `*/report`, `specmatic/junit`, ...) - copy out
any you want to keep first, and `make all:reset` runs them all:

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

These are separate modules from `apps` (see `AGENTS.md` for the full design). Long-running services follow the usual `build`/`up`/`down`/`status`/`restart`/`open` pattern; one-shot test runners use a single `test` target instead (`docker compose run --rm`, no `up`/`down`). `make all:test` runs every `test` target (pytest, vitest, playwright, specmatic) and nothing else: Locust's headless run is `locust:load` and ZAP's are `zap:baseline`/`zap:api-scan`/`zap:full-scan` - deliberately not named `test`, because a sustained load run and attack payloads shouldn't happen as a side effect of `all:test`; run them explicitly.

```bash
make pytest:test            # apps/backend unit tests (in-memory SQLite, apps:up not required)
make vitest:test            # apps/frontend unit tests (fetch mocked, apps:up not required)
make specmatic:mock-up      # mock server built from the shared contract (apps:up not required)
make vitest:contract-test   # Consumer contract test: does the frontend's API usage hold up against it?

make apps:up                # start the apps for tests that exercise the running backend or frontend
make specmatic:test         # Provider contract test: does the backend honor shared/openapi/openapi.yaml? (requires apps:up)
make playwright:test        # E2E browser test against the running frontend (requires apps:up)
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 NASEBANAL

### Trademarks

The MIT License covers the code in this repository. It does not grant any right to use the "NASEBANAL" name, the "NASEBANAL Stack" name, or the NASEBANAL logo. You are welcome to fork and modify this project, but please do not use these names or logos in a way that suggests your modified version is the official NASEBANAL project or is endorsed by NASEBANAL. Keep the copyright notice and license text as required by the MIT License.

Other product names mentioned in this repository (Kong, Kafka, Keycloak, Vault, etc.) are trademarks of their respective owners.
