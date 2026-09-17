# NASEBANAL Quickstarts

A collection of quickstart templates and examples to help developers get started quickly with various technologies and frameworks.
You can find a quick demo movie below.

https://youtu.be/8UI0XZrSPkQ

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [License](#license)

## 🚀 Overview

**NASEBANAL Quickstarts is a verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com)** — the proven open-source technologies NASEBANAL builds on, not a scaffold for every technology out there. Each module spins up one piece of that stack (or a tool that verifies it) via Docker Compose + `make`, so you can try it, test against it, and see how the pieces fit together. Like the constituents of the NASEBANAL Stack itself, which modules are here may change as the stack evolves.

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

   # Consul (register apps' backend/frontend/mysql - needs apps:up)
   make consul:up
   make consul:register-apps
   make consul:verify-apps
   make consul:open
   ```

## ⚙️ Configuration

All services use `.env` file for configuration:

**Key configurations:**
- **Apps**: See detailed configuration below
- **Kong**: DB mode (`off`/`postgres`), version, database credentials
- **Kafka**: Port 9092, topic name, partitions
- **Locust**: See detailed configuration below
- **Consul**: Ports 8500 (HTTP), 8600 (DNS)

Override via `.env` file or command-line:
```bash
make kong:up KONG_DB=postgres
make locust:up LOCUST_FILE=locustfile_mysql.py LOCUST_MYSQL_HOST=prod-db
```

### Apps Configuration (test target apps)

`apps/` holds the actual apps under test:

- `apps/backend` — Python (FastAPI). REST + GraphQL over a minimal,
  event-sourced `accounts` table (`id`, `name`, `quantity`, `source`,
  `createdAt`) in MySQL (`testdb`), modeling a simple accounting ledger:
  `name` is an account (e.g. "Cash"), each row is one transaction posted
  against it (`quantity` is a signed debit/credit delta, not an absolute
  balance), and `GET /accounts/balances` (also a GraphQL `balances` query)
  returns each account's current balance and transaction count — the sum
  and count of its own entries. Contract-first, not code-first: the REST
  API's OpenAPI schema is a checked-in, hand-maintained file
  (`apps/backend/openapi.yaml`), not generated from the route code —
  `app/main.py` serves it verbatim at `GET /openapi.json`, which is what
  `/api-specs`, the MCP mount, Specmatic, and `microcks:import-openapi` all
  still fetch (see [Specmatic: contract testing](#specmatic-contract-testing-provider-and-consumer)
  below for why).
  The read/write logic lives in `app/services/account_service.py`, which both
  the REST and GraphQL routers call. Kafka events reach it too, via `make
  kafka:bridge-up` — a separate container that consumes the topic and calls
  `POST /accounts` over REST, so `apps/backend` itself has no Kafka dependency
  at all (see [Kafka bridge](#kafka-bridge-comparing-rest-vs-kafka-buffered-ingestion)
  below). Also mounts an MCP server at `/mcp` (via `fastapi-mcp`), auto-derived
  from the same REST routes — point a local MCP client (e.g. Claude Desktop)
  at `http://localhost:8080/mcp`.
- `apps/frontend` — TypeScript (Next.js). `/` is the landing page; logging
  in (via a modal) takes you to the real `/accounts` route, which shows only
  the account balances table (`useBalances.ts`, polled every 1s — no raw
  transaction log rendered, since that's exactly what balloons under a load
  test) and a "record a transaction" form whose account field is a
  `<select>` over the existing accounts, not free text. `/api-specs` renders
  the backend's live OpenAPI schema with Scalar.
- `mysql-server` — MySQL, seeded with a small chart of accounts on first
  boot (Cash, Sales Revenue, Rent Expense). Data persists across
  `apps:down`/`apps:restart` in a named Docker volume; run `make apps:reset`
  for a genuinely fresh database (see "Persistent state / reset" below).

Its lifecycle is independent from any test tool: `make apps:up` starts it,
`make apps:down` stops it, and no test tool (pytest, vitest, playwright,
specmatic, locust, ...) starts or stops it automatically.

```bash
make apps:up     # start MySQL + backend + frontend
make apps:status
make apps:down
```

Endpoints once started:
- Frontend: http://localhost:5173
- API docs (Scalar): http://localhost:5173/api-specs
- Backend REST: http://localhost:8080
- Backend GraphQL: http://localhost:8080/graphql
- MCP server: http://localhost:8080/mcp
- MySQL: localhost:3306 (database `testdb`)

