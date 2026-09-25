SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: apps pytest vitest playwright specmatic microcks kong kafka locust keycloak vault zap agentgateway observability all default

# Load environment variables from .env file if it exists
-include .env
export

# Include service-specific Makefiles
include apps/Makefile
include kong/Makefile
include kafka/Makefile
include keycloak/Makefile
include vault/Makefile
include vitest/Makefile
include pytest/Makefile
include playwright/Makefile
include specmatic/Makefile
include microcks/Makefile
include locust/Makefile
include zap/Makefile
include agentgateway/Makefile
include observability/Makefile

#################### ALL (every long-running module at once) ###################
# Deliberately excludes pytest/vitest/playwright/specmatic (one-shot `test`
# runs, no `up`/`down` concept). apps goes first (up) / last (down) since
# kong/microcks resolve its containers by name over apps-network.
# keycloak:up/vault:up alone do NOT make apps/backend trust them either -
# they need KEYCLOAK_ISSUER/VAULT_ADDR/VAULT_TOKEN set (or, for Vault,
# `make vault:verify-apps` to recreate backend with them) - same
# opt-in-integration shape.
# locust:up (which all:up calls) always starts in UI mode and does NOT run
# a load test on its own - use `make locust:test` separately (headless,
# LOCUST_RUN_TIME-bounded) to actually generate load against apps.

all:
	@echo "🚀 All"
	@echo "Start/stop/test every long-running module together: apps, kong, kafka, keycloak, vault, microcks, locust, agentgateway, observability."
	@echo ""
	@echo "  all:up      - Start them all (apps first)"
	@echo "  all:down    - Stop them all (apps last)"
	@echo "  all:restart - all:down then all:up"
	@echo "  all:status  - Show container status for every module"
	@echo "  all:test    - Run pytest/vitest/playwright/specmatic in sequence (starts apps:up first)"
	@echo "  all:reset   - Wipe apps/kong/kafka/observability persistent state, restart the rest"

all\:%:
	@$(MAKE) all-$(subst all:,,$@)

all-up:
	@$(MAKE) apps-up
	@$(MAKE) kong-up
	@$(MAKE) kafka-up
	@$(MAKE) keycloak-up
	@$(MAKE) vault-up
	@$(MAKE) microcks-up
	@$(MAKE) locust-up
	@$(MAKE) agentgateway-up
	@$(MAKE) observability-up

all-down:
	@$(MAKE) observability-down
	@$(MAKE) agentgateway-down
	@$(MAKE) locust-down
	@$(MAKE) microcks-down
	@$(MAKE) vault-down
	@$(MAKE) keycloak-down
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
	@echo "=== keycloak ==="
	@$(MAKE) keycloak-status
	@echo ""
	@echo "=== vault ==="
	@$(MAKE) vault-status
	@echo ""
	@echo "=== microcks ==="
	@$(MAKE) microcks-status
	@echo ""
	@echo "=== locust ==="
	@$(MAKE) locust-status
	@echo ""
	@echo "=== agentgateway ==="
	@$(MAKE) agentgateway-status
	@echo ""
	@echo "=== observability ==="
	@$(MAKE) observability-status

# Runs the one-shot `test` modules (pytest/vitest/playwright/specmatic) in
# sequence - NOT microcks/locust, which aren't a `test` verb (see AGENTS.md
# "Test/verification tool modules"), and NOT zap, deliberately: zap:baseline
# alone takes noticeably longer than the four below combined, and
# zap:full-scan/zap:api-scan send real attack payloads - not something to
# run unattended as a side effect of `all:test`. Run those explicitly.
# playwright/specmatic need apps running, so this brings it up first; it
# does NOT tear apps down afterward, matching every other module's own test
# target.
all-test: apps-up
	@$(MAKE) pytest-test
	@$(MAKE) vitest-test
	@$(MAKE) playwright-test
	@$(MAKE) specmatic-test

# apps/kong/kafka each have a named Docker volume worth wiping
# (apps_apps-db-data, kong_kong-db-data, kafka_kafka-data -
# see AGENTS.md "Anonymous volumes"/module bullets) and get their own `reset`. microcks/locust/
# keycloak/vault hold no persistent state at all (keycloak re-imports its
# fixed realm file, vault's dev server is in-memory only), so a plain
# `restart` already leaves them as fresh as a "reset" would.
all-reset:
	@$(MAKE) apps-reset
	@$(MAKE) kong-reset
	@$(MAKE) kafka-reset
	@$(MAKE) observability-reset
	@$(MAKE) microcks-restart
	@$(MAKE) locust-restart
	@$(MAKE) keycloak-restart
	@$(MAKE) vault-restart

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
	@echo "  keycloak     Show Keycloak (OIDC identity provider) commands"
	@echo "  vault        Show Vault (secret storage) commands"
	@echo "  vitest       Show Vitest (apps/frontend unit tests) commands"
	@echo "  pytest       Show Pytest (apps/backend unit tests) commands"
	@echo "  playwright   Show Playwright (E2E) commands"
	@echo "  specmatic    Show Specmatic (contract test) commands"
	@echo "  microcks     Show Microcks (mock server) commands"
	@echo "  locust       Show Locust Load Testing commands"
	@echo "  zap          Show OWASP ZAP (web vulnerability scanning) commands"
	@echo "  agentgateway Show agentgateway (MCP/A2A gateway) commands"
	@echo "  observability Show Observability (OpenTelemetry + Prometheus + Tempo + Grafana) commands"
	@echo "  all          Show commands that act on every module above at once"
	@echo ""
	@echo "Run 'make <command>' for more information on a command."
	@echo	""
