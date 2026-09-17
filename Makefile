SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: apps pytest vitest playwright specmatic microcks kong kafka locust consul all default

# Load environment variables from .env file if it exists
-include .env
export

# Include service-specific Makefiles
include apps/Makefile
include kong/Makefile
include kafka/Makefile
include consul/Makefile
include vitest/Makefile
include pytest/Makefile
include playwright/Makefile
include specmatic/Makefile
include microcks/Makefile
include locust/Makefile

#################### ALL (every long-running module at once) ###################
# Deliberately excludes pytest/vitest/playwright/specmatic (one-shot `test`
# runs, no `up`/`down` concept). apps goes first (up) / last (down) since
# kong/consul/microcks resolve its containers by name over apps-network.
# consul:up alone does NOT register apps-backend/mysql with it -
# run `make consul:register-apps` separately, same as any other module.
# locust:up (which all:up calls) always starts in UI mode and does NOT run
# a load test on its own - use `make locust:test` separately (headless,
# LOCUST_RUN_TIME-bounded) to actually generate load against apps.

all:
	@echo "🚀 All"
	@echo "Start/stop/test every long-running module together: apps, kong, kafka, consul, microcks, locust."
	@echo ""
	@echo "  all:up      - Start them all (apps first)"
	@echo "  all:down    - Stop them all (apps last)"
	@echo "  all:restart - all:down then all:up"
	@echo "  all:status  - Show container status for every module"
	@echo "  all:test    - Run pytest/vitest/playwright/specmatic in sequence (starts apps:up first)"
	@echo "  all:reset   - Wipe apps/kong/kafka/consul persistent state, restart the rest"

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

all-restart:
	@$(MAKE) all-down
	@$(MAKE) all-up

all-status:
	@echo "=== apps ==="
	@$(MAKE) apps-status
	@echo ""
	@echo "=== kong ==="
	@$(MAKE) kong-status
	@echo ""
	@echo "=== kafka ==="
	@$(MAKE) kafka-status
	@echo ""
	@echo "=== consul ==="
	@$(MAKE) consul-status
	@echo ""
	@echo "=== microcks ==="
	@$(MAKE) microcks-status
	@echo ""
	@echo "=== locust ==="
	@$(MAKE) locust-status

# Runs the one-shot `test` modules (pytest/vitest/playwright/specmatic) in
# sequence - NOT microcks/locust, which aren't a `test` verb (see AGENTS.md
# "Test/verification tool modules"). playwright/specmatic need apps
# running, so this brings it up first; it does NOT tear apps down
# afterward, matching every other module's own test target.
all-test: apps-up
	@$(MAKE) pytest-test
	@$(MAKE) vitest-test
	@$(MAKE) playwright-test
	@$(MAKE) specmatic-test

# apps/kong/kafka/consul each have a named Docker volume worth wiping
# (apps_apps-db-data, kong_kong-db-data, kafka_kafka-data,
# consul_consul-data + consul_consul-config - see AGENTS.md "Anonymous
# volumes"/module bullets) and get their own `reset`. microcks/locust hold
# no persistent state at all, so a plain `restart` already leaves them as
# fresh as a "reset" would.
all-reset:
	@$(MAKE) apps-reset
	@$(MAKE) kong-reset
	@$(MAKE) kafka-reset
	@$(MAKE) consul-reset
	@$(MAKE) microcks-restart
	@$(MAKE) locust-restart

#################### DEFAULT HELP ###################
default:
	@echo "Usage: make <command>"
	@echo ""
	@echo "🚀 NASEBANAL Quick Start - verification toolkit for the NASEBANAL Stack."
	@echo ""
	@echo "Commands:"
	@echo "  apps         Show Apps (test target) commands"
	@echo "  kong         Show Kong API Gateway commands"
	@echo "  kafka        Show Kafka-related commands"
	@echo "  consul       Show Consul-related commands"
	@echo "  vitest       Show Vitest (apps/frontend unit tests) commands"
	@echo "  pytest       Show Pytest (apps/backend unit tests) commands"
	@echo "  playwright   Show Playwright (E2E) commands"
	@echo "  specmatic    Show Specmatic (contract test) commands"
	@echo "  microcks     Show Microcks (mock server) commands"
	@echo "  locust       Show Locust Load Testing commands"
	@echo "  all          Show commands that act on every module above at once"
	@echo ""
	@echo "Run 'make <command>' for more information on a command."
	@echo	""
