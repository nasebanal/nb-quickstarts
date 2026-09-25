#!/bin/sh
# Runs Microcks's conformance test (runner OPEN_API_SCHEMA) against the real
# backend and prints one line per example.
#
# The contract must already be imported (`make microcks:test` does that first,
# through microcks:import-openapi). Microcks builds one request per *named
# example* of an operation (pairing request and response examples by key),
# sends it to the backend, and checks the status code and the response body
# against the example's response and the operation's schema.
#
# No Authorization header is sent, on purpose: the contract's examples model
# the unauthenticated case (`unauthorized` -> 401), and an `operationsHeaders`
# entry applies to every example of every operation it names, so adding a
# bearer token here turns those 401 examples into failures (GET /me answers
# 200 instead). The authenticated success paths have no example to run - see
# the notes in apps/backend/openapi.yaml - and are covered by Specmatic.
#
# Exit status: 0 when every example passed, 1 otherwise. The raw result is
# kept in microcks/report/ (gitignored), and the Microcks UI shows the same run.
set -eu

MICROCKS="http://localhost:${MICROCKS_PORT:-9090}"
SERVICE_ID="${MICROCKS_SERVICE_ID:-nb-quickstarts apps backend:0.1.0}"
# Where Microcks (inside apps-network) reaches the backend - not localhost.
TARGET="${MICROCKS_TEST_ENDPOINT:-http://backend:8080}"
REPORT_DIR="$(cd "$(dirname "$0")/.." && pwd)/report"

curl -sf "$MICROCKS/api/services" >/dev/null || {
	echo "Microcks is not answering at $MICROCKS - run: make microcks:up" >&2
	exit 1
}

BODY=$(jq -n --arg service "$SERVICE_ID" --arg target "$TARGET" \
	'{serviceId: $service, testEndpoint: $target, runnerType: "OPEN_API_SCHEMA", timeout: 20000}')
ID=$(curl -sf -X POST "$MICROCKS/api/tests" -H 'Content-Type: application/json' -d "$BODY" | jq -r .id)
[ -n "$ID" ] && [ "$ID" != null ] || { echo "Microcks did not accept the test (is '$SERVICE_ID' imported?)" >&2; exit 1; }

echo "Running Microcks test $ID against $TARGET ..."
i=0
until [ "$(curl -sf "$MICROCKS/api/tests/$ID" | jq -r .inProgress)" = false ]; do
	i=$((i + 1))
	[ "$i" -le 60 ] || { echo "Timed out waiting for the test to finish" >&2; exit 1; }
	sleep 1
done

mkdir -p "$REPORT_DIR"
curl -sf "$MICROCKS/api/tests/$ID" | jq . > "$REPORT_DIR/microcks-test-$ID.json"
cp "$REPORT_DIR/microcks-test-$ID.json" "$REPORT_DIR/latest.json"

echo ""
jq -r '.testCaseResults[] | .operationName as $op | .testStepResults[]?
	| "\(if .success then "PASS" else "FAIL" end)  \($op)  [\(.requestName)]" + (if .success then "" else "\n      " + ((.message // "") | split("\n")[0]) end)' \
	"$REPORT_DIR/latest.json"

PASSED=$(jq '[.testCaseResults[].testStepResults[]? | select(.success)] | length' "$REPORT_DIR/latest.json")
TOTAL=$(jq '[.testCaseResults[].testStepResults[]?] | length' "$REPORT_DIR/latest.json")
echo ""
echo "$PASSED of $TOTAL examples passed."
echo "Raw result: microcks/report/latest.json"
echo "In the UI:  $MICROCKS/#/tests/$ID"

[ "$(jq -r .success "$REPORT_DIR/latest.json")" = true ]
