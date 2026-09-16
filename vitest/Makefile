#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### VITEST (apps/frontend unit tests) ###################
# Mocks `fetch`, so `make apps:up` is not required.

vitest:
	@echo "🚀 Vitest Commands:"
	@echo ""
	@echo "  vitest:build - Build the test image (apps/frontend + devDependencies)"
	@echo "  vitest:test  - Run apps/frontend unit tests"
	@echo ""
	@echo "Note: these are unit tests with fetch mocked out;"
	@echo "      apps:up is NOT required."
	@echo ""
	@echo "Report: vitest/report/index.html"

vitest\:%:
	@$(MAKE) vitest-$(subst vitest:,,$@)

#################### VITEST ACTIONS ###################

vitest-build:
	@docker compose -p vitest -f vitest/docker-compose.yml build

vitest-test:
	@docker compose -p vitest -f vitest/docker-compose.yml run --rm vitest
