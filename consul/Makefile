#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### CONSUL MANAGEMENT ###################

consul:
	@echo "🚀 Consul"
	@echo "HashiCorp Consul - service networking (registry/discovery, health checking). Here registering apps' real services."
	@echo ""
	@echo "Container Management:"
	@echo "  consul:up                 - Start Consul container"
	@echo "  consul:down               - Stop and remove Consul container (catalog preserved)"
	@echo "  consul:status             - Check Consul container status"
	@echo "  consul:restart            - Restart Consul container (catalog preserved)"
	@echo "  consul:reset              - Restart AND wipe the catalog (Docker volumes: consul_consul-data, consul_consul-config)"
	@echo "  consul:open               - Open Consul UI in browser"
	@echo ""
	@echo "Service Registration (the real apps stack - requires apps:up):"
	@echo "  consul:register-apps      - Register apps' backend/frontend/mysql with real health checks"
	@echo "  consul:deregister-apps    - Deregister them"
	@echo ""
	@echo "Service Discovery:"
	@echo "  consul:get-services       - List all registered services (raw catalog)"
	@echo "  consul:discover-apps      - Discover apps' backend/frontend/mysql + health status"
	@echo "  consul:verify-apps        - Discover apps' endpoints via Consul, then actually connect to what it returned"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  CONSUL_IMAGE=hashicorp/consul"
	@echo "  CONSUL_VERSION=1.21.5"
	@echo "  CONSUL_HTTP_PORT=8500"
	@echo "  CONSUL_DNS_PORT=8600"
	@echo "  CONSUL_SERVER_RPC_PORT=8300"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  HTTP API / UI: http://localhost:$${CONSUL_HTTP_PORT:-8500}"
	@echo "  DNS:           localhost:$${CONSUL_DNS_PORT:-8600}"
	@echo ""
	@echo "Note: consul:register-apps needs apps:up first - the services it registers are apps' own containers."

consul\:%:
	@$(MAKE) consul-$(subst consul:,,$@)


#################### CONSUL ACTIONS ###################

consul-up: apps-network-ensure
	@echo "Starting Consul containers..."
	@docker-compose -f consul/docker-compose.yml up -d
	@echo ""
	@echo "Consul started successfully!"
	@echo "  HTTP API: http://localhost:$${CONSUL_HTTP_PORT:-8500}"
	@echo "  DNS:      localhost:$${CONSUL_DNS_PORT:-8600}"
	@echo ""
	@echo "Next steps:"
	@echo "  make consul:open              # Open Consul UI in browser"
	@echo "  make consul:register-apps     # Register the real apps stack (needs apps:up)"
	@echo "  make consul:verify-apps       # Discover + actually connect"

consul-down:
	@echo "Stopping Consul containers..."
	@docker-compose -f consul/docker-compose.yml down
	@echo "Consul containers stopped and removed. (Catalog preserved in the consul_consul-data / consul_consul-config Docker volumes — use 'make consul:reset' to wipe it.)"

consul-status:
	@echo "Checking Consul container status..."
	@docker-compose -f consul/docker-compose.yml ps

consul-restart:
	@$(MAKE) consul-down
	@$(MAKE) consul-up

consul-reset:
	@echo "Resetting Consul (wiping the catalog - Docker volumes: consul_consul-data, consul_consul-config)..."
	@docker-compose -f consul/docker-compose.yml down --volumes
	@$(MAKE) consul-up

consul-open:
	@bin/open_browser.sh http://localhost:8500

consul-get-services:
	@echo "Getting all registered services..."
	@curl -s http://localhost:8500/v1/agent/services | jq '.'
	@echo ""

#################### CONSUL <-> APPS INTEGRATION ###################
# Consul is on apps-network (see consul/docker-compose.yml), so its own
# agent - which is what actually performs HTTP/TCP health checks - can
# resolve "backend"/"frontend"/"mysql-server" by container name. Requires
# `make apps:up` first, or the checks just come up critical.

