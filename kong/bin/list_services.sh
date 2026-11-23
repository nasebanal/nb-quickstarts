#!/usr/bin/env bash
"$(dirname "$0")/../../bin/require.sh" jq curl || exit 1
set -e

# Load .env if exists
if [ -f ".env" ]; then
    # shellcheck disable=SC2046  # splitting on whitespace is intended: one KEY=value per word
    export $(grep -v '^#' .env | xargs)
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
KONG_PROXY_URL="${KONG_PROXY_URL:-http://localhost:8000}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Kong Services & Routes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Kong is running
if ! curl -s -f "${KONG_ADMIN_URL}/status" > /dev/null 2>&1; then
    echo -e "${YELLOW}Kong is not running${NC}"
    echo "Start Kong: make kong:up"
    exit 1
fi

# Get all services
SERVICES=$(curl -s "${KONG_ADMIN_URL}/services" | jq -r '.data[] | .name')

if [ -z "$SERVICES" ]; then
    echo "No services configured"
    exit 0
fi

# Loop through each service, one per line. Read the list line by line instead of word-splitting
# it: it works the same in bash and zsh, and with more than one service a bare $SERVICES would
# otherwise reach curl as a single newline-joined URL.
while IFS= read -r SERVICE; do
    # Get service details
    SERVICE_DATA=$(curl -s "${KONG_ADMIN_URL}/services/${SERVICE}")
    HOST=$(echo "$SERVICE_DATA" | jq -r '.host')
    PORT=$(echo "$SERVICE_DATA" | jq -r '.port // 80')
    PROTOCOL=$(echo "$SERVICE_DATA" | jq -r '.protocol')

    echo -e "${GREEN}Service:${NC} ${SERVICE}"
    echo -e "  Upstream: ${PROTOCOL}://${HOST}:${PORT}"

    # Get routes for this service
    ROUTES=$(curl -s "${KONG_ADMIN_URL}/services/${SERVICE}/routes" | jq -r '.data[]')

    if [ -n "$ROUTES" ]; then
        echo "$ROUTES" | jq -r '
            "  Routes:" as $header |
            .paths[]? as $path |
            (.methods // ["ANY"]) as $methods |
            "    \($methods | join(", ")) \($path)"
        ' | while read -r line; do
            if [[ "$line" == "  Routes:" ]]; then
                echo -e "  ${BLUE}Routes:${NC}"
            else
                # Extract path from line
                PATH_PATTERN=$(echo "$line" | awk '{print $NF}')
                echo -e "${line}" | sed "s|${PATH_PATTERN}|${KONG_PROXY_URL}${PATH_PATTERN}|"
            fi
        done
    else
        echo "  No routes configured"
    fi

    echo ""
done <<< "$SERVICES"

echo -e "${BLUE}========================================${NC}"
