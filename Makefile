SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: apps pytest vitest playwright specmatic microcks kong kafka locust consul all default

# Load environment variables from .env file if it exists
-include .env
export

# Include service-specific Makefiles
include apps/Makefile
include pytest/Makefile
include vitest/Makefile
include playwright/Makefile
include specmatic/Makefile
include microcks/Makefile
include kong/Makefile
include kafka/Makefile
include locust/Makefile
include consul/Makefile

#################### ALL (every long-running module at once) ###################
# Deliberately excludes pytest/vitest/playwright/specmatic (one-shot `test`
# runs, no `up`/`down` concept). apps goes first (up) / last (down) since
# kong/consul/microcks resolve its containers by name over apps-network.
# consul:up alone does NOT register apps-backend/frontend/mysql with it -
# run `make consul:register-apps` separately, same as any other module.
# locust:up starts the master/worker containers and, with the default
# empty LOCUST_HEADLESS_FLAG, just waits at the UI - it does NOT run a load
# test on its own. If .env sets LOCUST_HEADLESS_FLAG=--headless, though,
# `all:up` DOES kick off a real (LOCUST_RUN_TIME-bounded) load test against
# apps immediately.

all\:%:
	@$(MAKE) all-$(subst all:,,$@)

all-up:
	@$(MAKE) apps-up
	@$(MAKE) kong-up
	@$(MAKE) kafka-up
	@$(MAKE) consul-up
	@$(MAKE) microcks-up
	@$(MAKE) locust-up

all-down:
	@$(MAKE) locust-down
	@$(MAKE) microcks-down
	@$(MAKE) consul-down
	@$(MAKE) kafka-down
	@$(MAKE) kong-down
	@$(MAKE) apps-down

#################### DEFAULT HELP ###################
default:
	@echo "🚀 NASEBANAL Quick Start"
	@echo ""
	@echo "Hierarchical Commands:"
	@echo "  make apps               - Show Apps (test target) commands"
	@echo "  make pytest             - Show Pytest (apps/backend unit tests) commands"
	@echo "  make vitest             - Show Vitest (apps/frontend unit tests) commands"
	@echo "  make playwright         - Show Playwright (E2E) commands"
	@echo "  make specmatic          - Show Specmatic (contract test) commands"
	@echo "  make microcks           - Show Microcks (mock server) commands"
	@echo "  make kong               - Show Kong API Gateway commands"
	@echo "  make kafka              - Show Kafka-related commands"
	@echo "  make locust             - Show Locust Load Testing commands"
	@echo "  make consul             - Show Consul-related commands"
	@echo ""
	@echo "  make all:up              - Start apps/kong/kafka/consul/microcks/locust together"
	@echo "  make all:down            - Stop all of the above"
	@echo	""
