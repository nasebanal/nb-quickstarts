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
	@echo "  kong:reset-config    - Reset configuration (reload declarative.yml)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  KONG_DB=off       - DB-less mode (uses kong/conf/declarative.yml)"
	@echo "  KONG_DB=postgres  - Database mode (uses PostgreSQL)"
	@echo ""
	@echo "Usage:"
	@echo "  make kong:run                  # Use mode from .env (default: off)"
	@echo "  KONG_DB=postgres make kong:run # Override to use database mode"
	@echo ""
	@echo "Test endpoints:"
	@echo "  curl http://localhost:8000/mock"
	@echo "  curl http://localhost:8000/echo/get"

kong\:%:
	@$(MAKE) kong-$(subst kong:,,$@)

#################### KONG ACTIONS ###################

kong-pull:
	@echo "Pulling Kong Docker image..."
	@docker pull kong:${KONG_VERSION:-3.6}
	@echo "Kong image pulled successfully."

kong-run:
	@if [ "$${KONG_DB:-off}" = "postgres" ]; then \
		echo "Starting Kong with PostgreSQL database..."; \
		cd kong && KONG_DATABASE=postgres docker-compose --profile database up -d; \
		echo ""; \
		echo "Waiting for database migration to complete..."; \
		sleep 5; \
		cd kong && docker-compose logs kong-migration-bootstrap | tail -10; \
		echo ""; \
		echo "Kong started successfully with database!"; \
	else \
		echo "Starting Kong in DB-less mode..."; \
		echo "Using declarative config: kong/conf/declarative.yml"; \
		cd kong && docker-compose up -d kong; \
		echo ""; \
		echo "Kong started successfully!"; \
	fi
	@echo "  Admin API:     http://localhost:8001"
	@echo "  Kong Manager:  http://localhost:8002"
	@echo "  Proxy:         http://localhost:8000"
	@echo ""
	@if [ "$${KONG_DB:-off}" = "off" ]; then \
		echo "Test the example service:"; \
		echo "  curl http://localhost:8000/mock"; \
	fi

kong-stop:
	@echo "Stopping Kong containers..."
	@cd kong && docker-compose --profile database down
	@echo "Kong containers stopped and removed."

kong-restart:
	@$(MAKE) kong-stop
	@$(MAKE) kong-run

kong-status:
	@echo "Checking Kong container status..."
	@cd kong && docker-compose ps

kong-open:
	@bin/open_browser.sh http://localhost:8002

kong-reset-config:
	@cd kong && ./bin/reset_config.sh

kong-list:
	@cd kong && ./bin/list_services.sh
