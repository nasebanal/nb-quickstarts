#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### VITEST (apps/frontend unit tests) ###################
# Mocks `fetch`, so `make apps:up` is not required.

vitest:
	@echo "🚀 Vitest"
	@echo "Vitest - a Vite-native unit-testing framework for JavaScript/TypeScript. Here running apps/frontend's test suite."
	@echo ""
	@echo "Test Commands:"
	@echo "  vitest:test  - Build (if needed) and run apps/frontend unit tests"
	@echo ""
	@echo "Note: these are unit tests with fetch mocked out;"
	@echo "      apps:up is NOT required."
	@echo ""
	@echo "Report: vitest/report/index.html"

vitest\:%:
	@$(MAKE) vitest-$(subst vitest:,,$@)

#################### VITEST ACTIONS ###################

vitest-test:
	@docker compose -p vitest -f vitest/docker-compose.yml run --build --rm vitest
