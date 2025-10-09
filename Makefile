SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: kafka default

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


#################### SIMPLE HTTP SERVER MANAGEMENT ###################

http:
	@echo "🚀 Simple HTTP Server Commands:"
	@echo ""
	@echo "  http:run  - Start a simple HTTP server on port 8080"
	@echo "  http:stop - Stop the simple HTTP server"
	@echo "  http:status - Check if the simple HTTP server is running"
	@echo "  http:restart - Restart the simple HTTP server"
	@echo ""
	@echo "Usage: make http:start"

http\:%:
	@$(MAKE) http-$(subst http:,,$@)

##################### SIMPLE HTTP SERVER ACTIONS ###################

http-run:
	@echo "Starting HTTP server in Docker container on port 8080..."
	@docker run -d --name http-server -p 8080:8080 -v $(PWD)/http:/app -w /app/www python:3.12-slim python3 ../bin/server.py
	@echo "HTTP server started. Access at http://localhost:8080"

http-stop:
	@echo "Stopping HTTP server container..."
	@docker stop http-server || true
	@docker rm http-server || true
	@echo "HTTP server stopped."

http-status:
	@echo "Checking HTTP server container status..."
	@docker ps -f "name=http-server"

http-restart: http-stop http-run


#################### LOCUST MANAGEMENT ###################

locust:
	@echo "🚀 Locust Load Testing Commands:"
	@echo ""
	@echo "  locust:pull        - Pull Locust Docker image"
	@echo "  locust:run         - Start Locust master and worker containers"
	@echo "  locust:stop        - Stop and remove Locust containers"
	@echo "  locust:restart     - Restart Locust containers"
	@echo "  locust:status      - Check Locust container status"
	@echo ""
	@echo "Usage: make locust:run"

locust\:%:
	@$(MAKE) locust-$(subst locust:,,$@)

#################### LOCUST ACTIONS ###################

locust-pull:
	@echo "Pulling Locust Docker image..."
	@docker pull locustio/locust:latest
	@echo "Locust image pulled successfully."

locust-run:
	@echo "Starting HTTP server and Locust containers..."
	@docker network create locust-network || true
	@docker run -d --name http-server --network locust-network -p 8080:8080 -v $(PWD)/locust:/app -w /app/www python:3.12-slim python3 ../bin/server.py
	@echo "HTTP server started on port 8080"
	@docker run -d --name locust-master --network locust-network -p 8089:8089 -v $(PWD)/locust:/mnt/locust locustio/locust:latest -f /mnt/locust/bin/locustfile.py --master --host=http://http-server:8080
	@sleep 5
	@docker run -d --name locust-worker --network locust-network -v $(PWD)/locust:/mnt/locust locustio/locust:latest -f /mnt/locust/bin/locustfile.py --worker --master-host=locust-master
	@echo "Locust containers started. Access Locust UI at http://localhost:8089 and HTTP server at http://localhost:8080"

locust-stop:
	@echo "Stopping HTTP server and Locust containers..."
	@docker stop http-server locust-master locust-worker || true
	@docker rm http-server locust-master locust-worker || true
	@docker network rm locust-network || true
	@echo "All containers stopped and removed."

locust-restart: locust-stop locust-run

locust-status:
	@echo "Checking Locust container status..."
	@docker ps -f "name=locust-master"
	@docker ps -f "name=locust-worker"
	@echo "Locust container status checked."

#################### DEFAULT HELP ###################
default:
	@echo "🚀 NASEBANAL Quick Start"
	@echo ""
	@echo "Hierarchical Commands:"
	@echo "  make kafka              - Show Kafka-related commands"
	@echo "  make consul             - Show Consul-related commands"
	@echo "  make http               - Show Simple HTTP Server commands"
	@echo "  make locust             - Show Locust Load Testing commands"
	@echo	""
