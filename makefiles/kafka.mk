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