This decoupling means the same test tooling can target either the bundled
apps or an external host, just by changing where its target-host env vars
point:

```bash
# Target the bundled apps (start them first)
make apps:up
make locust:up LOCUST_FILE=locustfile_http.py   # uses LOCUST_HTTP_HOST=http://backend:8080

# Target an external host instead (no need to start apps)
make locust:up LOCUST_FILE=locustfile_http.py LOCUST_HTTP_HOST=https://staging.example.com
```

apps and any tooling that connects to it (Locust, Microcks, Kong as a
gateway in front of apps, Consul for service discovery) share the
`apps-network` Docker network, so they can be started in any order.

### Persistent state / reset

`apps`, `kong`, `kafka`, and `consul` each keep their data in a named
Docker volume, so a plain `down`/`restart` preserves it. Each has its own
`reset` command that wipes that volume and starts fresh (`make all:reset`
runs all four, plus a plain restart for `microcks`/`locust`, which hold no
persistent state to begin with):

| Module | What persists | Docker volume | Reset command |
| --- | --- | --- | --- |
| `apps` | MySQL data (`testdb`) | `apps_apps-db-data` | `make apps:reset` |
| `kong` | Gateway services/routes (`KONG_DB=postgres` mode only) | `kong_kong-db-data` | `make kong:reset` |
| `kafka` | Topics and their messages | `kafka_kafka-data` | `make kafka:reset` |
| `consul` | Service catalog/registrations | `consul_consul-data`, `consul_consul-config` | `make consul:reset` |

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

`apps_backend` in `kong/conf/declarative.yml` proxies `http://localhost:8000/api/*` to `apps/backend`'s own root (`strip_path: true`, so `/api/accounts` reaches `backend:8080/accounts`). `apps/frontend` can go through it instead of calling the backend directly:

```bash
make kong:up
# .env: NEXT_PUBLIC_API_BASE=http://localhost:8000/api
make apps:restart   # frontend needs recreating - Next.js dev mode bakes NEXT_PUBLIC_* into the bundle at server start
```

`apps_backend`'s `url` is the seam: repoint it at a mock built from the same contract instead of the real backend, and neither `apps/frontend` nor any test hitting `/api/*` needs to change at all.

**Specmatic's stub** — the same mock `vitest:contract-test` uses (above), now reachable through Kong too:

```bash
make apps:up
make specmatic:stub-up
# kong/conf/declarative.yml: change apps_backend's url to http://specmatic-stub:9091
make kong:reset
curl http://localhost:8000/api/accounts/1   # -> Specmatic's stub, not the real backend
```

**Microcks**, once imported, mocks the read side the same way (`/health`, `/auth/login`, `GET /accounts`, `GET /accounts/balances`, `GET /accounts/{account_id}`) using `openapi.yaml`'s inline examples. `POST /accounts` needs a real bearer token, which an OpenAPI example has no way to carry (it's a header, not part of the request body) — out of scope for Microcks as a result; see `openapi.yaml`'s comment on that operation. Microcks' own REST mock URL has a different shape than the real API (`/rest/<service>/<version>/<path>`, service name space-encoded as `+`), so `apps_backend.url` needs that whole prefix baked in — Kong then just appends whatever's left after stripping `/api`:

```bash
make apps:up
make microcks:up
make microcks:import-openapi
# kong/conf/declarative.yml: change apps_backend's url to http://microcks:8080/rest/nb-quickstarts+apps+backend/0.1.0
make kong:reset
curl http://localhost:8000/api/accounts/balances   # -> Microcks' mock, not the real backend
```

Both were verified this way, not just described: every request during a real `make playwright:test` run against a Kong-routed frontend showed up in Kong's own access log going to `/api/*`, and swapping `apps_backend.url` to each mock in turn returned exactly the example values from `openapi.yaml`, confirmed via `curl` and Microcks'/Specmatic's own request logs. Revert `apps_backend.url` to `http://backend:8080` and `make kong:reset` to point back at the real backend afterward — this is a manual swap for trying it out, not a toggle either module automates yet.

### Kafka bridge: comparing REST vs. Kafka-buffered ingestion

