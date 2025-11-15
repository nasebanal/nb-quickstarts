#################### CONSUL MANAGEMENT ###################

consul:
	@echo "🚀 Consul Management Commands:"
	@echo ""
	@echo "Container Management:"
	@echo "  consul:pull               - Pull Consul Docker image"
	@echo "  consul:run                - Start Consul container"
	@echo "  consul:stop               - Stop and remove Consul container"
	@echo "  consul:restart            - Restart Consul container"
	@echo "  consul:status             - Check Consul container status"
	@echo "  consul:open               - Open Consul UI in browser"
	@echo ""
	@echo "Service Registration:"
	@echo "  consul:register-service   - Register sample web service"
	@echo "  consul:register-db        - Register database service"
	@echo "  consul:deregister-service - Deregister web service"
	@echo "  consul:deregister-db      - Deregister database service"
	@echo ""
	@echo "Service Discovery:"
	@echo "  consul:get-services       - List all registered services"
	@echo "  consul:discover-web       - Discover web service endpoints (all)"
	@echo "  consul:discover-db        - Discover database service endpoints (all)"
	@echo "  consul:discover-healthy   - Discover only healthy service endpoints"
	@echo ""
	@echo "Usage: make consul:run"

consul\:%:
	@$(MAKE) consul-$(subst consul:,,$@)


#################### CONSUL ACTIONS ###################

consul-pull:
	@echo "Pulling Consul Docker image..."
	@docker pull hashicorp/consul:1.21
	@echo "Consul image pulled successfully."

consul-run:
	@echo "Starting Consul container..."
	@docker run --name consul -p 8500:8500 hashicorp/consul:1.21
	@echo "Consul container started."

consul-stop:
	@echo "Stopping Consul container..."
	@docker stop consul
	@docker rm consul
	@echo "Consul container stopped and removed."

consul-restart: consul-stop consul-run

consul-status:
	@echo "Checking Consul container status..."
	@docker ps -f "name=consul"
	@echo "Consul container status checked."

consul-open:
	@bin/open_browser.sh http://localhost:8500

consul-register-service:
	@echo "Registering sample service with Consul..."
	@curl -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "web-service-1", "Name": "web", "Tags": ["primary", "v1"], "Address": "127.0.0.1", "Port": 8080, "Check": {"HTTP": "http://127.0.0.1:8080/health", "Interval": "10s"}}'
	@echo ""
	@echo "Sample web service registered successfully."

consul-register-db:
	@echo "Registering database service with Consul..."
	@curl -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "db-service-1", "Name": "database", "Tags": ["postgresql", "primary"], "Address": "127.0.0.1", "Port": 5432, "Check": {"TCP": "127.0.0.1:5432", "Interval": "10s"}}'
	@echo ""
	@echo "Database service registered successfully."

consul-get-services:
	@echo "Getting all registered services..."
	@curl -s http://localhost:8500/v1/agent/services | jq '.'
	@echo ""

consul-discover-web:
	@echo "Discovering web service endpoints..."
	@curl -s "http://localhost:8500/v1/health/service/web" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags, HealthStatus: [.Checks[] | .Status] | unique}'
	@echo ""

consul-discover-db:
	@echo "Discovering database service endpoints..."
	@curl -s "http://localhost:8500/v1/health/service/database" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags, HealthStatus: [.Checks[] | .Status] | unique}'
	@echo ""

consul-discover-healthy:
	@echo "Discovering only healthy service endpoints..."
	@echo "Web services:"
	@curl -s "http://localhost:8500/v1/health/service/web?passing" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags}'
	@echo "Database services:"
	@curl -s "http://localhost:8500/v1/health/service/database?passing" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, Tags: .Service.Tags}'
	@echo ""

consul-deregister-service:
	@echo "Deregistering web service..."
	@curl -X PUT http://localhost:8500/v1/agent/service/deregister/web-service-1
	@echo ""
	@echo "Web service deregistered."

consul-deregister-db:
	@echo "Deregistering database service..."
	@curl -X PUT http://localhost:8500/v1/agent/service/deregister/db-service-1
	@echo ""
	@echo "Database service deregistered."
