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
	@echo "  specmatic:mock-up   - Start a mock server built from the same contract + examples"
	@echo "  specmatic:mock-down - Stop and remove it"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  SPECMATIC_MOCK_PORT=9091 # Mock server port"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Mock server: http://localhost:$${SPECMATIC_MOCK_PORT:-9091}"
	@echo ""
	@echo "Note: both require apps to be running first - make apps:up."
	@echo ""
	@echo "Report: specmatic/report/test/html/index.html (also specmatic/junit/TEST-junit-jupiter.xml)"

specmatic\:%:
	@$(MAKE) specmatic-$(subst specmatic:,,$@)

#################### SPECMATIC ACTIONS ###################

specmatic-test: apps-network-ensure
	@docker compose -p specmatic -f specmatic/docker-compose.yml run --rm specmatic

specmatic-mock-up: apps-network-ensure
	@echo "Starting Specmatic mock (mock server built from apps/backend/openapi.yaml + examples)..."
	@docker compose -p specmatic -f specmatic/docker-compose.yml up -d --build specmatic-mock
	@echo "Mock server: http://localhost:$${SPECMATIC_MOCK_PORT:-9091}"

specmatic-mock-down:
	@echo "Stopping Specmatic mock..."
	@docker compose -p specmatic -f specmatic/docker-compose.yml rm -f -s specmatic-mock
	@echo "Specmatic mock stopped and removed."
