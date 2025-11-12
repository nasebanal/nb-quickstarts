SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: kafka consul locust default

# Load environment variables from .env file if it exists
-include .env
export

#################### KAFKA MANAGEMENT ###################

kafka:
	@echo "🚀 Kafka Management Commands:"
	@echo ""
	@echo "  kafka:pull        - Pull Kafka Docker images"
	@echo "  kafka:run         - Start Kafka containers (KRaft mode)"
	@echo "  kafka:stop        - Stop and remove Kafka containers"
	@echo "  kafka:restart     - Restart Kafka containers"
	@echo "  kafka:status      - Check Kafka container status"
	@echo "  kafka:add-topics  - Create Kafka topics"
	@echo "  kafka:list-topics - List Kafka topics"
	@echo "  kafka:describe-topics - Describe Kafka topics"
	@echo "  kafka:add-events  - Produce events to Kafka topic"
	@echo "  kafka:get-all-events - Get all events from Kafka topic"
	@echo "  kafka:consume-events - Consume events from Kafka topic"
	@echo "  kafka:count-events - Count events in Kafka topic"
	@echo ""
	@echo "Usage: make kafka:run"

kafka\:%:
	@$(MAKE) kafka-$(subst kafka:,,$@)

#################### KAFKA ACTIONS ###################

kafka-pull:
	@echo "Pulling Kafka images..."
	@docker pull bitnami/kafka:4.1
	@echo "Kafka images pulled successfully."

kafka-run:
	@echo "Starting Kafka containers (KRaft mode)..."
	@docker run --name kafka -p 9092:9092 -p 9093:9093 \
		-e KAFKA_CFG_NODE_ID=0 \
		-e KAFKA_CFG_PROCESS_ROLES=controller,broker \
		-e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@localhost:9093 \
		-e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
		-e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
		-e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
		-e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
		-e KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT \
		-e ALLOW_PLAINTEXT_LISTENER=yes \
		bitnami/kafka:latest

	@echo "Kafka containers started."

kafka-stop:
	@echo "Stopping Kafka containers..."
	@docker stop kafka
	@docker rm kafka
	@echo "Kafka containers stopped and removed."

kafka-restart: kafka-stop kafka-run

kafka-status:
	@echo "Checking Kafka container status..."
	@docker ps -f "name=kafka"
	@echo "Kafka container status checked."

kafka-add-topics:
	@echo "Creating Kafka topics..."
	@docker exec kafka kafka-topics.sh --create --topic quickstart-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
	@echo "Kafka topics created."

kafka-list-topics:
	@echo "Listing Kafka topics..."
	@docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092
	@echo "Kafka topics listed."

kafka-describe-topics:
	@echo "Describing Kafka topics..."
	@docker exec kafka kafka-topics.sh --describe --topic quickstart-events --bootstrap-server localhost:9092
	@echo "Kafka topic described."

kafka-add-events:
	@echo "Producing events to Kafka topic..."
	@docker exec -i kafka kafka-console-producer.sh --topic quickstart-events --bootstrap-server localhost:9092
	@echo "Events produced to Kafka topic."

kafka-get-all-events:
	@echo "Getting all events from Kafka topic..."
	@docker exec kafka kafka-console-consumer.sh --topic quickstart-events --from-beginning --bootstrap-server localhost:9092 --timeout-ms 10000
	@echo "All events retrieved from Kafka topic."

kafka-consume-events:
	@echo "Consuming events from Kafka topic..."
	@docker exec kafka kafka-console-consumer.sh --topic quickstart-events --bootstrap-server localhost:9092 --group quickstart-group
	@echo "Events consumed from Kafka topic."

kafka-count-events:
	@echo "Counting events in Kafka topic..."
	@docker exec kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group quickstart-group
	@echo "Event count retrieved."

#################### CONSUL MANAGEMENT ###################

