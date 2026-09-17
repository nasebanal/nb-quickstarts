#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### KAFKA MANAGEMENT ###################

kafka:
	@echo "🚀 Kafka"
	@echo "Apache Kafka - a distributed event streaming platform. Here running in KRaft mode (no ZooKeeper) for async event scenarios."
	@echo ""
	@echo "Container Management:"
	@echo "  kafka:up          - Start Kafka containers (KRaft mode)"
	@echo "  kafka:down        - Stop and remove Kafka containers, including kafka-bridge if running (topic data preserved)"
	@echo "  kafka:status      - Check Kafka container status"
	@echo "  kafka:restart     - Restart Kafka containers (topic data preserved)"
	@echo "  kafka:reset       - Restart AND wipe topic data (Docker volume: kafka_kafka-data)"
	@echo ""
	@echo "Kafka <-> REST Bridge (separate from kafka:up - opt in explicitly):"
	@echo "  kafka:bridge-up   - Build (if needed) and start kafka-bridge, forwarding topic events to a REST backend"
	@echo "  kafka:bridge-down - Stop and remove kafka-bridge"
	@echo ""
	@echo "Topic Management:"
	@echo "  kafka:add-topics      - Create Kafka topics"
	@echo "  kafka:list-topics     - List Kafka topics"
	@echo "  kafka:describe-topics - Describe Kafka topics"
	@echo ""
	@echo "Event Management:"
	@echo "  kafka:add-events     - Produce events to Kafka topic (interactive)"
	@echo "  kafka:get-all-events - Get all events from Kafka topic (from beginning)"
	@echo "  kafka:consume-events - Consume new events in real-time (Ctrl+C to exit)"
	@echo "  kafka:count-events   - Count total events in Kafka topic"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  KAFKA_IMAGE=apache/kafka"
	@echo "  KAFKA_VERSION=3.8.1"
	@echo "  KAFKA_PORT=9092"
	@echo "  KAFKA_TOPIC_NAME=quickstart-events"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Broker: localhost:$${KAFKA_PORT:-9092}"
	@echo ""
	@echo "Note: kafka-bridge forwards Kafka topic events to a REST backend"
	@echo "      (apps/backend by default - see KAFKA_BRIDGE_TARGET_URL) via POST"
	@echo "      /items. It retries forever if Kafka or the backend is unreachable,"
	@echo "      so it never crashes and never commits an offset for an event it"
	@echo "      couldn't deliver."

kafka\:%:
	@$(MAKE) kafka-$(subst kafka:,,$@)

#################### KAFKA ACTIONS ###################

kafka-up: apps-network-ensure
	@echo "Starting Kafka containers (KRaft mode)..."
	@docker-compose -f kafka/docker-compose.yml up -d kafka
	@echo ""
	@echo "Kafka started successfully!"
	@echo "  Broker:     localhost:${KAFKA_PORT:-9092}"
	@echo "  Controller: localhost:${KAFKA_CONTROLLER_PORT:-9093}"
	@echo ""
	@echo "Next steps:"
	@echo "  make kafka:list-topics    # List topics"
	@echo "  make kafka:add-topics     # Create sample topic"
	@echo "  make kafka:bridge-up      # Forward topic events into a REST backend"

kafka-bridge-up: apps-network-ensure
	@echo "Starting kafka-bridge (forwards topic events to $${KAFKA_BRIDGE_TARGET_URL:-http://backend:8080})..."
	@docker-compose -f kafka/docker-compose.yml up -d --build kafka-bridge
	@echo "kafka-bridge started. Follow it with: docker logs -f nb-kafka-bridge"

kafka-bridge-down:
	@echo "Stopping kafka-bridge..."
	@docker-compose -f kafka/docker-compose.yml rm -sf kafka-bridge
	@echo "kafka-bridge stopped and removed."

kafka-down:
	@echo "Stopping Kafka containers..."
	@docker-compose -f kafka/docker-compose.yml down
	@echo "Kafka containers stopped and removed. (Topic data preserved in the kafka_kafka-data Docker volume — use 'make kafka:reset' to wipe it.)"

kafka-status:
	@echo "Checking Kafka container status..."
	@docker-compose -f kafka/docker-compose.yml ps

kafka-restart:
	@$(MAKE) kafka-down
	@$(MAKE) kafka-up

kafka-reset:
	@echo "Resetting Kafka (wiping topic data - Docker volume: kafka_kafka-data)..."
	@docker-compose -f kafka/docker-compose.yml down --volumes
	@$(MAKE) kafka-up

kafka-add-topics:
	@echo "Creating Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@docker exec nb-kafka /opt/kafka/bin/kafka-topics.sh --create \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092 \
		--partitions $${KAFKA_TOPIC_PARTITIONS:-1} \
		--replication-factor $${KAFKA_TOPIC_REPLICATION_FACTOR:-1} \
		--if-not-exists
	@echo "Kafka topic created successfully."

kafka-list-topics:
	@echo "Listing Kafka topics..."
	@docker exec nb-kafka /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

kafka-describe-topics:
	@echo "Describing Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@docker exec nb-kafka /opt/kafka/bin/kafka-topics.sh --describe \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092

kafka-add-events:
	@echo "Producing events to Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@echo "Type your messages (one per line). Press Ctrl+C to exit."
	@docker exec -i nb-kafka /opt/kafka/bin/kafka-console-producer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092

kafka-get-all-events:
	@echo "Getting all events from Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@timeout 5 docker exec nb-kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--from-beginning \
		--bootstrap-server localhost:9092 \
		--partition 0 2>&1 || true

kafka-consume-events:
	@echo "Consuming new events from Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@echo "This will show only NEW messages. Use kafka:get-all-events to see all messages."
	@echo "Press Ctrl+C to exit."
	@docker exec nb-kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--bootstrap-server localhost:9092 \
		--partition 0

kafka-count-events:
	@echo "Counting events in Kafka topic: $${KAFKA_TOPIC_NAME:-quickstart-events}..."
	@count=$$(timeout 3 docker exec nb-kafka /opt/kafka/bin/kafka-console-consumer.sh \
		--topic $${KAFKA_TOPIC_NAME:-quickstart-events} \
		--from-beginning \
		--bootstrap-server localhost:9092 \
		--partition 0 2>/dev/null | wc -l); \
	echo "Total messages: $$count"
