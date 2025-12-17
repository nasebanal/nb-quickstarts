#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### LOCUST MANAGEMENT ###################

locust:
	@echo "🚀 Locust Load Testing Commands:"
	@echo ""
	@echo "Container Management:"
	@echo "  locust:build       - Build custom Locust Docker image with MySQL support"
	@echo "  locust:pull        - Pull Locust Docker image"
	@echo "  locust:run         - Start Locust master and worker containers"
	@echo "  locust:open        - Open Locust UI in browser"
	@echo "  locust:stop        - Stop and remove Locust containers"
	@echo "  locust:restart     - Restart Locust containers"
	@echo "  locust:status      - Check Locust container status"
	@echo ""
	@echo "Load Testing:"
	@echo "  locust:test-http         - Run HTTP server load test with UI (http://localhost:8089)"
	@echo "  locust:test-http-root    - Run HTTP root page test with tag 'http-root' (http://localhost:8089)"
	@echo "  locust:test-http-login   - Run HTTP login test with tag 'http-login' (http://localhost:8089)"
	@echo "  locust:test-graphql         - Run GraphQL load test (all GraphQL operations) (http://localhost:8089)"
	@echo "  locust:test-graphql-query   - Run GraphQL query test with tag 'graphql-query' (http://localhost:8089)"
	@echo "  locust:test-graphql-mutation - Run GraphQL mutation test with tag 'graphql-mutation' (http://localhost:8089)"
	@echo "  locust:test-mysql        - Run MySQL load test with UI (http://localhost:8089)"
	@echo "  locust:test-mysql-select - Run MySQL select test with tag 'mysql-select' (http://localhost:8089)"
	@echo "  locust:test-mysql-cartesian - Run MySQL cartesian join test with tag 'mysql-cartesian' (http://localhost:8089)"
	@echo ""
	@echo "Cluster Management:"
	@echo "  locust:join-cluster - Join an existing Locust cluster as worker from remote PC"
	@echo ""
	@echo "Usage:"
	@echo "  1. Copy .env.example to .env:  cp .env.example .env"
	@echo "  2. Edit .env to configure test parameters"
	@echo "  3. Run load test:  make locust:run"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  LOCUST_FILE=locustfile_http.py     # Choose: locustfile_http.py, locustfile_graphql.py"
	@echo "  LOCUST_TAGS=                       # Optional: http-root, http-login, graphql-query, graphql-mutation, mysql-select, mysql-cartesian"
	@echo "  LOCUST_WORKERS=1                   # Number of worker containers"
	@echo "  LOCUST_IMAGE=locust-mysql:latest   # Docker image"
	@echo "  LOCUST_HTTP_HOST=http://...        # HTTP/GraphQL target URL"
	@echo "  LOCUST_MYSQL_HOST=mysql-server     # MySQL hostname"
	@echo "  LOCUST_MYSQL_DATABASE=...          # MySQL database name"
	@echo "  LOCUST_MYSQL_CARTESIAN_LIMIT=10000 # Cartesian join LIMIT value"
	@echo ""
	@echo "Headless Mode (auto-start without UI):"
	@echo "  LOCUST_HEADLESS_FLAG=--headless    # Enable headless mode (empty for UI mode)"
	@echo "  LOCUST_USERS=10                    # Number of concurrent users"
	@echo "  LOCUST_SPAWN_RATE=1                # User spawn rate (users/second)"
	@echo "  LOCUST_RUN_TIME=                   # Optional: Test duration (e.g., 1h30m, 60s)"
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
	@echo "  make locust:test-http [LOCUST_HTTP_HOST=url]"
	@echo "  make locust:test-mysql [LOCUST_MYSQL_HOST=host] [LOCUST_MYSQL_PORT=port] [LOCUST_MYSQL_USER=user] [LOCUST_MYSQL_PASSWORD=pass] [LOCUST_MYSQL_DATABASE=db]"
	@echo "  make locust:join-cluster [LOCUST_MASTER_HOST=ip] [LOCUST_WORKERS=n]"

locust\:%:
	@$(MAKE) locust-$(subst locust:,,$@)

#################### LOCUST ACTIONS ###################

locust-build:
	@echo "Building custom Locust Docker image with MySQL support..."
	@docker build -t locust-mysql:$${LOCUSTIO_VERSION:-2.42.2} \
		--build-arg LOCUSTIO_VERSION=$${LOCUSTIO_VERSION:-2.42.2} \
		locust/
	@echo "Custom Locust image built successfully as locust-mysql:$${LOCUSTIO_VERSION:-2.42.2}"

locust-pull:
	@echo "Pulling Locust Docker image..."
	@docker pull locustio/locust:$${LOCUSTIO_VERSION:-2.42.2}
	@echo "Locust image pulled successfully."

