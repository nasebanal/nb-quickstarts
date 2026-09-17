#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### SPECMATIC (contract test against the running backend) ###################

specmatic:
	@echo "🚀 Specmatic"
	@echo "Specmatic - OpenAPI-driven contract testing. Here testing the running backend against its own live OpenAPI schema, and mocking that same contract for consumer-side testing."
	@echo ""
	@echo "Test Commands (Provider - does the backend honor its own contract?):"
	@echo "  specmatic:test - Contract-test the running backend against its live /openapi.json"
	@echo ""
	@echo "Container Management (Consumer - mock the contract for apps/frontend to test against):"
	@echo "  specmatic:stub-up   - Start a mock server built from the same contract + examples"
	@echo "  specmatic:stub-down - Stop and remove it"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  SPECMATIC_STUB_PORT=9091 # Mock server port"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Mock server: http://localhost:$${SPECMATIC_STUB_PORT:-9091}"
	@echo ""
	@echo "Note: both require apps to be running first - make apps:up."
	@echo ""
	@echo "Report: specmatic/report/html/index.html (also specmatic/junit/TEST-junit-jupiter.xml)"

specmatic\:%:
	@$(MAKE) specmatic-$(subst specmatic:,,$@)

#################### SPECMATIC ACTIONS ###################

specmatic-test: apps-network-ensure
	@docker compose -p specmatic -f specmatic/docker-compose.yml run --rm specmatic

specmatic-stub-up: apps-network-ensure
	@echo "Starting Specmatic stub (mock server built from apps/backend/openapi.yaml + examples)..."
	@docker compose -p specmatic -f specmatic/docker-compose.yml up -d --build specmatic-stub
	@echo "Mock server: http://localhost:$${SPECMATIC_STUB_PORT:-9091}"

specmatic-stub-down:
	@echo "Stopping Specmatic stub..."
	@docker compose -p specmatic -f specmatic/docker-compose.yml rm -f -s specmatic-stub
	@echo "Specmatic stub stopped and removed."
