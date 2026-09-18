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
	@echo "agentgateway - open-source gateway for AI agent connectivity (MCP/A2A). Here exposing apps/backend's REST API as MCP tools, built live from its OpenAPI schema (apps/backend/openapi.yaml) - the same contract Specmatic/Microcks/Kong already build against."
	@echo ""
	@echo "Container Management:"
	@echo "  agentgateway:up      - Start agentgateway (needs apps:up - it fetches apps/backend's live OpenAPI schema)"
	@echo "  agentgateway:down    - Stop and remove it"
	@echo "  agentgateway:status  - Check container status"
	@echo "  agentgateway:restart - Restart it"
	@echo ""
	@echo "Verification:"
	@echo "  agentgateway:tools   - Do the MCP handshake by hand and list the tools it's actually serving"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  AGENTGATEWAY_VERSION=v1.5.0 # cr.agentgateway.dev/agentgateway image tag"
	@echo "  AGENTGATEWAY_PORT=8010      # Host-published MCP endpoint port"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  MCP (Streamable HTTP): http://localhost:$${AGENTGATEWAY_PORT:-8010}/mcp"
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
	@echo "Verify: make agentgateway:tools"

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

agentgateway-tools:
	@echo "Calling MCP initialize + tools/list against agentgateway..."
	@sh agentgateway/bin/list_tools.sh
