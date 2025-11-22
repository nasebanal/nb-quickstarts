#!/bin/bash

# Test rate limiting by sending multiple requests to Kong proxy

# Configuration from environment variables with defaults
KONG_PROXY_HOST="${KONG_PROXY_HOST:-localhost}"
KONG_PROXY_PORT="${KONG_PROXY_PORT:-8000}"
KONG_TEST_PATH="${KONG_TEST_PATH:-/mock}"
REQUEST_COUNT="${RATE_LIMIT_TEST_COUNT:-10}"

BASE_URL="http://${KONG_PROXY_HOST}:${KONG_PROXY_PORT}${KONG_TEST_PATH}"

echo "Testing rate limit on: ${BASE_URL}"
echo "Sending ${REQUEST_COUNT} requests..."
echo ""
echo "Request | Status | Rate-Limit-Remaining"
echo "--------|--------|---------------------"

for i in $(seq 1 $REQUEST_COUNT); do
    # Get HTTP status code and rate limit headers
    response=$(curl -s -o /dev/null -w "%{http_code}" -D - "${BASE_URL}" 2>/dev/null)

    # Extract status code
    status_code=$(echo "$response" | tail -1)

    # Extract RateLimit-Remaining header (case-insensitive)
    rate_limit_remaining=$(echo "$response" | grep -i "RateLimit-Remaining:" | awk '{print $2}' | tr -d '\r')
    rate_limit_remaining="${rate_limit_remaining:--}"

    # Color output based on status
    if [ "$status_code" = "200" ]; then
        printf "   %2d   |  \033[32m%s\033[0m  | %s\n" "$i" "$status_code" "$rate_limit_remaining"
    elif [ "$status_code" = "429" ]; then
        printf "   %2d   |  \033[31m%s\033[0m  | %s (Rate Limited!)\n" "$i" "$status_code" "$rate_limit_remaining"
    else
        printf "   %2d   |  \033[33m%s\033[0m  | %s\n" "$i" "$status_code" "$rate_limit_remaining"
    fi

    # Small delay to make output readable
    sleep 0.1
done

echo ""
echo "Test completed."
echo ""
echo "Status codes:"
echo "  200 = Request successful"
echo "  429 = Rate limit exceeded"
