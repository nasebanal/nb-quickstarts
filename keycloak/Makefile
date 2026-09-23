#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### KEYCLOAK MANAGEMENT ###################

keycloak:
	@echo "🚀 Keycloak"
	@echo "OIDC identity provider - here issuing real JWTs that apps/backend validates on its protected routes."
	@echo ""
	@echo "Container Management:"
	@echo "  keycloak:up          - Start Keycloak (imports keycloak/realm/nasebanal-realm.json)"
	@echo "  keycloak:down        - Stop and remove Keycloak container"
	@echo "  keycloak:status      - Check Keycloak container status"
	@echo "  keycloak:restart     - Restart Keycloak (re-imports the realm - no persistent state, see AGENTS.md)"
	@echo "  keycloak:open        - Open the Keycloak admin console in browser"
	@echo ""
	@echo "apps/backend integration (requires apps:up):"
	@echo "  keycloak:login       - Get a real access token for the demo user, print it"
	@echo "  keycloak:verify-apps - Get a token, then POST /accounts on the real backend with it"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  KEYCLOAK_IMAGE=quay.io/keycloak/keycloak"
	@echo "  KEYCLOAK_VERSION=26.0"
	@echo "  KEYCLOAK_PORT=8180"
	@echo "  KEYCLOAK_ADMIN=admin"
	@echo "  KEYCLOAK_ADMIN_PASSWORD=admin"
	@echo "  KEYCLOAK_ISSUER=      (apps/backend's env var, empty = off - see .env.example)"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Admin console: http://localhost:$${KEYCLOAK_PORT:-8180}/admin (admin / admin by default)"
	@echo "  Realm:         nasebanal (client apps-demo, user keycloak-demo / nasebanal-demo)"
	@echo ""
	@echo "Note: keycloak:verify-apps only succeeds once apps/backend actually trusts this realm -"
	@echo "      set KEYCLOAK_ISSUER=http://keycloak:8080/realms/nasebanal in .env, then 'make apps:restart'."

keycloak\:%:
	@$(MAKE) keycloak-$(subst keycloak:,,$@)

#################### KEYCLOAK ACTIONS ###################

keycloak-up: apps-network-ensure
	@echo "Starting Keycloak..."
	@docker-compose -f keycloak/docker-compose.yml up -d
	@echo ""
	@echo "Keycloak starting (dev mode, realm import can take a few seconds)..."
	@echo "  Admin console: http://localhost:$${KEYCLOAK_PORT:-8180}/admin"
	@echo ""
	@echo "Next steps:"
	@echo "  make keycloak:open            # Open the admin console"
	@echo "  make keycloak:login           # Get a real token for the demo user"
	@echo "  make keycloak:verify-apps     # Use it against the real backend (needs apps:up + KEYCLOAK_ISSUER set)"

keycloak-down:
	@echo "Stopping Keycloak..."
	@docker-compose -f keycloak/docker-compose.yml down
	@echo "Keycloak stopped and removed."

keycloak-status:
	@echo "Checking Keycloak container status..."
	@docker-compose -f keycloak/docker-compose.yml ps

keycloak-restart:
	@$(MAKE) keycloak-down
	@$(MAKE) keycloak-up

keycloak-open:
	@bin/open_browser.sh http://localhost:$${KEYCLOAK_PORT:-8180}/admin

#################### KEYCLOAK <-> APPS INTEGRATION ###################
# Both commands request the token from *inside* apps-network (a throwaway
# curlimages/curl container, same technique as consul-verify-apps) rather
# than from the host at localhost:$KEYCLOAK_PORT. That's deliberate, not
# just a convenience: Keycloak's issued `iss` claim reflects whatever Host
# header the token request actually used, and apps/backend (also on
# apps-network) validates tokens against KEYCLOAK_ISSUER's in-network
# origin (http://keycloak:8080/realms/nasebanal) - issuing from the host
# would mint tokens with a localhost:$KEYCLOAK_PORT issuer that the
# backend would then correctly reject as untrusted.

keycloak-login:
	@echo "Requesting a token for keycloak-demo from inside apps-network..."
	@docker run --rm --network apps-network curlimages/curl:8.11.1 -s -X POST \
		http://keycloak:8080/realms/nasebanal/protocol/openid-connect/token \
		-d "client_id=apps-demo" -d "grant_type=password" \
		-d "username=keycloak-demo" -d "password=nasebanal-demo" \
	| jq -r '.access_token // (.error_description // .)'
	@echo ""

keycloak-verify-apps:
	@echo "1. Getting a real access token from Keycloak (realm nasebanal, user keycloak-demo)..."
	@TOKEN=$$(docker run --rm --network apps-network curlimages/curl:8.11.1 -s -X POST \
		http://keycloak:8080/realms/nasebanal/protocol/openid-connect/token \
		-d "client_id=apps-demo" -d "grant_type=password" \
		-d "username=keycloak-demo" -d "password=nasebanal-demo" \
		| jq -r '.access_token'); \
	if [ "$$TOKEN" = "null" ] || [ -z "$$TOKEN" ]; then \
		echo "   Failed to get a token - is 'make keycloak:up' running?"; \
		exit 1; \
	fi; \
	echo "   Got token (truncated): $${TOKEN:0:24}..."; \
	echo ""; \
	echo "2. Calling the real backend's protected POST /accounts with it..."; \
	CODE=$$(curl -s -o /tmp/keycloak-verify-apps.json -w "%{http_code}" \
		-X POST http://localhost:8080/accounts \
		-H "Authorization: Bearer $$TOKEN" -H "Content-Type: application/json" \
		-d '{"name": "Keycloak Demo", "quantity": 1}'); \
	echo "   HTTP $$CODE"; cat /tmp/keycloak-verify-apps.json; echo ""; \
	if [ "$$CODE" = "201" ]; then \
		echo ""; \
		echo "   apps/backend accepted a real Keycloak-issued JWT on its own auth dependency"; \
		echo "   (app/auth.py's get_current_username) - same route the mock /auth/login token uses."; \
	else \
		echo ""; \
		echo "   Not accepted (expected on a fresh checkout). apps/backend only trusts this realm once"; \
		echo "   KEYCLOAK_ISSUER=http://keycloak:8080/realms/nasebanal is set in .env and 'make apps:restart' has run."; \
	fi
