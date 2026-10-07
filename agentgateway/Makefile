#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### AGENTGATEWAY (MCP/A2A gateway, fronting apps/backend as MCP tools) ###################
# Long-running service, same build/up/down/status/restart pattern as Kong -
# not a one-shot test run (see AGENTS.md's "Test/verification tool modules").

agentgateway:
	@echo "🚀 agentgateway"
	@echo "agentgateway - open-source gateway for AI agent connectivity (MCP/A2A). Here exposing apps/backend's REST API as MCP tools, built from the OpenAPI contract (shared/openapi/openapi.yaml) - the same file Specmatic and the backend use."
	@echo ""
	@echo "Container Management:"
	@echo "  agentgateway:up      - Start agentgateway (reads shared/openapi/openapi.yaml; tool calls need apps:up)"
	@echo "  agentgateway:down    - Stop and remove it"
	@echo "  agentgateway:status  - Check container status"
	@echo "  agentgateway:restart - Restart it"
	@echo "  agentgateway:open    - Open its dashboard UI in the browser"
	@echo ""
	@echo "Verification:"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  AGENTGATEWAY_VERSION=v1.5.0   # cr.agentgateway.dev/agentgateway image tag"
	@echo "  AGENTGATEWAY_PORT=8010        # Host-published MCP endpoint port"
	@echo "  AGENTGATEWAY_ADMIN_PORT=15000 # Host-published dashboard UI / admin API port"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  MCP (Streamable HTTP): http://localhost:$${AGENTGATEWAY_PORT:-8010}/mcp"
	@echo "  Dashboard UI:          http://localhost:$${AGENTGATEWAY_ADMIN_PORT:-15000}"
	@echo ""
	@echo "Note: point an MCP client (Claude Desktop, mcp-inspector, ...) at the"
	@echo "      endpoint above to call apps/backend's REST API as MCP tools -"
	@echo "      the same accounts/auth/health routes apps/backend itself mounts"
	@echo "      natively at /mcp (via fastapi-mcp), but built here entirely from"
	@echo "      the OpenAPI contract instead, with no backend-side MCP code at all."

agentgateway\:%:
	@$(MAKE) agentgateway-$(subst agentgateway:,,$@)

#################### AGENTGATEWAY ACTIONS ###################

agentgateway-up: apps-network-ensure
	@echo "Starting agentgateway..."
	@docker compose -p agentgateway -f agentgateway/docker-compose.yml up -d
	@echo "MCP endpoint: http://localhost:$${AGENTGATEWAY_PORT:-8010}/mcp"
	@echo "Dashboard UI: http://localhost:$${AGENTGATEWAY_ADMIN_PORT:-15000}"

agentgateway-down:
	@echo "Stopping agentgateway..."
	@docker compose -p agentgateway -f agentgateway/docker-compose.yml down --remove-orphans
	@echo "agentgateway stopped and removed."

agentgateway-status:
	@echo "Checking agentgateway container status..."
	@docker compose -p agentgateway -f agentgateway/docker-compose.yml ps

agentgateway-restart:
	@$(MAKE) agentgateway-down
	@$(MAKE) agentgateway-up

agentgateway-open:
	@bin/open_browser.sh http://localhost:$${AGENTGATEWAY_ADMIN_PORT:-15000}

