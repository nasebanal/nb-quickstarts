SHELL := /bin/zsh
.DEFAULT_GOAL := default
.PHONY: apps pytest vitest playwright specmatic kong kafka locust keycloak vault zap agentgateway observability all default

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
include locust/Makefile
include zap/Makefile
include agentgateway/Makefile
include observability/Makefile

#################### ALL (every long-running module at once) ###################
# Deliberately excludes pytest/vitest/playwright/specmatic (one-shot `test`
# runs, no `up`/`down` concept). apps goes first (up) / last (down) since
# kong resolves its containers by name over apps-network.
# keycloak:up/vault:up alone do NOT make apps/backend trust them either -
# they need KEYCLOAK_ISSUER/VAULT_ADDR/VAULT_TOKEN set (or, for Vault,
# `make vault:verify-apps` to recreate backend with them) - same
# opt-in-integration shape.
# locust:up (which all:up calls) always starts in UI mode and does NOT run
# a load test on its own - use `make locust:load` separately (headless,
# LOCUST_RUN_TIME-bounded) to actually generate load against apps. It is
# deliberately not part of all:test either (see the rule above it).

all:
	@echo "🚀 All"
	@echo "Start/stop/test every long-running module together: apps, kong, kafka, keycloak, vault, locust, agentgateway, observability."
	@echo ""
	@echo "  all:up      - Start them all (apps first)"
	@echo "  all:down    - Stop them all (apps last)"
	@echo "  all:restart - all:down then all:up"
	@echo "  all:status  - Show container status for every module"
	@echo "  all:pull    - Pull every registry image and build every local image (pip/npm included), so everything runs afterwards without internet (air-gapped use)"
	@echo "  all:test    - Run pytest/vitest/playwright/specmatic in sequence (starts apps:up first; not locust/zap - see locust:load)"
	@echo "  all:report  - Open every existing test report in your browser"
	@echo "  all:report-upload - Upload the last pytest/playwright/specmatic/zap/locust run (whichever have a report) to NASEBANAL Assurance by running the nb CLI on your host (needs nb on PATH: npm i -g @nasebanal/cli; see .env: NB_TOKEN; a tool with no report yet is skipped)"
	@echo "              (NB_API_VERSION=v1 in .env labels the uploaded runs with an API version)"
	@echo "  all:reset   - Stop everything, wipe apps/kong/kafka/observability persistent state and every test tool's generated logs/reports (nothing is started afterwards)"

all\:%:
	@$(MAKE) all-$(subst all:,,$@)

all-up:
	@$(MAKE) apps-up
	@$(MAKE) kong-up
	@$(MAKE) kafka-up
	@$(MAKE) keycloak-up
	@$(MAKE) vault-up
	@$(MAKE) locust-up
	@$(MAKE) agentgateway-up
	@$(MAKE) observability-up

all-down:
	@$(MAKE) observability-down
	@$(MAKE) agentgateway-down
	@$(MAKE) locust-down
	@$(MAKE) vault-down
	@$(MAKE) keycloak-down
	@$(MAKE) kafka-down
	@$(MAKE) kong-down
	@$(MAKE) apps-down

all-restart:
	@$(MAKE) all-down
	@$(MAKE) all-up

# Project names match what each module's own Makefile uses (-p <name>; the
# modules without -p fall back to their directory name; locust is nb-locust).
# --profile '*' includes optional services (e.g. Kong's DB mode); build
# covers the local images (nb-backend, nb-frontend, nb-pytest, nb-vitest,
# kafka-bridge, locust-mysql, ...) whose Dockerfiles run pip/npm.
ALL_PULL_MODULES := apps kong kafka keycloak vault locust agentgateway observability pytest vitest playwright specmatic zap

all-pull:
	@for m in $(ALL_PULL_MODULES); do \
		p=$$m; [ $$m = locust ] && p=nb-locust; \
		echo "=== $$m: pull ==="; \
		docker compose -p $$p -f $$m/docker-compose.yml --profile '*' pull --ignore-buildable || exit 1; \
		echo "=== $$m: build ==="; \
		docker compose -p $$p -f $$m/docker-compose.yml --profile '*' build || exit 1; \
	done
	@echo "All images pulled and built. Disconnect now and the modules run offline."

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
	@echo "=== locust ==="
	@$(MAKE) locust-status
	@echo ""
	@echo "=== agentgateway ==="
	@$(MAKE) agentgateway-status
	@echo ""
	@echo "=== observability ==="
	@$(MAKE) observability-status

