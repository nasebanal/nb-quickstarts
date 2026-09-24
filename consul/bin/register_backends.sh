#!/bin/sh
# Registers every running backend instance of the apps stack in Consul, and
# deregisters any that are registered but no longer running.
#
# How many instances run is apps' business (`APPS_BACKEND_INSTANCES=3 make
# apps:up`) - this only looks at what is there: containers of the `apps`
# compose project whose service is `backend` (instance 1) or `backend-N`. Each
# is registered under one service name, `apps-backend`, with its own ID
# (apps-backend-N), address (the compose service name, resolvable on
# apps-network), and an HTTP health check - every 2s, so a stopped instance
# drops out of Consul's answer within seconds.
set -e

CONSUL="http://localhost:${CONSUL_HTTP_PORT:-8500}"

running=$(docker ps --filter "label=com.docker.compose.project=apps" \
	--format '{{.Label "com.docker.compose.service"}}' | grep -E '^backend(-[0-9]+)?$' | sort -V || true)

if [ -z "$running" ]; then
	echo "No apps backend is running - start it first: make apps:up"
	exit 1
fi

echo "Registering the running backend instances with Consul..."
ids=""
for service in $running; do
	n=${service#backend-}
	[ "$service" = "backend" ] && n=1
	id="apps-backend-$n"
	ids="$ids $id"
	curl -s -X PUT "$CONSUL/v1/agent/service/register" -d "{\"ID\": \"$id\", \"Name\": \"apps-backend\", \"Tags\": [\"rest\", \"graphql\", \"mcp\"], \"Address\": \"$service\", \"Port\": 8080, \"Meta\": {\"instance\": \"backend-$n\"}, \"Check\": {\"HTTP\": \"http://$service:8080/health\", \"Interval\": \"2s\", \"Timeout\": \"1s\", \"DeregisterCriticalServiceAfter\": \"10m\"}}"
	echo "  registered $id -> $service:8080"
done

# Anything registered from an earlier, larger run (or the older single-ID registration).
for id in $(curl -s "$CONSUL/v1/agent/services" | jq -r 'keys[] | select(startswith("apps-backend"))'); do
	case " $ids " in
	*" $id "*) ;;
	*)
		curl -s -X PUT "$CONSUL/v1/agent/service/deregister/$id"
		echo "  deregistered $id (no longer running)"
		;;
	esac
done

echo ""
echo "Waiting for every instance to pass its health check..."
want=$(echo "$running" | wc -l | tr -d ' ')
t=0
until [ "$(curl -s "$CONSUL/v1/health/service/apps-backend?passing" | jq length)" = "$want" ] || [ "$t" -ge 60 ]; do
	sleep 2
	t=$((t + 1))
done
