#################### KONG MANAGEMENT ###################

kong:
	@echo "🚀 Kong Management Commands:"
	@echo ""
	@echo "  kong:pull            - Pull Kong Docker image"
	@echo "  kong:run             - Start Kong (mode: KONG_DB env variable)"
	@echo "  kong:stop            - Stop and remove Kong containers"
	@echo "  kong:restart         - Restart Kong containers"
	@echo "  kong:status          - Check Kong container status"
	@echo "  kong:open            - Open Kong Manager in browser"
	@echo "  kong:list            - List all services and routes"
	@echo "  kong:reset           - Reset configuration (reload declarative.yml)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  KONG_DB=off       - DB-less mode (uses kong/conf/declarative.yml)"
	@echo "  KONG_DB=postgres  - Database mode (uses PostgreSQL)"
	@echo ""
	@echo "Usage:"
	@echo "  make kong:run                  # Use mode from .env (default: off)"
	@echo "  make kong:run KONG_DB=postgres # Override to use database mode"
	@echo ""
	@echo "Test endpoints:"
	@echo "  curl http://localhost:8000/mock"
	@echo "  curl http://localhost:8000/echo/get"

export KONG_DB

kong\:%:
	@$(MAKE) kong-$(subst kong:,,$@)

#################### KONG ACTIONS ###################

kong-pull:
	@echo "Pulling Kong Docker image..."
	@docker pull kong:${KONG_VERSION:-3.6}
	@echo "Kong image pulled successfully."

kong-run:
	@echo "Checking Python dependencies..."
	@if ! python3 -c "import yaml" 2>/dev/null; then \
		echo "Required Python package 'PyYAML' is not installed."; \
		echo "This is needed for kong:reset-config with KONG_DB=postgres."; \
		read -p "Install now? [y/N]: " answer; \
		if [ "$$answer" = "y" ] || [ "$$answer" = "Y" ]; then \
			pip install -r kong/requirements.txt; \
			echo "Python dependencies installed."; \
		else \
			echo "Skipping installation. Some features may not work."; \
		fi; \
	fi
	@if [ "$${KONG_DB:-off}" = "postgres" ]; then \
		IS_FIRST_RUN=$$(docker volume ls -q | grep -q '^kong_kong-db-data$$' && echo "no" || echo "yes"); \
		echo "Starting Kong with PostgreSQL database..."; \
		KONG_DATABASE=postgres docker-compose -f kong/docker-compose.yml --profile database up -d; \
		echo ""; \
		echo "Waiting for database migration to complete..."; \
		sleep 5; \
		docker-compose -f kong/docker-compose.yml logs kong-migration-bootstrap | tail -10; \
		echo ""; \
		echo "Kong started successfully with database!"; \
		if [ "$$IS_FIRST_RUN" = "yes" ]; then \
			echo ""; \
			echo "First run detected. Importing configuration from kong/conf/declarative.yml..."; \
			sleep 3; \
			./kong/bin/import_config.sh; \
		else \
			echo ""; \
			echo "Existing database found. Skipping configuration import."; \
			echo "To re-import configuration, run: make kong:reset"; \
		fi; \
	else \
		echo "Starting Kong in DB-less mode..."; \
		echo "Using declarative config: kong/conf/declarative.yml"; \
		docker-compose -f kong/docker-compose.yml up -d kong; \
		echo ""; \
		echo "Kong started successfully!"; \
	fi
	@echo "  Admin API:     http://localhost:8001"
	@echo "  Kong Manager:  http://localhost:8002"
	@echo "  Proxy:         http://localhost:8000"
	@echo ""
	@echo "Test the example service:"
	@echo "  curl http://localhost:8000/mock"

kong-stop:
	@echo "Stopping Kong containers..."
	@docker-compose -f kong/docker-compose.yml --profile database down
	@echo "Kong containers stopped and removed."

kong-restart:
	@$(MAKE) kong-stop
	@$(MAKE) kong-run

kong-status:
	@echo "Checking Kong container status..."
	@docker-compose -f kong/docker-compose.yml ps

kong-open:
	@bin/open_browser.sh http://localhost:8002

kong-reset:
	@./kong/bin/reset_config.sh

kong-list:
	@cd kong && ./bin/list_services.sh