consul-register-apps:
	@echo "Registering apps' backend/frontend/mysql with Consul..."
	@# apps-frontend's check uses Method:HEAD, not the HTTP check's default
	@# GET - a GET against Next.js dev server's "/" streams its whole React
	@# payload back, and Consul stores a check's response body in the check
	@# Output field; past its size cap, Consul truncates mid-escape-sequence
	@# and corrupts the JSON of every subsequent /v1/health/service query for
	@# it. HEAD gets the same "is this actually an HTTP server that
	@# responds" signal with an empty body, so nothing to truncate.
	@curl -s -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "apps-backend", "Name": "apps-backend", "Tags": ["rest", "graphql", "mcp"], "Address": "backend", "Port": 8080, "Check": {"HTTP": "http://backend:8080/health", "Interval": "10s"}}'
	@curl -s -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "apps-frontend", "Name": "apps-frontend", "Tags": ["nextjs"], "Address": "frontend", "Port": 5173, "Check": {"HTTP": "http://frontend:5173/", "Method": "HEAD", "Interval": "10s"}}'
	@curl -s -X PUT http://localhost:8500/v1/agent/service/register \
		-d '{"ID": "apps-mysql", "Name": "apps-mysql", "Tags": ["mysql"], "Address": "mysql-server", "Port": 3306, "Check": {"TCP": "mysql-server:3306", "Interval": "10s"}}'
	@echo "Registered apps-backend, apps-frontend, apps-mysql."
	@echo "Check health: make consul:discover-apps  (or http://localhost:8500/ui)"
	@echo "Prove it actually works: make consul:verify-apps"

consul-deregister-apps:
	@echo "Deregistering apps' backend/frontend/mysql from Consul..."
	@curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/apps-backend
	@curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/apps-frontend
	@curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/apps-mysql
	@echo ""
	@echo "Deregistered."

consul-discover-apps:
	@echo "Discovering apps' service endpoints..."
	@for name in apps-backend apps-frontend apps-mysql; do \
		curl -s "http://localhost:8500/v1/health/service/$$name" | jq '.[] | {ServiceID: .Service.ID, ServiceName: .Service.Service, Address: .Service.Address, Port: .Service.Port, HealthStatus: [.Checks[] | .Status] | unique}'; \
	done
	@echo ""

# Unlike consul-discover-apps (which just prints Consul's own cached health
# check result), this queries Consul for each service's address/port and
# then makes a fresh, live connection to exactly what Consul returned - the
# actual "look it up, then connect to what you found" pattern service
# discovery exists for, not just a health dashboard. Runs the connection
# attempt itself from a throwaway container on apps-network, since this
# Makefile executes on the host and "backend"/"frontend"/"mysql-server"
# aren't resolvable there.
consul-verify-apps:
	@echo "Discovering apps services via Consul, then connecting to what it returned..."
	@for entry in apps-backend:http:/health apps-frontend:http:/ apps-mysql:tcp:; do \
		NAME=$$(echo "$$entry" | cut -d: -f1); PROTO=$$(echo "$$entry" | cut -d: -f2); PATH_SUFFIX=$$(echo "$$entry" | cut -d: -f3); \
		RESULT=$$(curl -s "http://localhost:8500/v1/health/service/$$NAME?passing"); \
		ADDR=$$(echo "$$RESULT" | jq -r '.[0].Service.Address // empty'); \
		PORT=$$(echo "$$RESULT" | jq -r '.[0].Service.Port // empty'); \
		if [ -z "$$ADDR" ]; then \
			echo "  $$NAME: not registered/passing in Consul - run 'make consul:register-apps' first"; \
			continue; \
		fi; \
		echo "  $$NAME -> Consul says $$ADDR:$$PORT"; \
		if [ "$$PROTO" = "http" ]; then \
			CODE=$$(docker run --rm --network apps-network curlimages/curl:8.11.1 -s -o /dev/null -w "%{http_code}" "http://$$ADDR:$$PORT$$PATH_SUFFIX" 2>/dev/null); \
			if [ "$$CODE" = "200" ]; then echo "    connected -> HTTP $$CODE OK"; else echo "    connected -> HTTP $$CODE"; fi; \
		else \
			if docker run --rm --network apps-network busybox:1.36 nc -z -w2 "$$ADDR" "$$PORT" >/dev/null 2>&1; then \
				echo "    connected -> TCP port open"; \
			else \
				echo "    connected -> FAILED"; \
			fi; \
		fi; \
	done
	@echo ""
