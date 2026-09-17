#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### VITEST (apps/frontend unit tests) ###################
# vitest:test mocks `fetch`, so `make apps:up` is not required.
# vitest:contract-test is different - see below.

vitest:
	@echo "🚀 Vitest"
	@echo "Vitest - a Vite-native unit-testing framework for JavaScript/TypeScript. Here running apps/frontend's test suite."
	@echo ""
	@echo "Test Commands:"
	@echo "  vitest:test          - Build (if needed) and run apps/frontend unit tests"
	@echo "  vitest:contract-test - Run apps/frontend's src/lib/contract/ suite against a"
	@echo "                         Specmatic stub instead of a mocked fetch - a Consumer-"
	@echo "                         side contract test (does the frontend's own API usage"
	@echo "                         hold up against apps/backend/openapi.yaml, independent"
	@echo "                         of the real backend's current behavior?)"
	@echo ""
	@echo "Note: vitest:test mocks fetch entirely; apps:up is NOT required."
	@echo "      vitest:contract-test instead needs a running stub -"
	@echo "      make apps:up && make specmatic:stub-up first."
	@echo ""
	@echo "Report: vitest/report/index.html (vitest:test),"
	@echo "        vitest/report-contract/index.html (vitest:contract-test)"

vitest\:%:
	@$(MAKE) vitest-$(subst vitest:,,$@)

#################### VITEST ACTIONS ###################

vitest-test:
	@docker compose -p vitest -f vitest/docker-compose.yml run --build --rm vitest

vitest-contract-test: apps-network-ensure
	@docker compose -p vitest -f vitest/docker-compose.yml run --build --rm vitest-contract
