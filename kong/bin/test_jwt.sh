#!/bin/zsh

# Checks Kong's JWT gate on the apps_backend route (/api/*) with real requests: the routes the backend leaves
# open are reachable without a token, everything else needs a valid backend-issued JWT, and the CORS
# preflight and Kong's own 401 carry the headers a browser needs. Needs `make kong:up` and `make apps:up`.
# Exits 1 if any check fails.

KONG_PROXY_URL="${KONG_PROXY_URL:-http://localhost:8000}"
API="${KONG_PROXY_URL}/api"
ORIGIN="${KONG_TEST_ORIGIN:-http://localhost:5173}"

PASS=0
FAIL=0
check() {  # check <label> <expected status> <actual status>
    if [ "$2" = "$3" ]; then
        printf "  \033[32m✓\033[0m %-58s %s\n" "$1" "$3"; PASS=$((PASS + 1))
    else
        printf "  \033[31m✗\033[0m %-58s %s (expected %s)\n" "$1" "$3" "$2"; FAIL=$((FAIL + 1))
    fi
}
status() { curl -s -m 8 -o /dev/null -w '%{http_code}' "$@"; }

if [ "$(status "${API}/health")" = "000" ]; then
    echo "Kong is not reachable at ${KONG_PROXY_URL} - run 'make kong:up' (and 'make apps:up') first."
    exit 1
fi

TOKEN=$(curl -s -m 8 -X POST "${API}/auth/login" -H 'content-type: application/json' \
    -d '{"username":"demo","password":"demo"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])' 2>/dev/null)
if [ -z "$TOKEN" ]; then
    echo "Could not log in through Kong (POST ${API}/auth/login) - is 'make apps:up' running, and was Kong imported ('make kong:reset')?"
    exit 1
fi

# A token that expired 10 seconds ago, signed by the backend itself (same key and claims as a real one).
EXPIRED=$(docker exec nb-backend python -c "from app.jwt_tokens import issue_token; print(issue_token('demo', ttl_seconds=-10))" 2>/dev/null | tail -1)
# An unsigned token (alg none) with otherwise valid-looking claims.
UNSIGNED=$(python3 -c 'import base64,json;b=lambda d:base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode();print(b({"alg":"none","typ":"JWT"})+"."+b({"iss":"http://localhost:8080","sub":"demo","exp":4102444800})+".")')

echo "Routes the backend leaves open (no token):"
check "GET /health" 200 "$(status "${API}/health")"
check "GET /openapi.json" 200 "$(status "${API}/openapi.json")"
check "GET /.well-known/jwks.json" 200 "$(status "${API}/.well-known/jwks.json")"
check "POST /auth/login (reaches the backend: 422 for an empty body)" 422 "$(status -X POST "${API}/auth/login" -H 'content-type: application/json' -d '{}')"

echo "Protected routes:"
check "GET /accounts without a token" 401 "$(status "${API}/accounts")"
check "GET /accounts with a valid token" 200 "$(status "${API}/accounts" -H "Authorization: Bearer ${TOKEN}")"
check "GET /me with a valid token" 200 "$(status "${API}/me" -H "Authorization: Bearer ${TOKEN}")"
check "GET /accounts with a tampered signature" 401 "$(status "${API}/accounts" -H "Authorization: Bearer ${TOKEN%?}x")"
check "GET /accounts with a made-up token" 401 "$(status "${API}/accounts" -H 'Authorization: Bearer abc.def.ghi')"
check "GET /accounts with an expired token" 401 "$(status "${API}/accounts" -H "Authorization: Bearer ${EXPIRED}")"
check "GET /accounts with an unsigned (alg none) token" 401 "$(status "${API}/accounts" -H "Authorization: Bearer ${UNSIGNED}")"

echo "CORS (the frontend calls Kong from another origin):"
check "OPTIONS /accounts preflight is answered" 200 "$(status -X OPTIONS "${API}/accounts" -H "Origin: ${ORIGIN}" -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization')"
ALLOW=$(curl -s -m 8 -D - -o /dev/null "${API}/accounts" -H "Origin: ${ORIGIN}" | tr -d '\r' | grep -ic '^access-control-allow-origin:')
check "Kong's own 401 carries Access-Control-Allow-Origin" 1 "$ALLOW"
ALLOW=$(curl -s -m 8 -D - -o /dev/null "${API}/accounts" -H "Authorization: Bearer ${TOKEN}" -H "Origin: ${ORIGIN}" | tr -d '\r' | grep -ic '^access-control-allow-origin:')
check "a proxied 200 has exactly one Access-Control-Allow-Origin" 1 "$ALLOW"

echo ""
echo "${PASS} passed, ${FAIL} failed"
[ "$FAIL" -eq 0 ]
