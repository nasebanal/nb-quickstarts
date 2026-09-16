#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### SPECMATIC (contract test against the running backend) ###################

specmatic:
	@echo "🚀 Specmatic Commands:"
	@echo ""
	@echo "  specmatic:test - Contract-test the running backend against apps/backend/openapi.json"
	@echo ""
	@echo "Requires apps to be running first: make apps:up"
	@echo ""
	@echo "Report: specmatic/report/html/index.html (also specmatic/junit/TEST-junit-jupiter.xml)"

specmatic\:%:
	@$(MAKE) specmatic-$(subst specmatic:,,$@)

#################### SPECMATIC ACTIONS ###################

specmatic-test: apps-network-ensure
	@docker compose -p specmatic -f specmatic/docker-compose.yml run --rm specmatic
