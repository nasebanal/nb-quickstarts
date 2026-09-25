#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### MICROCKS (mock server + conformance test backed by apps/backend's live OpenAPI schema) ###################

microcks:
	@echo "🚀 Microcks"
	@echo "Microcks - open-source API mocking and testing. Here serving mocks imported from the running backend's live OpenAPI schema, and testing the real backend against that same contract."
	@echo ""
	@echo "Test Commands (Provider - does the backend honor its own contract?):"
	@echo "  microcks:test           - Import the contract, then run Microcks's conformance test (OPEN_API_SCHEMA) against the running backend (needs apps:up + microcks:up)"
	@echo ""
	@echo "Container Management:"
	@echo "  microcks:up             - Start the Microcks mock server"
	@echo "  microcks:down           - Stop and remove the Microcks container"
	@echo "  microcks:status         - Check Microcks container status"
	@echo "  microcks:restart        - Restart the Microcks container"
	@echo "  microcks:open           - Open the Microcks UI in browser"
	@echo "  microcks:import-openapi - Fetch the backend's live OpenAPI schema and import it as a mock API (needs apps:up)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  MICROCKS_PORT=9090 # UI / mock API port"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  UI / mock API: http://localhost:$${MICROCKS_PORT:-9090}"
	@echo ""
	@echo "Report: microcks/report/latest.json (also the run's page in the Microcks UI)"

microcks\:%:
	@$(MAKE) microcks-$(subst microcks:,,$@)

#################### MICROCKS ACTIONS ###################

microcks-up: apps-network-ensure
	@echo "Starting Microcks..."
	@docker compose -p microcks -f microcks/docker-compose.yml up -d
	@echo "Microcks started. UI: http://localhost:$${MICROCKS_PORT:-9090}"
	@echo "Run 'make microcks:import-openapi' to load the backend's live OpenAPI schema (needs apps:up)."

microcks-down:
	@echo "Stopping Microcks..."
	@docker compose -p microcks -f microcks/docker-compose.yml down --remove-orphans
	@echo "Microcks stopped and removed."

microcks-status:
	@echo "Checking Microcks container status..."
	@docker compose -p microcks -f microcks/docker-compose.yml ps

microcks-restart:
	@$(MAKE) microcks-down
	@$(MAKE) microcks-up

microcks-open:
	@bin/open_browser.sh http://localhost:$${MICROCKS_PORT:-9090}

microcks-import-openapi:
	@echo "Fetching the live schema from the backend (needs apps:up) and importing it into Microcks..."
	@curl -sf http://localhost:8080/openapi.json -o /tmp/nb-quickstarts-openapi.json
	@curl -s -X POST "http://localhost:$${MICROCKS_PORT:-9090}/api/artifact/upload" \
		-F "file=@/tmp/nb-quickstarts-openapi.json;type=application/json" \
		-F "mainArtifact=true"
	@rm -f /tmp/nb-quickstarts-openapi.json
	@echo ""
	@echo "Imported. Open the UI to view the mocked API. (Once imported, Microcks serves it independently - apps doesn't need to stay up.)"

# Imports first so the test always runs against the contract the backend
# serves right now; Microcks pairs request/response examples by key, so what
# it tests is exactly the examples in apps/backend/openapi.yaml.
microcks-test: microcks-import-openapi
	@sh microcks/bin/run_test.sh
