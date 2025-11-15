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
	@docker build -t $${LOCUST_IMAGE} locust/
	@echo "Custom Locust image built successfully."

locust-pull:
	@echo "Pulling Locust Docker image..."
	@docker pull locustio/locust:latest
	@echo "Locust image pulled successfully."

locust-run:
	@echo "Starting HTTP server, MySQL, and Locust containers..."
	@docker network create locust-network || true
	@docker run -d --name mysql-server --network locust-network -p $${LOCUST_MYSQL_PORT:-3306}:3306 \
		-e MYSQL_ROOT_PASSWORD=$${LOCUST_MYSQL_ROOT_PASSWORD:-rootpassword} \
		-e MYSQL_DATABASE=testdb \
		-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
		-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
		mysql:latest
	@echo "MySQL server started on port $${LOCUST_MYSQL_PORT:-3306}"
	@docker run -d --name http-server --network locust-network -p 8080:8080 -v $(PWD)/locust:/app -w /app/www python:3.12-slim python3 ../bin/server.py
	@echo "HTTP server started on port 8080"
	@LOCUST_FILE_PATH=$${LOCUST_FILE:-locustfile_http.py}; \
	LOCUST_TAGS_ARG=""; \
	if [ -n "$${LOCUST_TAGS}" ]; then \
		LOCUST_TAGS_ARG="--tags $${LOCUST_TAGS}"; \
	fi; \
	echo "Using Locust file: $$LOCUST_FILE_PATH"; \
	echo "Tags: $${LOCUST_TAGS:-none}"; \
	docker run -d --name locust-master --network locust-network -p 8089:8089 -p 5557:5557 -p 5558:5558 \
		-v $(PWD)/locust:/mnt/locust \
		-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
		-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
		-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
		-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
		-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
		-e MYSQL_CARTESIAN_LIMIT=$${LOCUST_MYSQL_CARTESIAN_LIMIT:-10000} \
		$${LOCUST_IMAGE} -f /mnt/locust/bin/$$LOCUST_FILE_PATH --master --master-bind-host=0.0.0.0 --host=http://http-server:8080 $$LOCUST_TAGS_ARG
	@sleep 5
	@LOCUST_FILE_PATH=$${LOCUST_FILE:-locustfile_http.py}; \
	WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
	echo "Starting $$WORKER_COUNT Locust workers..."; \
	for i in $$(seq 1 $$WORKER_COUNT); do \
		docker run -d --name locust-worker-$$i --network locust-network \
			-v $(PWD)/locust:/mnt/locust \
			-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
			-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
			-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
			-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
			-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
			-e MYSQL_CARTESIAN_LIMIT=$${LOCUST_MYSQL_CARTESIAN_LIMIT:-10000} \
			$${LOCUST_IMAGE} -f /mnt/locust/bin/$$LOCUST_FILE_PATH --worker --master-host=locust-master; \
	done
	@echo "Locust containers started. Access Locust UI at http://localhost:8089 and HTTP server at http://localhost:8080"

locust-open:
	@bin/open_browser.sh http://localhost:8089

locust-stop:
	@echo "Stopping HTTP server, MySQL, and Locust containers..."
	@docker stop mysql-server http-server locust-master 2>/dev/null || true
	@docker ps -q --filter "name=locust-worker-" | xargs -r docker stop 2>/dev/null || true
	@docker rm mysql-server http-server locust-master 2>/dev/null || true
	@docker ps -aq --filter "name=locust-worker-" | xargs -r docker rm 2>/dev/null || true
	@docker network rm locust-network 2>/dev/null || true
	@rm -f .locust_cluster_mode
	@echo "All containers stopped and removed."

locust-restart:
	@$(MAKE) locust-stop
	@$(MAKE) locust-run LOCUST_WORKERS=$(LOCUST_WORKERS)

locust-status:
	@echo "Checking Locust container status..."
	@echo "Master container:"
	@docker ps -f "name=locust-master"
	@echo "Worker containers:"
	@docker ps -f "name=locust-worker-"
	@echo "Locust container status checked."

locust-test-http:
	@echo "Starting HTTP server load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT HTTP test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT HTTP workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: WebsiteUser class against $${LOCUST_HTTP_HOST}"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Starting locust-master container..."; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_http.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=locust-master \
				WebsiteUser; \
		done; \
		echo "HTTP load test started with $$WORKER_COUNT workers"; \
	fi

locust-test-mysql:
	@echo "Starting MySQL load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT MySQL test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				MySQLUser; \
		done; \
		echo "$$WORKER_COUNT MySQL workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: MySQLUser class against $${LOCUST_MYSQL_HOST}:$${LOCUST_MYSQL_PORT} (database: $${LOCUST_MYSQL_DATABASE})"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Starting locust-master container..."; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			-e MYSQL_HOST=$${LOCUST_MYSQL_HOST} \
			-e MYSQL_PORT=$${LOCUST_MYSQL_PORT} \
			-e MYSQL_USER=$${LOCUST_MYSQL_USER} \
			-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD} \
			-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE} \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_mysql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
			MySQLUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=locust-master \
				MySQLUser; \
		done; \
		echo "MySQL load test started with $$WORKER_COUNT workers"; \
	fi

locust-test-http-root:
	@echo "Starting HTTP root page load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT HTTP root test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT HTTP root workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: HTTP root page test with tag 'http-root'"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_http.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			--tags http-root \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "HTTP root page test started with $$WORKER_COUNT workers"; \
	fi

locust-test-http-login:
	@echo "Starting HTTP login load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT HTTP login test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT HTTP login workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: HTTP login test with tag 'http-login'"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_http.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			--tags http-login \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_http.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "HTTP login test started with $$WORKER_COUNT workers"; \
	fi