locust-run:
	@echo "Starting HTTP server, MySQL, and Locust containers with Docker Compose..."
	@echo "Using Locust file: $${LOCUST_FILE:-locustfile_http.py}"
	@echo "Tags: $${LOCUST_TAGS:-none}"
	@echo "Workers: $${LOCUST_WORKERS:-1}"
	@echo "Target Host: $${LOCUST_HOST:-http://http-server:8080}"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
		LOG_DIR="locust/logs/$$TIMESTAMP"; \
		mkdir -p $$LOG_DIR; \
		MASTER_LOGFILE="/mnt/locust/logs/$$TIMESTAMP/master.log"; \
		DEBUG_LOGFILE="$$LOG_DIR/debug.log"; \
		RESULT_LOGFILE="$$LOG_DIR/result.log"; \
		CSV_PREFIX="/mnt/locust/logs/$$TIMESTAMP/locust"; \
		HTML_FILE="/mnt/locust/logs/$$TIMESTAMP/report.html"; \
		echo "Target Host: $${LOCUST_HOST:-http://http-server:8080}" > $$LOG_DIR/target_host.txt; \
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
			LOCUST_HOST=$${LOCUST_HOST:-http://http-server:8080} \
			LOCUST_LOGFILE=$$MASTER_LOGFILE \
			LOCUST_LOGLEVEL=DEBUG \
			LOCUST_CSV_PREFIX=$$CSV_PREFIX \
			LOCUST_HTML_FILE=$$HTML_FILE \
			docker compose -p locust -f locust/docker-compose.yml up -d --scale worker=$${LOCUST_WORKERS:-1}; \
		sleep 3; \
		WORKER_CONTAINER=$$(docker ps --format "{{.Names}}" | grep -E "worker-[0-9]+" | head -1); \
		if [ "$${LOCUST_DEBUG_MODE:-false}" = "true" ]; then \
			echo "Collecting logs from master and worker ($$WORKER_CONTAINER)..."; \
			nohup docker logs -f locust-master > $$RESULT_LOGFILE 2>&1 & \
			echo $$! > locust/.result_log_pid; \
			nohup docker logs -f $$WORKER_CONTAINER 2>&1 | tee -a $$RESULT_LOGFILE | grep --line-buffered -E '(✅|❌|⚠️|^  - )' > $$DEBUG_LOGFILE & \
			echo $$! > locust/.debug_log_pid; \
			echo "Debug mode enabled. Collecting from worker: $$WORKER_CONTAINER"; \
			echo "Debug logs: $$DEBUG_LOGFILE"; \
		else \
			nohup docker logs -f locust-master > $$RESULT_LOGFILE 2>&1 & \
			echo $$! > locust/.result_log_pid; \
		fi
	@echo "Locust containers started. Access Locust UI at http://localhost:8089 and HTTP server at http://localhost:8080"

locust-open:
	@bin/open_browser.sh http://localhost:8089

locust-stop:
	@echo "Stopping HTTP server, MySQL, and Locust containers..."
	@if [ -f locust/.result_log_pid ]; then \
		kill $$(cat locust/.result_log_pid) 2>/dev/null || true; \
		rm -f locust/.result_log_pid; \
	fi
	@if [ -f locust/.debug_log_pid ]; then \
		kill $$(cat locust/.debug_log_pid) 2>/dev/null || true; \
		rm -f locust/.debug_log_pid; \
	fi
	@docker compose -p locust -f locust/docker-compose.yml down
	@docker compose -f locust/docker-compose-worker.yml down 2>/dev/null || true
	@rm -f .locust_cluster_mode
	@echo "All containers stopped and removed."

locust-restart:
	@$(MAKE) locust-stop
	@$(MAKE) locust-run LOCUST_WORKERS=$(LOCUST_WORKERS)

locust-status:
	@echo "Checking Locust container status..."
	@docker compose -p locust -f locust/docker-compose.yml ps

locust-test-http:
	@echo "Starting HTTP server load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_http.py LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-http-root:
	@echo "Starting HTTP root page load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_http.py LOCUST_TAGS=http-root LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-http-login:
	@echo "Starting HTTP login load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_http.py LOCUST_TAGS=http-login LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-graphql:
	@echo "Starting GraphQL load test (all operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_graphql.py LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-graphql-query:
	@echo "Starting GraphQL query load test (read operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_graphql.py LOCUST_TAGS=graphql-query LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-graphql-mutation:
	@echo "Starting GraphQL mutation load test (write operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_graphql.py LOCUST_TAGS=graphql-mutation LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} locust-run

locust-test-mysql:
	@echo "Starting MySQL load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_mysql.py LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} locust-run

locust-test-mysql-select:
	@echo "Starting MySQL select load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_mysql.py LOCUST_TAGS=mysql-select LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} locust-run

locust-test-mysql-cartesian:
	@echo "Starting MySQL cartesian join load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@$(MAKE) LOCUST_FILE=locustfile_mysql.py LOCUST_TAGS=mysql-cartesian LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} locust-run

locust-join-cluster:
	@echo "Joining existing Locust cluster..."
	@if [ -z "$(LOCUST_MASTER_HOST)" ]; then \
		echo "Error: LOCUST_MASTER_HOST is required"; \
		echo "Set it in .env file or pass as argument: make locust:join-cluster LOCUST_MASTER_HOST=<master-ip>"; \
		echo "Usage: make locust:join-cluster [LOCUST_MASTER_HOST=<master-ip>] [LOCUST_WORKERS=n] [LOCUST_FILE=locustfile.py]"; \
		exit 1; \
	fi
	@echo "Building Locust image if needed..."
	@docker build -t $(LOCUST_IMAGE) locust/ 2>/dev/null || docker build -t locust-mysql:latest locust/ || true
	@echo "Starting $(LOCUST_WORKERS) worker(s) to connect to $(LOCUST_MASTER_HOST)..."
	@LOCUST_FILE=$(LOCUST_FILE) \
		LOCUST_MASTER_HOST=$(LOCUST_MASTER_HOST) \
		docker compose -f locust/docker-compose-worker.yml up -d --scale locust-worker=$(LOCUST_WORKERS)
	@echo "Workers started and connected to cluster at $(LOCUST_MASTER_HOST)"
	@echo "Check master UI at http://$(LOCUST_MASTER_HOST):8089"