# Rule: every module whose verb is `test` runs here (pytest, vitest,
# playwright, specmatic); modules whose verbs are `load` (locust) or
# `scan`/`baseline` (zap) do not. locust and zap are deliberately not named
# `test`: locust:load is a sustained load run (every all:test would put real
# load on apps), zap:baseline alone takes longer than the rest combined, and
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

# Opens every report that's a plain, self-contained file straight away -
# pytest/specmatic/zap/locust (each module's own -report target explains why
# file:// is fine for these). vitest's and playwright's reports instead need
# a real local server each (see their own Makefiles' comments) and their
# show commands block in the foreground until Ctrl+C - two of those can't
# both run from one sequential recipe, so this points at running them
# separately rather than trying to background two dev servers unattended.
all-report:
	@echo "Opening every self-contained report that exists..."
	@-$(MAKE) pytest-report
	@-$(MAKE) specmatic-report
	@-$(MAKE) zap-report
	@-$(MAKE) locust-report
	@echo ""
	@echo "vitest and playwright reports need their own local server each -"
	@echo "run these separately (each opens your browser once ready):"
	@echo "  make vitest:report"
	@echo "  make playwright:report"

# Uploads the last run of every tool whose report exists (see bin/report_upload.sh): pytest, playwright and
# specmatic (what `all:test` runs and Assurance cares about - vitest, the frontend's unit tests run against
# mocks, is not uploaded), plus zap and locust (not part of all:test, as a scan or a load run is long). A tool
# that has not run yet has no report: it is skipped, not a failure, so one call after any mix of runs works. The
# others do not stop on one failure; the failures are reported at the end.
# One run key per call (commit + UTC time) so everything this call uploads is one Assurance run and every call is a
# new run: the trend gets a point per upload instead of one per commit per day (NB_RUN_KEY overrides it).
all-report-upload:
	@bin/ensure_nb_auth.sh || exit 1
	@key="$${NB_RUN_KEY:-local-$$(git rev-parse --short=7 HEAD 2>/dev/null || echo nocommit)-$$(date -u +%Y%m%d-%H%M%S)}"; \
	echo "Run key for this upload: $$key"; \
	has() { [ -n "$$(find "$$1" -name "$$2" 2>/dev/null | head -1)" ]; }; \
	failed=""; uploaded=0; \
	for t in pytest playwright specmatic zap locust; do \
		case $$t in \
			pytest) has pytest/report junit.xml ;; \
			playwright) has playwright/junit junit.xml ;; \
			specmatic) has specmatic/junit 'TEST-junit-jupiter.xml' ;; \
			zap) has zap/report '*-report.json' ;; \
			locust) has locust/logs '*_stats.csv' ;; \
		esac; \
		if [ $$? -ne 0 ]; then echo "- $$t: no report yet, skipped"; continue; fi; \
		NB_RUN_KEY="$$key" $(MAKE) $$t-report-upload && uploaded=$$((uploaded + 1)) || failed="$$failed $$t"; \
	done; \
	if [ -n "$$failed" ]; then echo "❌ Upload failed for:$$failed"; exit 1; fi; \
	echo "✅ Uploaded $$uploaded report(s)."

# apps/kong/kafka each have a named Docker volume worth wiping
# (apps_apps-db-data, kong_kong-db-data, kafka_kafka-data -
# see AGENTS.md "Anonymous volumes"/module bullets) and get their own `reset`. locust/
# keycloak/vault hold no persistent state at all (keycloak re-imports its
# fixed realm file, vault's dev server is in-memory only), so a plain
# `down` already leaves them as fresh as a "reset" would.
# The test tools (locust, pytest, vitest, playwright, specmatic, zap) hold no
# state either, but leave gitignored logs/reports on disk from past runs; each
# one's own `reset` deletes just those, so all:reset clears them too.
all-reset:
	@$(MAKE) all-down
	@$(MAKE) apps-reset
	@$(MAKE) kong-wipe
	@$(MAKE) kafka-wipe
	@$(MAKE) observability-wipe
	@$(MAKE) locust-reset
	@$(MAKE) pytest-reset
	@$(MAKE) vitest-reset
	@$(MAKE) playwright-reset
	@$(MAKE) specmatic-reset
	@$(MAKE) zap-reset
	@echo "All persistent state wiped and every service is stopped - run 'make all:up' for a fresh start."

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
	@echo "  locust       Show Locust Load Testing commands"
	@echo "  zap          Show OWASP ZAP (web vulnerability scanning) commands"
	@echo "  agentgateway Show agentgateway (MCP/A2A gateway) commands"
	@echo "  observability Show Observability (OpenTelemetry + Prometheus + Tempo + Grafana) commands"
	@echo "  all          Show commands that act on every module above at once"
	@echo ""
	@echo "Run 'make <command>' for more information on a command."
	@echo	""
