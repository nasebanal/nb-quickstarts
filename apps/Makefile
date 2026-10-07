#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### APPS (TEST TARGETS) ###################
# apps is the actual test target itself: MySQL + backend (Python/FastAPI,
# REST+GraphQL) + frontend (TypeScript/Next.js).
#   - backend reads/writes transactions in MySQL. The OpenAPI contract lives
#     in ../shared/openapi/ (mounted read-only by backend and frontend, as
#     well as Specmatic and agentgateway) - nobody needs the backend to read it.
#   - Kafka events reach transactions via a separate container, kafka-bridge
#     (see kafka/docker-compose.yml + kafka/bridge/), which consumes the
#     topic and calls POST /transactions over REST - not an in-process consumer
#     here, so apps/backend has zero Kafka dependency.
# Locust/Playwright/Vitest/Pytest/Specmatic and Kong (gateway)
# are added as modules separate from apps, connecting to
# apps-network. Test tools read their target host from env vars only (never
# a hardcoded container name), so the same commands work whether apps is
# running or you're pointing at an external host instead.

apps:
	@echo "🚀 Apps"
	@echo "Test-target stack under verification: MySQL + FastAPI backend (REST/GraphQL/MCP) + Next.js frontend."
	@echo ""
	@echo "Container Management:"
	@echo "  apps:up             - Build (if needed) and start test target apps (MySQL + backend + frontend)."
	@echo "  apps:down           - Stop and remove apps containers (MySQL data preserved)"
	@echo "  apps:status         - Check apps container status"
	@echo "  apps:restart        - Restart apps containers (MySQL data preserved)"
	@echo "  apps:reset          - Stop AND wipe MySQL data (does not start anything; run apps:up after)"
	@echo "  apps:open           - Open the frontend (TypeScript UI) in browser"
	@echo "  apps:mysql          - Open a mysql shell on the database (or: make apps:mysql SQL='SELECT ...')"
	@echo "  apps:sql            - Open the SQL client (phpMyAdmin, already logged in to demo) in browser"
	@echo "  apps:mcp            - Open MCP Inspector in browser (lists both the backend's MCP and agentgateway's MCP)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  APPS_MCP_INSPECTOR_VERSION=2.9     # ghcr.io/modelcontextprotocol/inspector image tag"
	@echo "  APPS_MCP_INSPECTOR_PORT=6274       # Host-published MCP Inspector UI port"
	@echo "  APPS_API_BASE=http://localhost:8080 # URL apps/frontend calls from the"
	@echo "                                              # browser - set to http://localhost:8000/api"
	@echo "                                              # to route through Kong's apps_backend"
	@echo "                                              # route instead (needs kong:up too)"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Frontend:        http://localhost:5173"
	@echo "  API docs:        http://localhost:5173/api-specs (Scalar, reads the shared OpenAPI contract directly)"
	@echo "  Docs:            http://localhost:5173/docs (architecture, data model, auth/secrets, tooling)"
	@echo "  Backend REST:    http://localhost:8080"
	@echo "  Backend GraphQL: http://localhost:8080/graphql"
	@echo "  MCP server:      http://localhost:8080/mcp"
	@echo "  MCP Inspector:   http://localhost:6274 (see apps:mcp; also reaches agentgateway's MCP after agentgateway:up)"
	@echo "  MySQL:           localhost:3306 (database: demo)"
	@echo "  SQL client:      http://localhost:8081 (phpMyAdmin, no login - see apps:sql)"
	@echo ""
	@echo "Note: apps:up/apps:down manage the test target lifecycle independently"
	@echo "      from any test tool. Point a test tool at an external host instead"
	@echo "      (e.g. LOCUST_HTTP_HOST=https://staging.example.com) to test without apps."

apps\:%:
	@$(MAKE) apps-$(subst apps:,,$@)

#################### APPS ACTIONS ###################

# 他モジュール(locust 等)からも呼ばれる、冪等なネットワーク作成ターゲット。
# apps を起動していなくても、apps-network に接続するモジュールを先に起動できるようにする。
apps-network-ensure:
	@docker network create apps-network >/dev/null 2>&1 || true

