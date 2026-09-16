#################### ENVIRONMENT SETUP ###################

# Load .env file if it exists
ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### APPS (TEST TARGETS) ###################
# apps はテスト対象そのもの(MySQL + backend(Python/FastAPI, REST+GraphQL) +
# frontend(TypeScript/Vite))を持つ。
#   - backend は MySQL の items を読み書きする。OpenAPI スキーマは
#     apps/backend/openapi.json に書き出してあり、将来 Specmatic の契約テストで
#     使う想定 (make specmatic:up はまだ無い)。
#   - backend の app/services/item_service.py は将来 Kafka コンシューマーから
#     も直接呼ぶ想定のサービス層。make kafka:up のイベントを受けて item を
#     登録する、というシナリオを見据えて分離してある(まだコンシューマー自体は
#     未実装)。
# Locust・Playwright・Vitest・Pytest・Specmatic 等のテストツールや、Kong(ゲートウェイ)・
# Microcks(コントラクトモック)は apps とは別モジュールとして追加し、apps-network に
# 接続する想定。テストツール側は対象ホストを環境変数からのみ読み込むこと(コンテナ名の
# ハードコード禁止)。そうすることで、apps を起動した状態でも外部ホスト向けにも
# 同じコマンドでテストを切り替えられる。

apps:
	@echo "🚀 Apps (Test Target) Commands:"
	@echo ""
	@echo "  apps:build          - Build backend/frontend Docker images"
	@echo "  apps:up             - Start test target apps (MySQL + backend + frontend)"
	@echo "  apps:down           - Stop and remove apps containers (MySQL data preserved)"
	@echo "  apps:status         - Check apps container status"
	@echo "  apps:restart        - Restart apps containers (MySQL data preserved)"
	@echo "  apps:reset          - Restart AND wipe MySQL data (fresh database)"
	@echo "  apps:open           - Open the frontend (TypeScript UI) in browser"
	@echo "  apps:export-openapi - Regenerate apps/backend/openapi.json"
	@echo ""
	@echo "Usage:"
	@echo "  make apps:up"
	@echo "  make locust:up   # targets apps by default (see .env: LOCUST_HTTP_HOST / LOCUST_MYSQL_HOST)"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Frontend:        http://localhost:5173"
	@echo "  API docs:        http://localhost:5173/api-docs (Scalar, reads the backend's live OpenAPI schema)"
	@echo "  Backend REST:    http://localhost:8080"
	@echo "  Backend GraphQL: http://localhost:8080/graphql"
	@echo "  MCP server:      http://localhost:8080/mcp"
	@echo "  MySQL:           localhost:3306 (database: testdb)"
	@echo ""
	@echo "Note: apps:up/apps:down manage the test target lifecycle independently"
	@echo "      from any test tool. Point a test tool at an external host instead"
	@echo "      (e.g. LOCUST_HTTP_HOST=https://staging.example.com) to test without apps."

apps\:%:
	@$(MAKE) apps-$(subst apps:,,$@)

#################### APPS ACTIONS ###################

# 他モジュール(locust 等)からも呼ばれる、冪等なネットワーク作成ターゲット。
# apps を起動していなくても、apps-network に接続するモジュールを先に起動できるようにする。
apps-network-ensure:
	@docker network create apps-network >/dev/null 2>&1 || true

apps-build:
	@echo "Building apps (backend/frontend) Docker images..."
	@docker compose -p apps -f apps/docker-compose.yml build
	@echo "Apps images built."

apps-up: apps-network-ensure
	@echo "Starting apps (MySQL + backend + frontend)..."
	@docker compose -p apps -f apps/docker-compose.yml up -d --renew-anon-volumes
	@printf "Waiting for MySQL (mysql-server) to be ready"
	@i=0; \
		until [ "$$(docker inspect -f '{{.State.Health.Status}}' mysql-server 2>/dev/null)" = "healthy" ] || [ $$i -ge 60 ]; do \
			printf "."; sleep 1; i=$$((i+1)); \
		done; \
		if [ "$$(docker inspect -f '{{.State.Health.Status}}' mysql-server 2>/dev/null)" = "healthy" ]; then echo " ready"; else echo " timeout (continuing)"; fi
	@echo "Apps started."
	@echo "  Frontend:        http://localhost:5173"
	@echo "  API docs:        http://localhost:5173/api-docs"
	@echo "  Backend REST:    http://localhost:8080"
	@echo "  Backend GraphQL: http://localhost:8080/graphql"
	@echo "  MCP server:      http://localhost:8080/mcp"
	@echo "  MySQL:           localhost:$${LOCUST_MYSQL_PORT:-3306}"

apps-down:
	@echo "Stopping apps containers..."
	@docker compose -p apps -f apps/docker-compose.yml down --remove-orphans
	@echo "Apps containers stopped and removed. (MySQL data preserved in the apps-db-data volume — use 'make apps:reset' to wipe it.)"

apps-status:
	@echo "Checking apps container status..."
	@docker compose -p apps -f apps/docker-compose.yml ps

apps-restart:
	@$(MAKE) apps-down
	@$(MAKE) apps-up

apps-reset:
	@echo "Resetting apps (wiping MySQL data)..."
	@docker compose -p apps -f apps/docker-compose.yml down --remove-orphans --volumes
	@$(MAKE) apps-up

apps-open:
	@bin/open_browser.sh http://localhost:5173

apps-export-openapi:
	@echo "Exporting OpenAPI schema to apps/backend/openapi.json..."
	@docker compose -p apps -f apps/docker-compose.yml exec backend python scripts/export_openapi.py
