#!/bin/sh
# Checks each component answers, then whether apps/backend's telemetry has
# actually arrived (needs OTEL_EXPORTER_OTLP_ENDPOINT set + some traffic).

GRAFANA="http://localhost:${GRAFANA_PORT:-3030}"
PROM="http://localhost:${PROMETHEUS_PORT:-9094}"
TEMPO="http://localhost:${TEMPO_PORT:-3200}"
LOKI="http://localhost:${LOKI_PORT:-3100}"
ALERTMANAGER="http://localhost:${ALERTMANAGER_PORT:-9095}"

check() {
	name=$1; url=$2
	code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
	if [ "$code" = "200" ]; then echo "  $name: ready"; else echo "  $name: NOT ready (HTTP $code at $url)"; fi
}

echo "Components:"
check Grafana "$GRAFANA/api/health"
check Prometheus "$PROM/-/ready"
check Tempo "$TEMPO/ready"
check Loki "$LOKI/ready"
check Alertmanager "$ALERTMANAGER/-/ready"

echo "Alert rules loaded in Prometheus:"
curl -s "$PROM/api/v1/rules" | jq -r '.data.groups[].rules[] | "  \(.name): \(.state)"'

echo "Prometheus scrape targets:"
curl -s "$PROM/api/v1/targets" | jq -r '.data.activeTargets[] | "  \(.labels.job): \(.health)"'

echo "apps/backend telemetry:"
series=$(curl -s "$PROM/api/v1/label/service_name/values" | jq -r '.data[]?' | grep -c '^nb-backend$')
if [ "$series" -ge 1 ]; then
	echo "  metrics: nb-backend series present in Prometheus"
else
	echo "  metrics: none yet - is OTEL_EXPORTER_OTLP_ENDPOINT set in .env, apps restarted, and any request made?"
fi
traces=$(curl -s "$TEMPO/api/search?tags=service.name%3Dnb-backend&limit=1" | jq -r '.traces | length' 2>/dev/null)
if [ "${traces:-0}" -ge 1 ]; then
	echo "  traces:  nb-backend traces present in Tempo"
else
	echo "  traces:  none yet"
fi
logs=$(curl -s "$LOKI/loki/api/v1/label/service_name/values" | jq -r '.data[]?' 2>/dev/null | grep -c '^nb-backend$')
if [ "$logs" -ge 1 ]; then
	echo "  logs:    nb-backend logs present in Loki"
else
	echo "  logs:    none yet (only failed requests and app log lines are shipped - a healthy backend may have none)"
fi
