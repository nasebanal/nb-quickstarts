SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: kafka consul kong locust default

# Load environment variables from .env file if it exists
-include .env
export

# Include service-specific Makefiles
include makefiles/kafka.mk
include makefiles/kong.mk
include makefiles/consul.mk
include makefiles/locust.mk

#################### DEFAULT HELP ###################
default:
	@echo "🚀 NASEBANAL Quick Start"
	@echo ""
	@echo "Hierarchical Commands:"
	@echo "  make kafka              - Show Kafka-related commands"
	@echo "  make consul             - Show Consul-related commands"
	@echo "  make kong               - Show Kong API Gateway commands"
	@echo "  make locust             - Show Locust Load Testing commands"
	@echo	""
