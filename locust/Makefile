#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### TARGET HOST ###################
# 対象ホストは Makefile では決めない。各 locustfile が環境変数から自分で設定する:
#   - HTTP/GraphQL: locustfile が HTTP_HOST を読む（compose が LOCUST_HTTP_HOST を渡す）
#   - MySQL:        locustfile が MYSQL_HOST/PORT/USER/... を読んで接続する
# よって別ホストを叩くときは .env の LOCUST_HTTP_HOST / LOCUST_MYSQL_* を変更する。
#
# locust:up はテスト対象アプリ（MySQL/HTTPサーバー）を起動しない。
#   - apps（同梱のモックアプリ）を対象にするときは、先に `make apps:up` しておく
#   - 外部ホストを対象にするときは、.env の LOCUST_HTTP_HOST / LOCUST_MYSQL_HOST を
#     外部URLに変更するだけでよい（apps を起動する必要はない）

#################### LOCUST MANAGEMENT ###################

locust:
	@echo "🚀 Locust"
	@echo "Locust - Python-based load testing. Here targeting apps (or an external host)."
	@echo ""
	@echo "Container Management:"
	@echo "  locust:up          - Build (if needed) and start Locust with its Web UI (no auto-run)"
	@echo "  locust:test        - Same, but headless: starts the load test immediately, no UI"
	@echo "  locust:down        - Stop and remove Locust containers"
	@echo "  locust:status      - Check Locust container status"
	@echo "  locust:restart     - Restart Locust containers"
	@echo "  locust:open        - Open Locust UI in browser"
	@echo ""
	@echo "Load Testing (configure via .env or CLI, then run locust:up or locust:test):"
	@echo "  make apps:up                                            # start test target apps (once)"
	@echo "  make locust:up                                          # UI mode - uses .env settings, start the test from the browser"
	@echo "  make locust:test LOCUST_RUN_TIME=60s                    # headless - starts immediately, stops after LOCUST_RUN_TIME"
	@echo "  make locust:up LOCUST_FILE=locustfile_http.py"
	@echo "  make locust:up LOCUST_FILE=locustfile_graphql.py LOCUST_TAGS=graphql-query"
	@echo "  make locust:up LOCUST_FILE=locustfile_mysql.py   LOCUST_TAGS=mysql-select"
	@echo "  (to switch test types cleanly, run locust:restart, or locust:down then locust:up)"
	@echo ""
	@echo "REST vs. Kafka-buffered ingestion (see README 'Kafka bridge' for measured results):"
	@echo "  make locust:test LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s"
	@echo "  make kafka:bridge-up  # then the same load, buffered:"
	@echo "  make locust:test LOCUST_FILE=locustfile_kafka.py        LOCUST_USERS=600 LOCUST_SPAWN_RATE=200 LOCUST_RUN_TIME=60s"
	@echo ""
	@echo "Note: locust:up no longer starts the target apps (MySQL/HTTP server)."
	@echo "      Run 'make apps:up' first to target the bundled apps, or point"
	@echo "      LOCUST_HTTP_HOST/LOCUST_MYSQL_HOST at an external host instead."
	@echo "      First time here? cp .env.example .env, then edit it before make locust:up."
	@echo ""
	@echo "Cluster Management:"
	@echo "  locust:join-cluster - Join an existing Locust cluster as worker from remote PC"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  LOCUST_FILE=locustfile_http.py     # Choose: locustfile_http.py, locustfile_graphql.py, locustfile_mysql.py"
	@echo "  LOCUST_TAGS=                       # Optional: http-root, http-login, graphql-query, graphql-mutation, mysql-select, mysql-cartesian"
	@echo "  LOCUST_WORKERS=1                   # Number of worker containers"
	@echo "  LOCUST_IMAGE=nb-locust-mysql:latest # Docker image"
	@echo "  LOCUST_HTTP_HOST=http://...        # HTTP/GraphQL target URL"
	@echo "  LOCUST_MYSQL_HOST=mysql-server     # MySQL hostname"
	@echo "  LOCUST_MYSQL_DATABASE=...          # MySQL database name"
	@echo "  LOCUST_MYSQL_CARTESIAN_LIMIT=10000 # Cartesian join LIMIT value"
	@echo ""
	@echo "Load parameters (locust:up lets you set these from the UI too; locust:test needs them up front):"
	@echo "  LOCUST_USERS=10                    # Number of concurrent users"
	@echo "  LOCUST_SPAWN_RATE=1                # User spawn rate (users/second)"
	@echo "  LOCUST_RUN_TIME=                   # Required for locust:test (e.g., 1h30m, 60s); ignored by locust:up"
	@echo ""
	@echo "Log Files (saved in timestamped directory):"
	@echo "  Directory: locust/logs/YYYYMMDD_HHMMSS/"
	@echo "    - target_host.txt (test configuration: target host, locustfile, tags, workers)"
	@echo "    - result.log (master + worker container output)"
	@echo "    - master.log (Locust framework logs)"
	@echo "    - debug.log (worker debug messages, only if LOCUST_DEBUG_MODE=true)"
	@echo "    - locust_stats.csv (current aggregated statistics, periodically overwritten)"
	@echo "    - locust_stats_history.csv (time-series data, appended every second)"
	@echo "    - locust_failures.csv (failure records)"
	@echo "    - locust_exceptions.csv (exception records)"
	@echo "    - report.html (final test report)"
	@echo ""
	@echo "Other commands (with optional parameters):"
	@echo "  make locust:up [LOCUST_HTTP_HOST=url] [LOCUST_MYSQL_HOST=host] [LOCUST_WORKERS=n]"
	@echo "  make locust:join-cluster [LOCUST_MASTER_HOST=ip] [LOCUST_WORKERS=n]"

