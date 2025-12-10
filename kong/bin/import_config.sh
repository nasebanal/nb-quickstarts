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
    echo "Start Kong: make kong:run"
    exit 1
fi

# Use Python to parse YAML and import via Admin API
python3 << EOF
import yaml
import json
import urllib.request
import urllib.error

KONG_ADMIN_URL = "${KONG_ADMIN_URL}"
DECLARATIVE_CONFIG = "${DECLARATIVE_CONFIG}"

def api_post(path, data):
    url = f"{KONG_ADMIN_URL}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        # Ignore "already exists" errors
        if 'UNIQUE violation' not in error_body and 'already exists' not in error_body:
            print(f"  Error: {error_body}")
        return None

with open(DECLARATIVE_CONFIG, 'r') as f:
    config = yaml.safe_load(f)

services = config.get('services', [])
for svc in services:
    name = svc.get('name')
    url = svc.get('url')

    print(f"Creating service: {name}")
    api_post('/services', {'name': name, 'url': url})

    # Create routes
    for route in svc.get('routes', []):
        route_name = route.get('name')
        route_data = {'name': route_name}
        if 'paths' in route:
            route_data['paths'] = route['paths']
        if 'methods' in route:
            route_data['methods'] = route['methods']

        print(f"  Creating route: {route_name}")
        api_post(f'/services/{name}/routes', route_data)

    # Create plugins
    for plugin in svc.get('plugins', []):
        plugin_name = plugin.get('name')
        plugin_config = plugin.get('config', {})

        print(f"  Creating plugin: {plugin_name}")
        api_post(f'/services/{name}/plugins', {'name': plugin_name, 'config': plugin_config})

print("")
EOF

echo -e "${GREEN}✓${NC} Configuration imported from ${DECLARATIVE_CONFIG}"
