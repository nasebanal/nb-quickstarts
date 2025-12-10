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
	@echo "  locust:stop-workers - Stop remote worker containers"
	@echo ""
	@echo "Usage:"
	@echo "  1. Copy .env.example to .env:  cp .env.example .env"
	@echo "  2. Edit .env to configure test parameters"
	@echo "  3. Run load test:  make locust:run"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  LOCUST_FILE=locustfile_http.py     # Choose: locustfile_http.py, locustfile_graphql.py, locustfile_mysql.py"
	@echo "  LOCUST_TAGS=                       # Optional: http-root, http-login, graphql-query, graphql-mutation, mysql-select, mysql-cartesian"
	@echo "  LOCUST_WORKERS=1                   # Number of worker containers"
	@echo "  LOCUST_IMAGE=locust-mysql:latest   # Docker image"
	@echo "  LOCUST_HTTP_HOST=http://...        # HTTP/GraphQL target URL"
	@echo "  LOCUST_MYSQL_HOST=mysql-server     # MySQL hostname"
	@echo "  LOCUST_MYSQL_DATABASE=...          # MySQL database name"
	@echo "  LOCUST_MYSQL_CARTESIAN_LIMIT=10000 # Cartesian join LIMIT value"
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
	@LOCUST_FILE=$${LOCUST_FILE:-locustfile_http.py} \
		LOCUST_TAGS=$${LOCUST_TAGS:-} \
		LOCUST_HOST=$${LOCUST_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-1}
	@echo "Locust containers started. Access Locust UI at http://localhost:8089 and HTTP server at http://localhost:8080"

locust-open:
	@bin/open_browser.sh http://localhost:8089

locust-stop:
	@echo "Stopping HTTP server, MySQL, and Locust containers..."
	@docker compose -f locust/docker-compose.yml down
	@rm -f .locust_cluster_mode
	@echo "All containers stopped and removed."

locust-restart:
	@$(MAKE) locust-stop
	@$(MAKE) locust-run LOCUST_WORKERS=$(LOCUST_WORKERS)

locust-status:
	@echo "Checking Locust container status..."
	@docker compose -f locust/docker-compose.yml ps

locust-test-http:
	@echo "Starting HTTP server load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_http.py \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-http-root:
	@echo "Starting HTTP root page load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_http.py \
		LOCUST_TAGS=http-root \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-http-login:
	@echo "Starting HTTP login load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_http.py \
		LOCUST_TAGS=http-login \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-graphql:
	@echo "Starting GraphQL load test (all operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_graphql.py \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-graphql-query:
	@echo "Starting GraphQL query load test (read operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_graphql.py \
		LOCUST_TAGS=graphql-query \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-graphql-mutation:
	@echo "Starting GraphQL mutation load test (write operations)..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_graphql.py \
		LOCUST_TAGS=graphql-mutation \
		LOCUST_HOST=$${LOCUST_HTTP_HOST:-http://http-server:8080} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-mysql:
	@echo "Starting MySQL load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_mysql.py \
		LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-mysql-select:
	@echo "Starting MySQL select load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_mysql.py \
		LOCUST_TAGS=mysql-select \
		LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-test-mysql-cartesian:
	@echo "Starting MySQL cartesian join load test..."
	@$(MAKE) locust-stop
	@echo "Starting Locust containers..."
	@LOCUST_FILE=locustfile_mysql.py \
		LOCUST_TAGS=mysql-cartesian \
		LOCUST_HOST=mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
		docker compose -f locust/docker-compose.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-5}
	@echo "Locust UI available at http://localhost:8089"

locust-join-cluster:
	@echo "Joining existing Locust cluster..."
	@if [ -z "$${LOCUST_MASTER_HOST}" ]; then \
		echo "Error: LOCUST_MASTER_HOST is required"; \
		echo "Usage: make locust:join-cluster LOCUST_MASTER_HOST=<master-ip> [LOCUST_WORKERS=n] [LOCUST_FILE=locustfile.py]"; \
		exit 1; \
	fi
	@echo "Building Locust image if needed..."
	@docker build -t $${LOCUST_IMAGE:-locust-mysql:latest} locust/ || true
	@echo "Starting $${LOCUST_WORKERS:-1} worker(s) to connect to $${LOCUST_MASTER_HOST}..."
	@LOCUST_FILE=$${LOCUST_FILE:-locustfile_http.py} \
		LOCUST_MASTER_HOST=$${LOCUST_MASTER_HOST} \
		docker compose -f locust/docker-compose-worker.yml up -d --scale locust-worker=$${LOCUST_WORKERS:-1}
	@echo "Workers started and connected to cluster at $${LOCUST_MASTER_HOST}"
	@echo "Check master UI at http://$${LOCUST_MASTER_HOST}:8089"

locust-stop-workers:
	@echo "Stopping remote worker containers..."
	@docker compose -f locust/docker-compose-worker.yml down
	@echo "Remote workers stopped and removed."