locust\:%:
	@$(MAKE) locust-$(subst locust:,,$@)

#################### LOCUST ACTIONS ###################

# make locust:up   -> UI mode, no --headless: start containers and pick users/spawn-rate/run-time from the browser.
# make locust:test -> headless: starts the load test immediately with no UI, bounded by LOCUST_RUN_TIME.
# Both funnel into locust-run below; only the headless flag differs.
locust-up: apps-network-ensure
	@$(MAKE) locust-run LOCUST_HEADLESS_FLAG=

locust-test: apps-network-ensure
	@if [ -z "$${LOCUST_RUN_TIME}" ]; then \
		echo "Error: LOCUST_RUN_TIME is required for locust:test (headless mode)"; \
		echo "Set it via .env or: make locust:test LOCUST_RUN_TIME=60s"; \
		exit 1; \
	fi
	@$(MAKE) locust-run LOCUST_HEADLESS_FLAG=--headless

locust-run:
	@echo "Starting Locust containers via Docker Compose..."
	@echo "Using Locust file: $${LOCUST_FILE:-locustfile_http.py}"
	@echo "Tags: $${LOCUST_TAGS:-none}"
	@echo "Workers: $${LOCUST_WORKERS:-1}"
	@DISPLAY_HOST=$$(case "$${LOCUST_FILE:-locustfile_http.py}" in \
			*mysql*) echo "mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema}" ;; \
			*)       echo "$${LOCUST_HTTP_HOST:-http://backend:8080}" ;; \
		esac); \
		echo "Target Host (set by locustfile): $$DISPLAY_HOST"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
		LOG_DIR="locust/logs/$$TIMESTAMP"; \
		mkdir -p $$LOG_DIR; \
		MASTER_LOGFILE="/mnt/locust/logs/$$TIMESTAMP/master.log"; \
		DEBUG_LOGFILE="$$LOG_DIR/debug.log"; \
		RESULT_LOGFILE="$$LOG_DIR/result.log"; \
		CSV_PREFIX="/mnt/locust/logs/$$TIMESTAMP/locust"; \
		HTML_FILE="/mnt/locust/logs/$$TIMESTAMP/report.html"; \
		DISPLAY_HOST=$$(case "$${LOCUST_FILE:-locustfile_http.py}" in \
			*mysql*) echo "mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema}" ;; \
			*)       echo "$${LOCUST_HTTP_HOST:-http://backend:8080}" ;; \
		esac); \
		echo "Target Host: $$DISPLAY_HOST" > $$LOG_DIR/target_host.txt; \
		echo "Locust File: $${LOCUST_FILE:-locustfile_http.py}" >> $$LOG_DIR/target_host.txt; \
		echo "Tags: $${LOCUST_TAGS:-all}" >> $$LOG_DIR/target_host.txt; \
		echo "Workers: $${LOCUST_WORKERS:-1}" >> $$LOG_DIR/target_host.txt; \
		echo "Timestamp: $$TIMESTAMP" >> $$LOG_DIR/target_host.txt; \
		echo "Log directory: $$LOG_DIR"; \
		echo "Log files:"; \
		echo "  - result.log (master + worker container output)"; \
		echo "  - master.log (Locust framework logs)"; \
		if [ "$${LOCUST_DEBUG_MODE:-false}" = "true" ]; then \
			echo "  - debug.log (debug messages from worker tasks)"; \
		fi; \
		echo "  - locust_stats.csv, locust_stats_history.csv, locust_failures.csv, locust_exceptions.csv"; \
		echo "  - report.html"; \
		LOCUST_FILE=$${LOCUST_FILE:-locustfile_http.py} \
			LOCUST_TAGS=$${LOCUST_TAGS:-} \
			LOCUST_LOGFILE=$$MASTER_LOGFILE \
			LOCUST_LOGLEVEL=DEBUG \
			LOCUST_CSV_PREFIX=$$CSV_PREFIX \
			LOCUST_HTML_FILE=$$HTML_FILE \
			docker compose -p locust -f locust/docker-compose.yml up -d --build --scale worker=$${LOCUST_WORKERS:-1}; \
		sleep 3; \
		WORKER_CONTAINER=$$(docker ps --format "{{.Names}}" | grep -E "worker-[0-9]+" | head -1); \
		if [ "$${LOCUST_DEBUG_MODE:-false}" = "true" ]; then \
			echo "Collecting logs from master and worker ($$WORKER_CONTAINER)..."; \
			nohup docker logs -f nb-locust-master > $$RESULT_LOGFILE 2>&1 & \
			echo $$! > locust/.result_log_pid; \
			nohup docker logs -f $$WORKER_CONTAINER 2>&1 | tee -a $$RESULT_LOGFILE | grep --line-buffered -E '(✅|❌|⚠️|^  - )' > $$DEBUG_LOGFILE & \
			echo $$! > locust/.debug_log_pid; \
			echo "Debug mode enabled. Collecting from worker: $$WORKER_CONTAINER"; \
			echo "Debug logs: $$DEBUG_LOGFILE"; \
		else \
			nohup docker logs -f nb-locust-master > $$RESULT_LOGFILE 2>&1 & \
			echo $$! > locust/.result_log_pid; \
		fi
	@echo "Locust containers started. Access Locust UI at http://localhost:8089"

