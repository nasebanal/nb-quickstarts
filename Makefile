SHELL := /bin/bash
.DEFAULT_GOAL := default
.PHONY: kafka default

#################### KAFKA MANAGEMENT ###################

kafka:
	@echo "🚀 Kafka Management Commands:"
	@echo ""
	@echo "  kafka:pull        - Pull Kafka Docker images"
	@echo "  kafka:run         - Start Kafka and Zookeeper containers"
	@echo "  kafka:stop        - Stop and remove Kafka and Zookeeper containers"
	@echo "  kafka:restart     - Restart Kafka containers"
	@echo "  kafka:topics:add  - Create Kafka topics"
	@echo "  kafka:topics:list - List Kafka topics"
	@echo ""
	@echo "Usage: make kafka:run"

kafka\:%:
	@$(MAKE) kafka-$(subst kafka:,,$@)

#################### KAFKA ACTIONS ###################

kafka-pull:
	@echo "Pulling Kafka images..."
	@docker pull bitnami/kafka:latest
	@docker pull bitnami/zookeeper:latest
	@echo "Kafka images pulled successfully."

kafka-run:
	@echo "Starting Kafka and Zookeeper containers..."
	@docker run -d --name zookeeper -p 2181:2181 bitnami/zookeeper:latest
# 	@docker run --name kafka -p 9092:9092 apache/kafka:4.1.0
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

	@echo "Kafka and Zookeeper containers started."

kafka-topics-add:
	@echo "Creating Kafka topics..."
	@docker exec kafka kafka-topics.sh --create --topic test-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
	@echo "Kafka topics created."

kafka-topics-list:
	@echo "Listing Kafka topics..."
	@docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092
	@echo "Kafka topics listed."

kafka-stop:
	@echo "Stopping Kafka and Zookeeper containers..."
	@docker stop kafka zookeeper
	@docker rm kafka zookeeper
	@echo "Kafka and Zookeeper containers stopped and removed."

kafka-restart: kafka-stop kafka-run

#################### DEFAULT HELP ###################
default:
	@echo "🚀 Quick Start"
	@echo ""
	@echo "Hierarchical Commands:"
	@echo "  make kafka              - Show Kafka-related commands"
	@echo "  make kafka:pull         - Pull Kafka Docker images"
	@echo "  make kafka:run          - Start Kafka and Zookeeper containers"
	@echo "  make kafka:stop         - Stop and remove Kafka and Zookeeper containers"
	@echo "  make kafka:restart      - Restart Kafka containers"
	@echo "  make kafka:topics:add   - Create Kafka topics"
	@echo "  make kafka:topics:list  - List Kafka topics"
	@echo ""
	@echo "Recommended: Run 'make kafka' to see Kafka-related commands"