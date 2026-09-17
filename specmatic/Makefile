#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### SPECMATIC (contract test against the running backend) ###################

specmatic:
	@echo "🚀 Specmatic"
	@echo "Specmatic - OpenAPI-driven contract testing. Here testing the running backend against its own live OpenAPI schema."
	@echo ""
	@echo "Test Commands:"
	@echo "  specmatic:test - Contract-test the running backend against its live /openapi.json"
	@echo ""
	@echo "Note: requires apps to be running first - make apps:up."
	@echo ""
	@echo "Report: specmatic/report/html/index.html (also specmatic/junit/TEST-junit-jupiter.xml)"

specmatic\:%:
	@$(MAKE) specmatic-$(subst specmatic:,,$@)

#################### SPECMATIC ACTIONS ###################

specmatic-test: apps-network-ensure
	@docker compose -p specmatic -f specmatic/docker-compose.yml run --rm specmatic