locust-down:
	@echo "Stopping Locust containers..."
	@if [ -f locust/.result_log_pid ]; then \
		kill $$(cat locust/.result_log_pid) 2>/dev/null || true; \
		rm -f locust/.result_log_pid; \
	fi
	@if [ -f locust/.debug_log_pid ]; then \
		kill $$(cat locust/.debug_log_pid) 2>/dev/null || true; \
		rm -f locust/.debug_log_pid; \
	fi
	@docker compose -p locust -f locust/docker-compose.yml down --remove-orphans
	@docker compose -f locust/docker-compose-worker.yml down 2>/dev/null || true
	@rm -f .locust_cluster_mode
	@echo "Locust containers stopped and removed. (apps are unaffected; use 'make apps:down' to stop them.)"

locust-status:
	@echo "Checking Locust container status..."
	@docker compose -p locust -f locust/docker-compose.yml ps

locust-restart:
	@$(MAKE) locust-down
	@$(MAKE) locust-up

locust-open:
	@bin/open_browser.sh http://localhost:8089

locust-join-cluster:
	@echo "Joining existing Locust cluster..."
	@if [ -z "$(LOCUST_MASTER_HOST)" ]; then \
		echo "Error: LOCUST_MASTER_HOST is required"; \
		echo "Set it in .env file or pass as argument: make locust:join-cluster LOCUST_MASTER_HOST=<master-ip>"; \
		echo "Usage: make locust:join-cluster [LOCUST_MASTER_HOST=<master-ip>] [LOCUST_WORKERS=n] [LOCUST_FILE=locustfile.py]"; \
		exit 1; \
	fi
	@echo "Starting $(LOCUST_WORKERS) worker(s) to connect to $(LOCUST_MASTER_HOST)..."
	@LOCUST_FILE=$(LOCUST_FILE) \
		LOCUST_MASTER_HOST=$(LOCUST_MASTER_HOST) \
		docker compose -f locust/docker-compose-worker.yml up -d --build --scale locust-worker=$(LOCUST_WORKERS)
	@echo "Workers started and connected to cluster at $(LOCUST_MASTER_HOST)"
	@echo "Check master UI at http://$(LOCUST_MASTER_HOST):8089"
