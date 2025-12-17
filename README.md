# NASEBANAL Quickstarts

A collection of quickstart templates and examples to help developers get started quickly with various technologies and frameworks.
You can find a quick demo movie below.

https://youtu.be/8UI0XZrSPkQ

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [License](#license)

## 🚀 Overview

This repository contains a curated collection of quickstart projects designed to help developers rapidly prototype and deploy applications using modern technologies. Each quickstart provides a solid foundation that you can build upon for your specific needs.

## 🏁 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/nasebanal/nb-quickstarts.git
   cd nb-quickstarts
   ```

2. **Configure environment variables (optional)**
   ```bash
   # Copy the example .env file and customize it
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Run quickstarts**
   ```bash
   # View available services
   make

   # Kafka
   make kafka:run
   make kafka:add-topics
   make kafka:list-topics

   # Consul
   make consul:run
   make consul:register-service
   make consul:get-services
   make consul:open

   # Kong API Gateway
   make kong:run
   make kong:open

   # Locust Load Testing
   make locust:run
   make locust:test-http-login
   make locust:open
   ```

## ⚙️ Configuration

All services use `.env` file for configuration:

**Key configurations:**
- **Kafka**: Port 9092, topic name, partitions
- **Consul**: Ports 8500 (HTTP), 8600 (DNS)
- **Kong**: DB mode (`off`/`postgres`), version, database credentials
- **Locust**: See detailed configuration below

Override via `.env` file or command-line:
```bash
make kong:run KONG_DB=postgres
make locust:test-mysql LOCUST_MYSQL_HOST=prod-db
```

### Locust Configuration

**Test Types:**
```bash
# HTTP Load Testing
make locust:test-http              # All HTTP tests
make locust:test-http-root         # Root page only (tag: http-root)
make locust:test-http-login        # Login test only (tag: http-login)

# GraphQL Load Testing
make locust:test-graphql           # All GraphQL operations
make locust:test-graphql-query     # Query operations (tag: graphql-query)
make locust:test-graphql-mutation  # Mutation operations (tag: graphql-mutation)

# MySQL Load Testing
make locust:test-mysql             # All MySQL tests
make locust:test-mysql-select      # SELECT queries (tag: mysql-select)
make locust:test-mysql-cartesian   # Cartesian join queries (tag: mysql-cartesian)
```

**Configuration Parameters (.env):**
```bash
# Test Configuration
LOCUST_FILE=locustfile_http.py     # Test file (locustfile_http.py, locustfile_graphql.py)
LOCUST_TAGS=                       # Filter tests by tags (optional)
LOCUST_WORKERS=5                   # Number of worker containers
LOCUST_DEBUG_MODE=false            # Enable debug logging (true/false)

# Target Configuration
LOCUST_HTTP_HOST=http://http-server:8080  # HTTP/GraphQL target
LOCUST_HOST=http://http-server:8080       # Locust host parameter
LOCUST_MYSQL_HOST=mysql-server     # MySQL hostname
LOCUST_MYSQL_PORT=3306             # MySQL port
LOCUST_MYSQL_USER=testuser         # MySQL username
LOCUST_MYSQL_PASSWORD=testpassword # MySQL password
LOCUST_MYSQL_DATABASE=information_schema  # MySQL database
LOCUST_MYSQL_CARTESIAN_LIMIT=10000 # LIMIT for cartesian join queries

# Headless Mode (auto-start without UI)
LOCUST_HEADLESS_FLAG=              # Set to --headless for headless mode
LOCUST_USERS=10                    # Number of concurrent users
LOCUST_SPAWN_RATE=1                # User spawn rate (users/second)
LOCUST_RUN_TIME=                   # Test duration (e.g., 1h30m, 60s)

# Cluster Configuration
LOCUST_MASTER_HOST=192.168.1.100   # Master IP for distributed testing
```

**Log Files:**

All logs are saved in timestamped directories: `locust/logs/YYYYMMDD_HHMMSS/`

- `target_host.txt` - Test configuration (target host, locustfile, tags, workers)
- `result.log` - Master + worker container output
- `master.log` - Locust framework logs
- `debug.log` - Worker debug messages (only if `LOCUST_DEBUG_MODE=true`)
- `locust_stats.csv` - Current aggregated statistics (periodically overwritten)
- `locust_stats_history.csv` - Time-series data (appended every second)
- `locust_failures.csv` - Failure records
- `locust_exceptions.csv` - Exception records
- `report.html` - Final test report

## 🔗 Cluster Load Testing

Distributed load testing across multiple PCs:

**Master (PC1):**
```bash
make locust:test-http
# Access UI at http://localhost:8089
```

**Workers (PC2+):**
```bash
make locust:build
make locust:join-cluster LOCUST_MASTER_HOST=<PC1-IP> LOCUST_WORKERS=5
```

**Requirements:**
- Network connectivity between master and workers
- Ports 8089 (UI), 5557 (master-worker communication), 5558 (master-worker communication) accessible
- Same `LOCUST_FILE` on all machines

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025, Shunjiro Yatsuzuka, NASEBANAL
