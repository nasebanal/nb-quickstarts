#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### MICROCKS (mock server backed by apps/backend/openapi.json) ###################

microcks:
	@echo "🚀 Microcks Commands:"
	@echo ""
	@echo "  microcks:up             - Start the Microcks mock server"
	@echo "  microcks:down           - Stop and remove the Microcks container"
	@echo "  microcks:status         - Check Microcks container status"
	@echo "  microcks:restart        - Restart the Microcks container"
	@echo "  microcks:open           - Open the Microcks UI in browser"
	@echo "  microcks:import-openapi - Import apps/backend/openapi.json as a mock API"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  UI / mock API: http://localhost:$${MICROCKS_PORT:-9090}"
	@echo ""
	@echo "Usage:"
	@echo "  make apps:export-openapi   # make sure the schema is current"
	@echo "  make microcks:up"
	@echo "  make microcks:import-openapi"

microcks\:%:
	@$(MAKE) microcks-$(subst microcks:,,$@)

#################### MICROCKS ACTIONS ###################

microcks-up: apps-network-ensure
	@echo "Starting Microcks..."
	@docker compose -p microcks -f microcks/docker-compose.yml up -d
	@echo "Microcks started. UI: http://localhost:$${MICROCKS_PORT:-9090}"
	@echo "Run 'make microcks:import-openapi' to load apps/backend/openapi.json."

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
	@echo "Importing apps/backend/openapi.json into Microcks..."
	@curl -s -X POST "http://localhost:$${MICROCKS_PORT:-9090}/api/artifact/upload" \
		-F "file=@apps/backend/openapi.json;type=application/json" \
		-F "mainArtifact=true"
	@echo ""
	@echo "Imported. Open the UI to view the mocked API."
