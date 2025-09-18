SHELL := /bin/bash
.DEFAULT_GOAL := default
#################### PACKAGE ACTIONS ###################
pull-kafka:
	@echo "Pulling Kafka images..."
	@docker pull bitnami/kafka:latest
	@docker pull bitnami/zookeeper:latest
	@echo "Kafka images pulled successfully."

run-kafka:
	@echo "Starting Kafka and Zookeeper containers..."
	@docker run -d --name zookeeper -p 2181:2181 bitnami/zookeeper:latest
# 	@docker run -d --name kafka -p 9092:9092 --env KAFKA_BROKER_ID=1 --env KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 --env KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 --env KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 bitnami/kafka:latest
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

add-kafka-topics:
	@echo "Creating Kafka topics..."
	@docker exec kafka kafka-topics.sh --create --topic test-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
	@echo "Kafka topics created."

get-kafka-topics:
	@echo "Listing Kafka topics..."
	@docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092
	@echo "Kafka topics listed."

stop-kafka:
	@echo "Stopping Kafka and Zookeeper containers..."
	@docker stop kafka zookeeper
	@docker rm kafka zookeeper
	@echo "Kafka and Zookeeper containers stopped and removed."

restart-kafka: stop-kafka run-kafka
	
default:
	@echo "Usage: make <command>"
	@echo "Example: make pull-kafka"
	@echo "         make run-kafka"
	@echo "         make add-kafka-topics"
	@echo "         make stop-kafka"
	@echo ""
	@echo "Available commands:"
	@echo "  make pull-kafka - Pull Kafka Docker images"
	@echo "  make run-kafka - Start Kafka and Zookeeper containers"
	@echo "  make stop-kafka - Stop and remove Kafka and Zookeeper containers"
	@echo "  make add-kafka-topics - Create Kafka topics"
	@echo "Replace <command> with one of the available commands."