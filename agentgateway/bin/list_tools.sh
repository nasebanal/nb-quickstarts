#!/bin/sh
# Does the MCP Streamable HTTP handshake by hand (initialize -> read the
# mcp-session-id header -> tools/list with that header) so `make
# agentgateway:tools` gives a quick "is it actually serving tools" check
# without needing mcp-inspector or a full MCP client installed.
set -e

BASE_URL="${1:-http://localhost:${AGENTGATEWAY_PORT:-8010}}"

SESSION=$(curl -sS -D - -o /dev/null -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"nb-quickstarts","version":"1.0"}}}' \
  | grep -i mcp-session-id | tr -d '\r' | cut -d' ' -f2)

if [ -z "$SESSION" ]; then
  echo "No mcp-session-id returned - is agentgateway running (make agentgateway:up) and apps/backend reachable?" >&2
  exit 1
fi

curl -sS -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | python3 -c "
import sys, json
lines = [l for l in sys.stdin if l.startswith('data:')]
tools = json.loads(lines[0][5:])['result']['tools']
for t in tools:
    print(f\"  {t['name']} - {t.get('description', '')}\")"