apps-up: apps-network-ensure
	@echo "Starting apps (MySQL + backend + frontend)..."
	@docker compose -p apps -f apps/docker-compose.yml up -d $${APPS_BUILD_FLAG---build}
	@printf "Waiting for MySQL (mysql-server) to be ready"
	@i=0; \
		until [ "$$(docker inspect -f '{{.State.Health.Status}}' nb-mysql-server 2>/dev/null)" = "healthy" ] || [ $$i -ge 60 ]; do \
			printf "."; sleep 1; i=$$((i+1)); \
		done; \
		if [ "$$(docker inspect -f '{{.State.Health.Status}}' nb-mysql-server 2>/dev/null)" = "healthy" ]; then echo " ready"; else echo " timeout (continuing)"; fi
	@echo "Apps started."
	@echo "  Frontend:        http://localhost:5173"
	@echo "  API docs:        http://localhost:5173/api-specs"
	@echo "  Docs:            http://localhost:5173/docs"
	@echo "  Backend REST:    http://localhost:8080"
	@echo "  Backend GraphQL: http://localhost:8080/graphql"
	@echo "  MCP server:      http://localhost:8080/mcp"
	@echo "  MCP Inspector:   http://localhost:$${APPS_MCP_INSPECTOR_PORT:-6274} (make apps:mcp)"
	@echo "  MySQL:           localhost:$${APPS_MYSQL_PORT:-3306}"
	@echo "  SQL client:      http://localhost:$${APPS_SQL_CLIENT_PORT:-8081} (phpMyAdmin, already logged in)"

apps-down:
	@echo "Stopping apps containers..."
	@docker compose -p apps -f apps/docker-compose.yml down --remove-orphans
	@echo "Apps containers stopped and removed. (MySQL data preserved in the apps_apps-db-data Docker volume — use 'make apps:reset' to wipe it.)"

apps-status:
	@echo "Checking apps container status..."
	@docker compose -p apps -f apps/docker-compose.yml ps

apps-restart:
	@$(MAKE) apps-down
	@$(MAKE) apps-up

apps-reset:
	@echo "Resetting apps (wiping MySQL data)..."
	@docker compose -p apps -f apps/docker-compose.yml down --remove-orphans --volumes
	@echo "Apps containers and MySQL data removed. Nothing is started - run 'make apps:up' for a fresh database."

apps-open:
	@bin/open_browser.sh http://localhost:5173

apps-sql:
	@bin/open_browser.sh "http://localhost:$${APPS_SQL_CLIENT_PORT:-8081}/index.php?route=/database/structure&db=$${APPS_MYSQL_DATABASE:-demo}"

# MCP Inspector starts with apps:up (already-running is a no-op here). Its
# server list (apps/mcp-inspector/config.json) has both the backend's own /mcp
# and agentgateway's /mcp; pick one in the UI and Connect - the login page opens
# in the browser and you sign in there. The Inspector's UI token is in the URL,
# so no copy-paste of the token printed in the container log. The sidecar
# (mcp-inspector-localhost) is what lets the Inspector's container reach the
# localhost:8080 / :8010 addresses the login advertises.
apps-mcp: apps-network-ensure
	@docker compose -p apps -f apps/docker-compose.yml up -d mcp-inspector mcp-inspector-localhost
	@printf "Waiting for MCP Inspector"
	@i=0; until curl -fs -o /dev/null "http://localhost:$${APPS_MCP_INSPECTOR_PORT:-6274}/" || [ $$i -ge 30 ]; do printf "."; sleep 1; i=$$((i+1)); done; echo ""
	@if ! docker ps --format '{{.Names}}' | grep -q '^nb-agentgateway$$'; then echo "Note: agentgateway is not running - its server will fail to connect until 'make agentgateway:up'."; fi
	@bin/open_browser.sh "http://localhost:$${APPS_MCP_INSPECTOR_PORT:-6274}/?MCP_INSPECTOR_API_TOKEN=$${APPS_MCP_INSPECTOR_TOKEN:-nb-mcp-inspector-token}"

# With SQL='...' runs that one statement; without, opens an interactive shell.
apps-mysql:
	@if [ -n "$$SQL" ]; then \
		docker exec nb-mysql-server mysql -uroot -p$${APPS_MYSQL_ROOT_PASSWORD:-rootpassword} -t $${APPS_MYSQL_DATABASE:-demo} -e "$$SQL" 2>/dev/null; \
	else \
		docker exec -it nb-mysql-server mysql -uroot -p$${APPS_MYSQL_ROOT_PASSWORD:-rootpassword} $${APPS_MYSQL_DATABASE:-demo}; \
	fi
