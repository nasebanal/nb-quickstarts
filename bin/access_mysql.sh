#!/bin/zsh

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${LOCUST_MYSQL_HOST}$"; then
    echo "Error: MySQL container '${LOCUST_MYSQL_HOST}' is not running"
    echo "Please start the MySQL container first with: make locust:run"
    exit 1
fi

# Access MySQL container using credentials from .env
docker exec -it ${LOCUST_MYSQL_HOST} mysql -u ${LOCUST_MYSQL_USER} -p${LOCUST_MYSQL_PASSWORD} ${LOCUST_MYSQL_DATABASE}
