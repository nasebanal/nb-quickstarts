#!/bin/zsh

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# This always targets the local apps module's own MySQL container by its
# actual container name, independent of LOCUST_MYSQL_HOST (which is a
# network-internal hostname other tools use, and may point at an external
# host that this script can't docker exec into anyway).
MYSQL_CONTAINER=nb-mysql-server

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
    echo "Error: MySQL container '${MYSQL_CONTAINER}' is not running"
    echo "Please start the MySQL container first with: make apps:up"
    exit 1
fi

# Access MySQL container using credentials from .env
docker exec -it ${MYSQL_CONTAINER} mysql -u ${APPS_MYSQL_USER:-demo} -p${APPS_MYSQL_PASSWORD:-demo} ${APPS_MYSQL_DATABASE:-demo}
