#################### KONG MANAGEMENT ###################

kong:
	@echo "🚀 Kong Management Commands:"
	@echo ""
	@echo "  kong:pull        - Pull Kong Docker image"
	@echo "  kong:run         - Start Kong container"
	@echo "  kong:stop        - Stop and remove Kong container"
	@echo "  kong:restart     - Restart Kong container"
	@echo "  kong:status      - Check Kong container status"
	@echo "  kong:open        - Open Kong Admin UI in browser"
	@echo ""
	@echo "Usage: make kong:run"

kong\:%:
	@$(MAKE) kong-$(subst kong:,,$@)

#################### KONG ACTIONS ###################

kong-pull:
	@echo "Pulling Kong Docker image..."
	@docker pull kong:3.6
	@echo "Kong image pulled successfully."

kong-run:
	@echo "Starting Kong container..."
	@docker run --name kong -p 8000:8000 -p 8443:8443 -p 8001:8001 -p 8444:8444 kong:3.6
	@echo "Kong container started."

kong-stop:
	@echo "Stopping Kong container..."
	@docker stop kong
	@docker rm kong
	@echo "Kong container stopped and removed."

kong-restart: kong-stop kong-run

kong-status:
	@echo "Checking Kong container status..."
	@docker ps -f "name=kong"
	@echo "Kong container status checked."

kong-open:
	@bin/open_browser.sh http://localhost:8001