locust-test-graphql:
	@echo "Starting GraphQL load test (all operations)..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT GraphQL test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT GraphQL workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: GraphQL load test (all operations)"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_graphql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			--tags graphql-query graphql-mutation \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "GraphQL load test started with $$WORKER_COUNT workers"; \
	fi

locust-test-graphql-query:
	@echo "Starting GraphQL query load test (read operations)..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT GraphQL query test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT GraphQL query workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: GraphQL query test with tag 'graphql-query'"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_graphql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			--tags graphql-query \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "GraphQL query test started with $$WORKER_COUNT workers"; \
	fi

locust-test-graphql-mutation:
	@echo "Starting GraphQL mutation load test (write operations)..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT GraphQL mutation test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				WebsiteUser; \
		done; \
		echo "$$WORKER_COUNT GraphQL mutation workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: GraphQL mutation test with tag 'graphql-mutation'"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_graphql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host $${LOCUST_HTTP_HOST:-http://http-server:8080} \
			--tags graphql-mutation \
			WebsiteUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_graphql.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "GraphQL mutation test started with $$WORKER_COUNT workers"; \
	fi

locust-test-mysql-select:
	@echo "Starting MySQL select load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT MySQL select test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				MySQLUser; \
		done; \
		echo "$$WORKER_COUNT MySQL select workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: MySQL select test with tag 'mysql-select'"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
			-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
			-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
			-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
			-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_mysql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
			--tags mysql-select \
			MySQLUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "MySQL select test started with $$WORKER_COUNT workers"; \
	fi

locust-test-mysql-cartesian:
	@echo "Starting MySQL cartesian join load test..."
	@echo "Stopping existing worker containers..."
	@docker stop $$(docker ps -q --filter "name=locust-worker-") || true
	@docker rm $$(docker ps -aq --filter "name=locust-worker-") || true
	@if [ -f .locust_cluster_mode ]; then \
		CLUSTER_MASTER=$$(cat .locust_cluster_mode); \
		echo "Joining cluster mode: connecting to master at $$CLUSTER_MASTER"; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT MySQL cartesian test workers for cluster..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i \
				--network host \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
				-e MYSQL_CARTESIAN_LIMIT=$${LOCUST_MYSQL_CARTESIAN_LIMIT:-10000} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=$$CLUSTER_MASTER \
				MySQLUser; \
		done; \
		echo "$$WORKER_COUNT MySQL cartesian workers connected to cluster at $$CLUSTER_MASTER"; \
	else \
		echo "Standalone mode: starting local master and workers"; \
		echo "Stopping existing master container..."; \
		docker stop locust-master || true; \
		docker rm locust-master || true; \
		echo "Locust UI available at http://localhost:8089"; \
		echo "Target: MySQL cartesian join test with tag 'mysql-cartesian' (heavy memory consumption)"; \
		docker run -d --name locust-master --network locust-network \
			-p 8089:8089 -p 5557:5557 -p 5558:5558 \
			-v $(PWD)/locust:/mnt/locust \
			-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
			-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
			-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
			-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
			-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
			-e MYSQL_CARTESIAN_LIMIT=$${LOCUST_MYSQL_CARTESIAN_LIMIT:-10000} \
			$${LOCUST_IMAGE} \
			-f /mnt/locust/bin/locustfile_mysql.py \
			--master \
			--master-bind-host=0.0.0.0 \
			--host mysql://$${LOCUST_MYSQL_HOST:-mysql-server}:$${LOCUST_MYSQL_PORT:-3306}/$${LOCUST_MYSQL_DATABASE:-information_schema} \
			--tags mysql-cartesian \
			MySQLUser; \
		sleep 5; \
		WORKER_COUNT=$${LOCUST_WORKERS:-1}; \
		echo "Starting $$WORKER_COUNT Locust workers..."; \
		for i in $$(seq 1 $$WORKER_COUNT); do \
			docker run -d --name locust-worker-$$i --network locust-network \
				-v $(PWD)/locust:/mnt/locust \
				-e MYSQL_HOST=$${LOCUST_MYSQL_HOST:-mysql-server} \
				-e MYSQL_PORT=$${LOCUST_MYSQL_PORT:-3306} \
				-e MYSQL_USER=$${LOCUST_MYSQL_USER:-testuser} \
				-e MYSQL_PASSWORD=$${LOCUST_MYSQL_PASSWORD:-testpassword} \
				-e MYSQL_DATABASE=$${LOCUST_MYSQL_DATABASE:-information_schema} \
				-e MYSQL_CARTESIAN_LIMIT=$${LOCUST_MYSQL_CARTESIAN_LIMIT:-10000} \
				$${LOCUST_IMAGE} \
				-f /mnt/locust/bin/locustfile_mysql.py \
				--worker \
				--master-host=locust-master; \
		done; \
		echo "MySQL cartesian join test started with $$WORKER_COUNT workers"; \
	fi

locust-join-cluster:
	@echo "Joining existing Locust cluster..."
	@if [ -z "$${LOCUST_MASTER_HOST}" ]; then \
		echo "Error: LOCUST_MASTER_HOST is required"; \
		echo "Usage: make locust:join-cluster LOCUST_MASTER_HOST=<master-ip> [LOCUST_WORKERS=n]"; \
		echo "After joining, run specific test commands like: make locust:test-http-login"; \
		exit 1; \
	fi
	@echo "Building Locust image if needed..."
	@docker build -t $${LOCUST_IMAGE:-locust-mysql:latest} locust/ || true
	@echo "$${LOCUST_MASTER_HOST}" > .locust_cluster_mode
	@echo "Cluster mode activated. Workers will connect to $${LOCUST_MASTER_HOST}"
	@echo "Ready to join cluster at $${LOCUST_MASTER_HOST}. Use specific test commands to start workers."