`make kafka:bridge-up` starts a small standalone consumer (`kafka/bridge/`) that reads events off the Kafka topic and forwards each one to a REST backend via `POST /accounts` — `apps/backend` by default, but `KAFKA_BRIDGE_TARGET_URL` can point anywhere, same as every other test tool's target host. It's deliberately separate from `kafka:up` (opt in explicitly) and lives in its own container rather than inside `apps/backend`, so a Kafka or backend outage only ever affects the bridge itself — it just retries forever, and only commits a Kafka offset after a successful delivery, so an outage pauses ingestion rather than losing events.

```bash
make apps:up
make kafka:up
make kafka:bridge-up
```

Two matching Locust scenarios make the case for putting Kafka in front of a write path at all — same event, same volume, two paths in:

```bash
# Direct REST, no Kafka - every simulated user POSTs straight to the backend
make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s

# The same load, produced onto the Kafka topic instead (needs kafka:bridge-up running)
make locust:test LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s
```

Measured on a single laptop, against this repo's own default resource limits (SQLAlchemy's default connection pool, a single `uvicorn` worker in `--reload` mode): direct REST failed **79%** of `POST /accounts` requests (500s, connection resets, and up to 30s+ latency) under that load. The identical load produced onto Kafka instead completed **1,241,297 events at 0% failure**, ~24ms median produce latency, with the backend's own `/health` endpoint staying at ~2ms response time throughout — because `kafka-bridge` drains the topic at its own steady, sequential pace and never forwards a burst to the backend.

### Locust Configuration

Load tests are driven by `make locust:up` (UI mode - start containers, then
configure and launch the test from the browser at http://localhost:8089) or
`make locust:test` (headless - starts immediately, no UI, bounded by
`LOCUST_RUN_TIME`). Pick the test by setting `LOCUST_FILE` (which test) and
optionally `LOCUST_TAGS` (which subset) — in `.env` or on the command line.
To switch test types cleanly, use `make locust:restart` (or `make
locust:down` then `make locust:up`).

**Test Types:**
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

**Configuration Parameters (.env):**
```bash
# Test Configuration
LOCUST_FILE=locustfile_http.py     # Test file (locustfile_http.py, locustfile_graphql.py)
LOCUST_TAGS=                       # Filter tests by tags (optional)
LOCUST_WORKERS=5                   # Number of worker containers
LOCUST_DEBUG_MODE=false            # Enable debug logging (true/false)

# Target Configuration
LOCUST_HTTP_HOST=http://backend:8080  # HTTP/GraphQL target
LOCUST_HOST=http://backend:8080       # Locust host parameter
LOCUST_MYSQL_HOST=mysql-server     # MySQL hostname
LOCUST_MYSQL_PORT=3306             # MySQL port
LOCUST_MYSQL_USER=testuser         # MySQL username
LOCUST_MYSQL_PASSWORD=testpassword # MySQL password
LOCUST_MYSQL_DATABASE=information_schema  # MySQL database
LOCUST_MYSQL_CARTESIAN_LIMIT=10000 # LIMIT for cartesian join queries

# Load parameters (make locust:up lets you set these from the UI too;
# make locust:test needs LOCUST_RUN_TIME set up front - it's headless)
LOCUST_USERS=10                    # Number of concurrent users
LOCUST_SPAWN_RATE=1                # User spawn rate (users/second)
LOCUST_RUN_TIME=60s                # [REQUIRED for locust:test] Test duration (e.g., 1h30m, 60s)

# Cluster Configuration
LOCUST_MASTER_HOST=192.168.1.100   # Master IP for distributed testing
```

> **Warning: `make locust:test` runs without user intervention.**
> It starts the load test automatically (headless, no UI) and continues until explicitly stopped.
> **Always set `LOCUST_RUN_TIME`** to limit the test duration and prevent unintended sustained load on the target system.
> If `LOCUST_RUN_TIME` is not set, `make locust:test` will exit with an error to avoid runaway load tests.

**Log Files:**

All logs are saved in timestamped directories: `locust/logs/YYYYMMDD_HHMMSS/`

- `target_host.txt` - Test configuration (target host, locustfile, tags, workers)
- `result.log` - Master + worker container output
- `master.log` - Locust framework logs
- `debug.log` - Worker debug messages (only if `LOCUST_DEBUG_MODE=true`)
- `locust_stats.csv` - Current aggregated statistics (periodically overwritten)
- `locust_stats_history.csv` - Time-series data (appended every second)
- `locust_failures.csv` - Failure records
- `locust_exceptions.csv` - Exception records
- `report.html` - Final test report

## 🔗 Cluster Load Testing

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

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025, Shunjiro Yatsuzuka, NASEBANAL
