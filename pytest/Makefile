#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### PYTEST (apps/backend unit tests) ###################
# Runs against an in-memory SQLite database (see apps/backend/tests/conftest.py),
# so `make apps:up` is not required.

pytest:
	@echo "🚀 Pytest"
	@echo "pytest - the de facto Python unit-testing framework. Here running apps/backend's test suite."
	@echo ""
	@echo "Test Commands:"
	@echo "  pytest:test  - Build (if needed) and run apps/backend unit tests"
	@echo ""
	@echo "Note: these are unit tests against an in-memory SQLite DB;"
	@echo "      apps:up is NOT required."
	@echo ""
	@echo "Report: pytest/report/report.html"

pytest\:%:
	@$(MAKE) pytest-$(subst pytest:,,$@)

#################### PYTEST ACTIONS ###################

pytest-test:
	@docker compose -p pytest -f pytest/docker-compose.yml run --build --rm pytest
