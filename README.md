# NASEBANAL Quickstarts

A collection of quickstart templates and examples to help developers get started quickly with various technologies and frameworks.
You can find a quick demo movie below.

https://youtu.be/8UI0XZrSPkQ

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [License](#license)

## 🚀 Overview

**NASEBANAL Quickstarts is a verification toolkit for the [NASEBANAL Stack](https://www.nasebanal.com)** — the proven open-source technologies NASEBANAL builds on (Kafka, Consul, Kong, Locust, pytest, vitest, Playwright, Specmatic, Microcks, ...), not a scaffold for every technology out there. Each module spins up one piece of that stack (or a tool that verifies it) via Docker Compose + `make`, so you can try it, test against it, and see how the pieces fit together. Like the constituents of the NASEBANAL Stack itself, which modules are here may change as the stack evolves.

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

- `apps/backend` — Python (FastAPI). REST + GraphQL over a minimal `items`
  table (`id`, `name`, `quantity`, `source`, `createdAt`) in MySQL (`testdb`).
  The OpenAPI schema is exported to `apps/backend/openapi.json` (regenerate
  with `make apps:export-openapi`); Specmatic and Microcks read it directly.
  The read/write logic lives in `app/services/item_service.py`, which both
  the REST and GraphQL routers call — a future Kafka consumer (driven by
  `make kafka:up`) is meant to call `register_item(..., source="kafka")`
  from that same module, so an event-to-backend scenario can be added
  without touching the HTTP/GraphQL layers. That consumer isn't implemented
  yet. Also mounts an MCP server at `/mcp` (via `fastapi-mcp`), auto-derived
  from the same REST routes — point a local MCP client (e.g. Claude Desktop)
  at `http://localhost:8080/mcp`.
- `apps/frontend` — TypeScript (Next.js). `/` is the landing page; logging
  in (via a modal) takes you to the real `/items` route, which calls the
  backend REST API directly from the browser. `/api-docs` renders the
  backend's live OpenAPI schema with Scalar.
- `mysql-server` — MySQL, seeded with a few sample items on first boot. Has
  no persistent volume, so `apps:down` always resets it.

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
- API docs (Scalar): http://localhost:5173/api-docs
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

apps and any tooling that connects to it (Locust, Microcks, and in the
future Kong as a gateway in front of apps) share the `apps-network` Docker
network, so they can be started in any order.

### Test/verification tools

These are separate modules from `apps` (see `AGENTS.md` for the full design). Long-running services follow the usual `build`/`up`/`down`/`status`/`restart`/`open` pattern; one-shot test runners use a single `test` target instead (`docker compose run --rm`, no `up`/`down`).

```bash
make apps:up                # start the apps under test first

make pytest:test            # apps/backend unit tests (in-memory SQLite, apps:up not required)
make vitest:test            # apps/frontend unit tests (fetch mocked, apps:up not required)
make playwright:test        # E2E browser test against the running frontend (requires apps:up)
make specmatic:test         # contract test of the running backend against apps/backend/openapi.json (requires apps:up)

make microcks:up            # long-running mock server loaded from apps/backend/openapi.json
make microcks:import-openapi
make microcks:open
```

### Locust Configuration

Load tests are driven by a single command, `make locust:up`. Pick the test
by setting `LOCUST_FILE` (which test) and optionally `LOCUST_TAGS` (which
subset) — in `.env` or on the command line. To switch test types cleanly,
use `make locust:restart` (or `make locust:down` then `make locust:up`).

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

# Headless Mode (auto-start without UI)
LOCUST_HEADLESS_FLAG=              # Set to --headless for headless mode
LOCUST_USERS=10                    # Number of concurrent users
LOCUST_SPAWN_RATE=1                # User spawn rate (users/second)
LOCUST_RUN_TIME=60s                # [REQUIRED in headless mode] Test duration (e.g., 1h30m, 60s)

# Cluster Configuration
LOCUST_MASTER_HOST=192.168.1.100   # Master IP for distributed testing
```

> **Warning: Headless mode runs without user intervention.**
> In headless mode (`LOCUST_HEADLESS_FLAG=--headless`), the load test starts automatically and continues until explicitly stopped.
> **Always set `LOCUST_RUN_TIME`** to limit the test duration and prevent unintended sustained load on the target system.
> If `LOCUST_RUN_TIME` is not set, `make locust:up` will exit with an error to avoid runaway load tests.

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
make locust:build
make locust:join-cluster LOCUST_MASTER_HOST=<PC1-IP> LOCUST_WORKERS=5
```

**Requirements:**
- Network connectivity between master and workers
- Ports 8089 (UI), 5557 (master-worker communication), 5558 (master-worker communication) accessible
- Same `LOCUST_FILE` on all machines

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025, Shunjiro Yatsuzuka, NASEBANAL
