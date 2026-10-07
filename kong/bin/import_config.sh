#!/bin/zsh
set -e

# Load .env if exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

GREEN='\033[0;32m'
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

# Load the declarative file into Kong's database with Kong's own importer,
# run inside the Kong container (the file is mounted at /kong/conf) - so
# nothing but Docker is needed on the host. `db_import` only works on an
# empty database (it fails with a UNIQUE violation on an existing entity),
# which is why kong:reset wipes the whole database before calling this.
docker exec nb-kong kong config db_import /kong/conf/declarative.yml

# db_import writes straight to the database and does not tell the running Kong, whose router would stay
# empty (every request a 404 "no Route matched") until the next restart - so reload it to pick the import up.
docker exec nb-kong kong reload

echo -e "${GREEN}✓${NC} Configuration imported from ${DECLARATIVE_CONFIG}"
