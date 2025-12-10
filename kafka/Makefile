#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

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
	@echo "  kafka:add-events  - Produce events to Kafka topic (interactive)"
	@echo "  kafka:get-all-events - Get all events from Kafka topic (from beginning)"
	@echo "  kafka:consume-events - Consume new events in real-time (Ctrl+C to exit)"
	@echo "  kafka:count-events - Count total events in Kafka topic"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  KAFKA_IMAGE=apache/kafka"
	@echo "  KAFKA_VERSION=3.8.1"
	@echo "  KAFKA_PORT=9092"
	@echo "  KAFKA_TOPIC_NAME=quickstart-events"
	@echo ""
	@echo "Usage: make kafka:run"

kafka\:%:
	@$(MAKE) kafka-$(subst kafka:,,$@)

#################### KAFKA ACTIONS ###################

kafka-pull:
	@echo "Pulling Kafka images..."
	@docker pull $${KAFKA_IMAGE:-apache/kafka}:$${KAFKA_VERSION:-3.8.1}
	@echo "Kafka images pulled successfully."

kafka-run:
	@echo "Starting Kafka containers (KRaft mode)..."
	@docker-compose -f kafka/docker-compose.yml up -d
	@echo ""
	@echo "Kafka started successfully!"
	@echo "  Broker:     localhost:${KAFKA_PORT:-9092}"
	@echo "  Controller: localhost:${KAFKA_CONTROLLER_PORT:-9093}"
	@echo ""
	@echo "Next steps:"
	@echo "  make kafka:list-topics    # List topics"
	@echo "  make kafka:add-topics     # Create sample topic"

kafka-stop:
	@echo "Stopping Kafka containers..."
	@docker-compose -f kafka/docker-compose.yml down
	@echo "Kafka containers stopped and removed."

kafka-restart:
	@$(MAKE) kafka-stop
	@$(MAKE) kafka-run

kafka-status:
	@echo "Checking Kafka container status..."
	@docker-compose -f kafka/docker-compose.yml ps

kafka-add-topics:
	@echo "Creating Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@docker exec kafka /opt/kafka/bin/kafka-topics.sh --create \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092 \
		--partitions $${KAFKA_TOPIC_PARTITIONS:-1} \
		--replication-factor $${KAFKA_TOPIC_REPLICATION_FACTOR:-1} \
		--if-not-exists
	@echo "Kafka topic created successfully."

kafka-list-topics:
	@echo "Listing Kafka topics..."
	@docker exec kafka /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

kafka-describe-topics:
	@echo "Describing Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@docker exec kafka /opt/kafka/bin/kafka-topics.sh --describe \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092

kafka-add-events:
	@echo "Producing events to Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@echo "Type your messages (one per line). Press Ctrl+C to exit."
	@docker exec -i kafka /opt/kafka/bin/kafka-console-producer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092

kafka-get-all-events:
	@echo "Getting all events from Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@timeout 5 docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--from-beginning \
		--bootstrap-server localhost:9092 \
		--partition 0 2>&1 || true

kafka-consume-events:
	@echo "Consuming new events from Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@echo "This will show only NEW messages. Use kafka:get-all-events to see all messages."
	@echo "Press Ctrl+C to exit."
	@docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092 \
		--partition 0

kafka-count-events:
	@echo "Counting events in Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@count=$$(timeout 3 docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--from-beginning \
		--bootstrap-server localhost:9092 \
		--partition 0 2>/dev/null | wc -l); \
	echo "Total messages: $$count"
