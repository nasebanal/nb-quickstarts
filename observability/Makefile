#################### ENVIRONMENT SETUP ###################

ifneq (,$(wildcard ../.env))
    include ../.env
    export
endif

#################### OBSERVABILITY (OpenTelemetry Collector + Prometheus + Tempo + Grafana) ###################
# Long-running services, same up/down/status/restart/reset/open pattern as
# the other modules. Apps export OTLP to the collector; nothing here is
# started or configured by `apps:up`.

observability:
	@echo "🚀 Observability"
	@echo "OpenTelemetry Collector + Prometheus (metrics) + Tempo (traces) + Grafana (dashboards). Here receiving OTLP from apps/backend."
	@echo ""
	@echo "Container Management:"
	@echo "  observability:up      - Start collector, Prometheus, Tempo and Grafana"
	@echo "  observability:down    - Stop and remove them (metrics/traces/dashboard state preserved)"
	@echo "  observability:status  - Check container status"
	@echo "  observability:restart - Restart them (state preserved)"
	@echo "  observability:reset   - Restart AND wipe stored metrics/traces (Docker volumes: observability_prometheus-data, observability_tempo-data, observability_grafana-data)"
	@echo "  observability:open    - Open Grafana in the browser"
	@echo ""
	@echo "Verification:"
	@echo "  observability:verify  - Check each component is ready and whether apps/backend metrics have reached Prometheus"
	@echo ""
	@echo "Sending apps/backend's telemetry here (off by default):"
	@echo "  1. Set OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 in .env"
	@echo "  2. make apps:restart   # backend reads it at startup"
	@echo "  3. Generate traffic (make locust:test, or just use the frontend)"
	@echo ""
	@echo "Configuration (.env file):"
	@echo "  GRAFANA_PORT=3030       # Host-published Grafana port"
	@echo "  PROMETHEUS_PORT=9094    # Host-published Prometheus port"
	@echo "  TEMPO_PORT=3200         # Host-published Tempo query API port"
	@echo "  OTEL_GRPC_PORT=4317     # Host-published OTLP/gRPC port"
	@echo "  OTEL_HTTP_PORT=4318     # Host-published OTLP/HTTP port"
	@echo "  PROMETHEUS_RETENTION=7d"
	@echo ""
	@echo "Endpoints once started:"
	@echo "  Grafana:    http://localhost:$${GRAFANA_PORT:-3030}"
	@echo "  Prometheus: http://localhost:$${PROMETHEUS_PORT:-9094}"
	@echo "  Tempo:      http://localhost:$${TEMPO_PORT:-3200}"
	@echo "  OTLP:       localhost:$${OTEL_GRPC_PORT:-4317} (gRPC), http://localhost:$${OTEL_HTTP_PORT:-4318} (HTTP)"

observability\:%:
	@$(MAKE) observability-$(subst observability:,,$@)

#################### OBSERVABILITY ACTIONS ###################

observability-up: apps-network-ensure
	@echo "Starting observability stack..."
	@docker compose -p observability -f observability/docker-compose.yml up -d
	@echo ""
	@echo "Grafana:    http://localhost:$${GRAFANA_PORT:-3030}"
	@echo "Prometheus: http://localhost:$${PROMETHEUS_PORT:-9094}"
	@echo "OTLP:       http://localhost:$${OTEL_HTTP_PORT:-4318} (from apps-network: http://otel-collector:4318)"
	@echo "Next: set OTEL_EXPORTER_OTLP_ENDPOINT in .env + make apps:restart, then make observability:verify"

observability-down:
	@echo "Stopping observability stack..."
	@docker compose -p observability -f observability/docker-compose.yml down --remove-orphans
	@echo "Stopped and removed. (State preserved in the observability_* Docker volumes - use 'make observability:reset' to wipe it.)"

observability-status:
	@echo "Checking observability container status..."
	@docker compose -p observability -f observability/docker-compose.yml ps

observability-restart:
	@$(MAKE) observability-down
	@$(MAKE) observability-up

observability-reset:
	@echo "Resetting observability (wiping metrics/traces/Grafana state)..."
	@docker compose -p observability -f observability/docker-compose.yml down --volumes --remove-orphans
	@$(MAKE) observability-up

observability-open:
	@bin/open_browser.sh http://localhost:$${GRAFANA_PORT:-3030}

observability-verify:
	@sh observability/bin/verify.sh
