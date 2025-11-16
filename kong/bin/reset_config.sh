#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Reloading Kong declarative configuration...${NC}"

# Reload declarative config
docker exec kong kong reload

echo -e "${GREEN}✓${NC} Configuration reloaded from kong/conf/declarative.yml"
echo -e "${GREEN}Reset completed${NC}"
