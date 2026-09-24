#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### VAULT MANAGEMENT ###################

vault:
	@echo "🚀 Vault"
	@echo "HashiCorp Vault - secret storage. Here issuing the MySQL credential apps/backend actually connects with (a fresh, short-lived MySQL user per backend start)."
	@echo ""
	@echo "Container Management:"
	@echo "  vault:up                  - Start Vault (dev mode - pre-unsealed, in-memory, KV v2 at secret/)"
	@echo "  vault:down                - Stop and remove Vault container"
	@echo "  vault:status              - Check Vault container status"
	@echo "  vault:restart             - Restart Vault (wipes secrets - dev mode has no persistence, see AGENTS.md)"
	@echo "  vault:open                - Open the Vault UI in browser"
	@echo ""
	@echo "apps/backend integration (requires apps:up):"
	@echo "  vault:setup-mysql         - Enable the database secrets engine + the apps-backend role (idempotent)"
	@echo "  vault:db-users            - List the MySQL users Vault has created (v-... ones)"
	@echo "  vault:leases              - List Vault's live leases for those credentials"
	@echo "  vault:prove-needs-vault   - Recreate the backend with NO password and NO Vault: it can't log in"
	@echo "  vault:verify-apps         - Recreate the backend with NO password but WITH Vault: it logs in on a"
	@echo "                              Vault-issued user (log line + a real DB query + the user in MySQL)"
	@echo "  vault:put-mysql-secret    - (older, static way) Write apps' MySQL credential into secret/apps/mysql"
	@echo "  vault:get-mysql-secret    - Read it back"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  VAULT_IMAGE=hashicorp/vault"
	@echo "  VAULT_VERSION=1.18"
	@echo "  VAULT_PORT=8200"
	@echo "  VAULT_ROOT_TOKEN=nb-vault-root-token"
	@echo "  VAULT_ADDR=, VAULT_TOKEN=  (apps/backend's own env vars, empty = off - see .env.example)"
	@echo "  BACKEND_MYSQL_PASSWORD=    (set but empty: the backend has no password of its own - see .env.example)"
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
	@echo "  make vault:setup-mysql     # Let Vault issue MySQL users (needs apps:up)"
	@echo "  make vault:verify-apps     # Have the real backend log in with a Vault-issued user, no password in its config"

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
# *same* credential apps' MySQL already accepts (from APPS_MYSQL_USER/
# APPS_MYSQL_PASSWORD, what apps/docker-compose.yml itself uses) - this
# demo is about proving the real backend genuinely sources it from Vault at
# startup, not about handing out a different, unusable one.

vault-put-mysql-secret:
	@echo "Writing apps' MySQL credential into Vault (secret/apps/mysql)..."
	@curl -s -H "X-Vault-Token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token}" \
		-X POST -d "{\"data\": {\"user\": \"$${APPS_MYSQL_USER:-demo}\", \"password\": \"$${APPS_MYSQL_PASSWORD:-demo}\"}}" \
		http://localhost:$${VAULT_PORT:-8200}/v1/secret/data/apps/mysql >/dev/null
	@echo "Written. Check with: make vault:get-mysql-secret"

vault-get-mysql-secret:
	@echo "Reading apps' MySQL credential back from Vault..."
	@curl -s -H "X-Vault-Token: $${VAULT_ROOT_TOKEN:-nb-vault-root-token}" \
		http://localhost:$${VAULT_PORT:-8200}/v1/secret/data/apps/mysql | jq '.data.data'
	@echo ""

vault-setup-mysql:
	@echo "Enabling Vault's database secrets engine and the apps-backend role..."
	@docker exec -i -e VAULT_TOKEN=$${VAULT_ROOT_TOKEN:-nb-vault-root-token} \
		-e MYSQL_ROOT_PASSWORD=$${APPS_MYSQL_ROOT_PASSWORD:-rootpassword} \
		-e MYSQL_DATABASE=$${APPS_MYSQL_DATABASE:-demo} nb-vault sh < vault/bin/setup_mysql.sh

vault-db-users:
	@echo "MySQL users Vault has created (each is a separate, short-lived credential):"
	@docker exec nb-mysql-server mysql -uroot -p$${APPS_MYSQL_ROOT_PASSWORD:-rootpassword} -t \
		-e "SELECT user, host FROM mysql.user WHERE user LIKE 'v-%' ORDER BY user" 2>/dev/null

vault-leases:
	@echo "Vault's live leases for apps-backend credentials (one per issued MySQL user):"
	@docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=$${VAULT_ROOT_TOKEN:-nb-vault-root-token} \
		nb-vault vault list sys/leases/lookup/database/creds/apps-backend

# Both prove targets recreate the backend with BACKEND_MYSQL_PASSWORD set but
# empty (apps/docker-compose.yml uses `-`, not `:-`, so empty is kept): the
# backend then has no password of its own at all. Without Vault it can't log
# in; with Vault it asks for a credential and gets a brand-new MySQL user. The
# variables apply to this one recreate only - .env is not touched.
vault-prove-needs-vault:
	@echo "Recreating apps/backend with NO MySQL password and NO Vault..."
	@BACKEND_MYSQL_PASSWORD= VAULT_ADDR= VAULT_TOKEN= \
		docker-compose -f apps/docker-compose.yml up -d --force-recreate backend
	@sleep 12
	@echo ""
	@echo "What the backend says (it retries, then gives up):"
	@docker logs nb-backend 2>&1 | grep -i "access denied\|Could not connect" | head -3 || true
	@echo ""
	@echo "And a real request:"
	@curl -s -m 5 -o /dev/null -w "  GET /accounts/balances -> HTTP %{http_code}\n" http://localhost:8080/accounts/balances || echo "  (no answer - the backend never came up)"
	@echo ""
	@echo "'make vault:verify-apps' fixes it by handing the backend a Vault-issued credential;"
	@echo "'make apps:restart' returns it to the normal configuration."

vault-verify-apps: vault-setup-mysql
	@echo ""
	@echo "Recreating apps/backend with NO MySQL password of its own, but WITH Vault..."
	@BACKEND_MYSQL_PASSWORD= VAULT_ADDR=http://vault:8200 VAULT_TOKEN=$${VAULT_ROOT_TOKEN:-nb-vault-root-token} \
		docker-compose -f apps/docker-compose.yml up -d --force-recreate backend
	@i=0; until curl -sf -m 3 http://localhost:8080/health >/dev/null || [ $$i -ge 30 ]; do sleep 2; i=$$((i+1)); done
	@echo ""
	@echo "Password in the backend's environment: '$$(docker exec nb-backend printenv MYSQL_PASSWORD)' (empty on purpose)"
	@echo ""
	@echo "The backend's own startup log:"
	@docker logs nb-backend 2>&1 | grep -i vault || echo "  (no Vault log line yet - the container may still be starting; re-run in a few seconds)"
	@echo ""
	@echo "A real request over that connection (a MySQL round-trip, not just 'container is up')..."
	@curl -s http://localhost:8080/accounts/balances | jq -c '.[0:2]'
	@echo ""
	@$(MAKE) --no-print-directory vault-db-users
	@echo ""
	@echo "Note: 'make apps:restart' afterward returns the backend to its normal MYSQL_PASSWORD from .env,"
	@echo "since these variables only apply to this one --force-recreate, not to .env itself."
