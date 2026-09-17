#!/bin/sh
# Shared by both the specmatic (test) and specmatic-stub (mock) services -
# both need the same contract and the same externalized examples, just
# handed to a different specmatic subcommand (test vs stub). Run from /app
# inside the specmatic container, with `backend` reachable.
#
# apps/backend/openapi.yaml is the contract (see that file's header
# comment) - the backend serves it verbatim at GET /openapi.json, already
# as 3.0.3 with no /graphql entry, so there's no relabeling to do here
# anymore (there used to be - see git history if you're wondering why this
# looks simpler than you'd expect).
#
# The 7 examples below are generated fresh every run, not checked in: the
# bearer token is a runtime secret, and every expected response body is
# fetched live so none of them can drift from what the backend actually
# does.
set -e

mkdir -p examples

curl -sf http://backend:8080/openapi.json > openapi.json

TOKEN=$(curl -sf -X POST http://backend:8080/auth/login \
  -H "Content-Type: application/json" -d '{"employeeCode": "specmatic"}' | jq -r .token)

jq -n --arg token "$TOKEN" \
  '{"http-request": {"method": "POST", "path": "/accounts", "headers": {"Authorization": ("Bearer " + $token)}, "body": {"name": "Specmatic Test Account", "quantity": 1}}, "http-response": {"status": 201, "body": {"id": 1, "name": "Specmatic Test Account", "quantity": 1, "source": "api", "createdAt": "2024-01-01T00:00:00"}}}' \
  > examples/post-accounts.json

curl -sf http://backend:8080/accounts/1 |
  jq '{"http-request": {"method": "GET", "path": "/accounts/1"}, "http-response": {"status": 200, "body": .}}' \
  > examples/get-accounts-account_id.json

curl -s -X POST http://backend:8080/auth/login -H "Content-Type: application/json" -d '{}' |
  jq '{"http-request": {"method": "POST", "path": "/auth/login", "body": {}}, "http-response": {"status": 422, "body": .}}' \
  > examples/post-auth-login-422.json

curl -s -X POST http://backend:8080/accounts -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" -d '{}' |
  jq --arg token "$TOKEN" \
  '{"http-request": {"method": "POST", "path": "/accounts", "headers": {"Authorization": ("Bearer " + $token)}, "body": {}}, "http-response": {"status": 422, "body": .}}' \
  > examples/post-accounts-422.json

curl -s http://backend:8080/accounts/not-a-number |
  jq '{"http-request": {"method": "GET", "path": "/accounts/not-a-number"}, "http-response": {"status": 422, "body": .}}' \
  > examples/get-accounts-account_id-422.json

curl -s -X POST http://backend:8080/accounts -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" -d '{"name": "x", "quantity": 1}' |
  jq '{"http-request": {"method": "POST", "path": "/accounts", "headers": {"Authorization": "Bearer invalid-token"}, "body": {"name": "x", "quantity": 1}}, "http-response": {"status": 401, "body": .}}' \
  > examples/post-accounts-401.json

curl -s http://backend:8080/accounts/999999 |
  jq '{"http-request": {"method": "GET", "path": "/accounts/999999"}, "http-response": {"status": 404, "body": .}}' \
  > examples/get-accounts-account_id-404.json