consul:
	@echo "🚀 Consul Management Commands:"
	@echo ""
	@echo "Container Management:"
	@echo "  consul:pull               - Pull Consul Docker image"
	@echo "  consul:run                - Start Consul container"
	@echo "  consul:stop               - Stop and remove Consul container"
	@echo "  consul:restart            - Restart Consul container"
	@echo "  consul:status             - Check Consul container status"
	@echo "  consul:open               - Open Consul UI in browser"
	@echo ""
	@echo "Service Registration:"
	@echo "  consul:register-service   - Register sample web service"
	@echo "  consul:register-db        - Register database service"
	@echo "  consul:deregister-service - Deregister web service"
	@echo "  consul:deregister-db      - Deregister database service"
	@echo ""
	@echo "Service Discovery:"
	@echo "  consul:get-services       - List all registered services"
	@echo "  consul:discover-web       - Discover web service endpoints (all)"
	@echo "  consul:discover-db        - Discover database service endpoints (all)"
	@echo "  consul:discover-healthy   - Discover only healthy service endpoints"
	@echo ""
	@echo "Usage: make consul:run"

consul\:%:
	@$(MAKE) consul-$(subst consul:,,$@)


#################### CONSUL ACTIONS ###################

consul-pull:
	@echo "Pulling Consul Docker image..."
	@docker pull hashicorp/consul:1.21
	@echo "Consul image pulled successfully."

consul-run:
	@echo "Starting Consul container..."
	@docker run --name consul -p 8500:8500 hashicorp/consul:1.21
	@echo "Consul container started."

consul-stop:
	@echo "Stopping Consul container..."
	@docker stop consul
	@docker rm consul
	@echo "Consul container stopped and removed."

consul-restart: consul-stop consul-run

consul-status:
	@echo "Checking Consul container status..."
	@docker ps -f "name=consul"
	@echo "Consul container status checked."

consul-open:
	@echo "Opening Consul UI..."
	@open http://localhost:8500
	@echo "Consul UI opened in browser."

consul-register-service:
	@echo "Registering sample service with Consul..."
	@curl -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "web-service-1", "Name": "web", "Tags": ["primary", "v1"], "Address": "127.0.0.1", "Port": 8080, "Check": {"HTTP": "http://127.0.0.1:8080/health", "Interval": "10s"}}'
	@echo ""
	@echo "Sample web service registered successfully."

consul-register-db:
	@echo "Registering database service with Consul..."
	@curl -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "db-service-1", "Name": "database", "Tags": ["postgresql", "primary"], "Address": "127.0.0.1", "Port": 5432, "Check": {"TCP": "127.0.0.1:5432", "Interval": "10s"}}'
	@echo ""
	@echo "Database service registered successfully."

consul-get-services:
	@echo "Getting all registered services..."
	@curl -s http://localhost:8500/v1/agent/services | jq '.'
	@echo ""

consul-discover-web:
	@echo "Discovering web service endpoints..."
	@curl -s "http://localhost:8500/v1/health/service/web" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags, HealthStatus: [.Checks[] | .Status] | unique}'
	@echo ""

consul-discover-db:
	@echo "Discovering database service endpoints..."
	@curl -s "http://localhost:8500/v1/health/service/database" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags, HealthStatus: [.Checks[] | .Status] | unique}'
	@echo ""

consul-discover-healthy:
	@echo "Discovering only healthy service endpoints..."
	@echo "Web services:"
	@curl -s "http://localhost:8500/v1/health/service/web?passing" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags}'
	@echo "Database services:"
	@curl -s "http://localhost:8500/v1/health/service/database?passing" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags}'
	@echo ""

consul-deregister-service:
	@echo "Deregistering web service..."
	@curl -X PUT http://localhost:8500/v1/agent/service/deregister/web-service-1
	@echo ""
	@echo "Web service deregistered."

consul-deregister-db:
	@echo "Deregistering database service..."
	@curl -X PUT http://localhost:8500/v1/agent/service/deregister/db-service-1
	@echo ""
	@echo "Database service deregistered."


#################### LOCUST MANAGEMENT ###################

locust:
	@echo "🚀 Locust Load Testing Commands:"
	@echo ""
	@echo "Container Management:"
	@echo "  locust:build       - Build custom Locust Docker image with MySQL support"
	@echo "  locust:pull        - Pull Locust Docker image"
	@echo "  locust:run         - Start Locust master and worker containers"
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

#################### DEFAULT HELP ###################
default:
	@echo "🚀 NASEBANAL Quick Start"
	@echo ""
	@echo "Hierarchical Commands:"
	@echo "  make kafka              - Show Kafka-related commands"
	@echo "  make consul             - Show Consul-related commands"
	@echo "  make locust             - Show Locust Load Testing commands"
	@echo	""
