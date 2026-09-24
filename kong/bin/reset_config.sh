#!/bin/zsh
set -e

# Load .env if exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
DECLARATIVE_CONFIG="kong/conf/declarative.yml"

# Check if Kong is running
if ! curl -s "${KONG_ADMIN_URL}" > /dev/null 2>&1; then
    echo -e "${YELLOW}Kong is not running${NC}"
    echo "Start Kong: make kong:up"
    exit 1
fi

if [ "${KONG_DB:-postgres}" = "postgres" ]; then
    echo -e "${BLUE}Resetting Kong database configuration...${NC}"

    # Delete all routes first (routes depend on services). ${(f)ROUTES} is
    # zsh's split-on-newline expansion - a bare $ROUTES doesn't word-split
    # by default in zsh (unlike bash), so with more than one route this
    # handed the whole newline-joined blob to curl as a single malformed
    # multi-line URL, which curl rejected (set -e then aborted the script
    # before deleting anything) - same bug already fixed in
    # list_services.sh's ${(f)SERVICES}, just not here yet.
    echo "Deleting all routes..."
    ROUTES=$(curl -s "${KONG_ADMIN_URL}/routes" | jq -r '.data[].id // empty')
    for route_id in ${(f)ROUTES}; do
        curl -s -X DELETE "${KONG_ADMIN_URL}/routes/${route_id}" > /dev/null
        echo "  Deleted route: ${route_id}"
    done

    # Delete all services
    echo "Deleting all services..."
    SERVICES=$(curl -s "${KONG_ADMIN_URL}/services" | jq -r '.data[].id // empty')
    for service_id in ${(f)SERVICES}; do
        curl -s -X DELETE "${KONG_ADMIN_URL}/services/${service_id}" > /dev/null
        echo "  Deleted service: ${service_id}"
    done

    # Delete all plugins
    echo "Deleting all plugins..."
    PLUGINS=$(curl -s "${KONG_ADMIN_URL}/plugins" | jq -r '.data[].id // empty')
    for plugin_id in ${(f)PLUGINS}; do
        curl -s -X DELETE "${KONG_ADMIN_URL}/plugins/${plugin_id}" > /dev/null
        echo "  Deleted plugin: ${plugin_id}"
    done

    # Import from declarative config
    echo ""
    echo -e "${BLUE}Importing configuration from ${DECLARATIVE_CONFIG}...${NC}"
    ./kong/bin/import_config.sh

else
    echo -e "${BLUE}Reloading Kong declarative configuration...${NC}"

    # Reload declarative config (DB-less mode)
    docker exec nb-kong kong reload

    echo -e "${GREEN}✓${NC} Configuration reloaded from ${DECLARATIVE_CONFIG}"
fi

echo -e "${GREEN}Reset completed${NC}"
