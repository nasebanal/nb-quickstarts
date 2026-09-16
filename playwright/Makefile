#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### PLAYWRIGHT (E2E against the running apps frontend) ###################

playwright:
	@echo "🚀 Playwright"
	@echo "Playwright - cross-browser E2E test automation. Here testing the running apps frontend."
	@echo ""
	@echo "Test Commands:"
	@echo "  playwright:test - Run E2E browser tests against the running apps frontend"
	@echo ""
	@echo "Requires apps to be running first: make apps:up"
	@echo ""
	@echo "Report: playwright/report/index.html"

playwright\:%:
	@$(MAKE) playwright-$(subst playwright:,,$@)

#################### PLAYWRIGHT ACTIONS ###################

playwright-test: apps-network-ensure
	@docker compose -p playwright -f playwright/docker-compose.yml run --rm playwright
