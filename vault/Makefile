#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### VAULT MANAGEMENT ###################

vault:
	@echo "🚀 Vault"
	@echo "HashiCorp Vault - secret storage. Here holding the MySQL credential apps/backend actually connects with."
	@echo ""
	@echo "Container Management:"
	@echo "  vault:up                  - Start Vault (dev mode - pre-unsealed, in-memory, KV v2 at secret/)"
	@echo "  vault:down                - Stop and remove Vault container"
	@echo "  vault:status              - Check Vault container status"
	@echo "  vault:restart             - Restart Vault (wipes secrets - dev mode has no persistence, see AGENTS.md)"
	@echo "  vault:open                - Open the Vault UI in browser"
	@echo ""
	@echo "apps/backend integration (requires apps:up):"
	@echo "  vault:put-mysql-secret    - Write apps' current MySQL credential into secret/apps/mysql"
	@echo "  vault:get-mysql-secret    - Read it back"
	@echo "  vault:verify-apps         - Write the secret, recreate the real backend with VAULT_ADDR/VAULT_TOKEN"
	@echo "                              set, then prove it actually used Vault (log line + a real DB query)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  VAULT_IMAGE=hashicorp/vault"
	@echo "  VAULT_VERSION=1.18"
	@echo "  VAULT_PORT=8200"
	@echo "  VAULT_ROOT_TOKEN=nb-vault-root-token"
	@echo "  VAULT_ADDR=, VAULT_TOKEN=  (apps/backend's own env vars, empty = off - see .env.example)"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  UI / API: http://localhost:$${VAULT_PORT:-8200} (token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token})"

vault\:%:
	@$(MAKE) vault-$(subst vault:,,$@)

#################### VAULT ACTIONS ###################

vault-up: apps-network-ensure
	@echo "Starting Vault (dev mode)..."
	@docker-compose -f vault/docker-compose.yml up -d
	@echo ""
	@echo "Vault started successfully!"
	@echo "  UI / API: http://localhost:$${VAULT_PORT:-8200}"
	@echo "  Root token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token}"
	@echo ""
	@echo "Next steps:"
	@echo "  make vault:open            # Open the Vault UI"
	@echo "  make vault:verify-apps     # Have the real backend fetch its MySQL credential from here (needs apps:up)"

vault-down:
	@echo "Stopping Vault..."
	@docker-compose -f vault/docker-compose.yml down
	@echo "Vault stopped and removed (dev mode holds no data to preserve)."

vault-status:
	@echo "Checking Vault container status..."
	@docker-compose -f vault/docker-compose.yml ps

vault-restart:
	@$(MAKE) vault-down
	@$(MAKE) vault-up

vault-open:
	@bin/open_browser.sh http://localhost:$${VAULT_PORT:-8200}/ui

#################### VAULT <-> APPS INTEGRATION ###################
# apps/backend (app/config.py) fetches secret/apps/mysql at startup when
# VAULT_ADDR/VAULT_TOKEN are set, and falls back to its own MYSQL_USER/
# MYSQL_PASSWORD env vars otherwise - same "empty leaves it off" shape as
# OTEL_EXPORTER_OTLP_ENDPOINT. The value written here is deliberately the
# *same* credential apps' MySQL already accepts (from LOCUST_MYSQL_USER/
# LOCUST_MYSQL_PASSWORD, what apps/docker-compose.yml itself uses) - this
# demo is about proving the real backend genuinely sources it from Vault at
# startup, not about handing out a different, unusable one.

vault-put-mysql-secret:
	@echo "Writing apps' MySQL credential into Vault (secret/apps/mysql)..."
	@curl -s -H "X-Vault-Token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token}" \
		-X POST -d "{\"data\": {\"user\": \"$${LOCUST_MYSQL_USER:-testuser}\", \"password\": \"$${LOCUST_MYSQL_PASSWORD:-testpassword}\"}}" \
		http://localhost:$${VAULT_PORT:-8200}/v1/secret/data/apps/mysql >/dev/null
	@echo "Written. Check with: make vault:get-mysql-secret"

vault-get-mysql-secret:
	@echo "Reading apps' MySQL credential back from Vault..."
	@curl -s -H "X-Vault-Token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token}" \
		http://localhost:$${VAULT_PORT:-8200}/v1/secret/data/apps/mysql | jq '.data.data'
	@echo ""

vault-verify-apps: vault-put-mysql-secret
	@echo ""
	@echo "Recreating apps/backend with VAULT_ADDR/VAULT_TOKEN set, so it fetches its MySQL"
	@echo "credential from Vault instead of only trusting its own MYSQL_PASSWORD env var..."
	@VAULT_ADDR=http://vault:8200 VAULT_TOKEN=$${VAULT_ROOT_TOKEN:-nb-vault-root-token} \
		docker-compose -f apps/docker-compose.yml up -d --force-recreate backend
	@sleep 6
	@echo ""
	@echo "Checking apps/backend's own startup log for proof it actually loaded the credential from Vault..."
	@docker logs nb-backend 2>&1 | grep -i vault || echo "  (no Vault log line yet - the container may still be starting; re-run in a few seconds)"
	@echo ""
	@echo "Proving the connection it opened with that credential actually works (a real MySQL query, not just 'container is up')..."
	@curl -s http://localhost:8080/accounts/balances | jq '.'
	@echo ""
	@echo "Note: 'make apps:restart' afterward returns the backend to reading MYSQL_PASSWORD from .env directly,"
	@echo "since VAULT_ADDR/VAULT_TOKEN only apply to this one --force-recreate, not to .env itself."
