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

3. **Check make's command menu**
   ```bash
   make
   ```

4. **Check make's subcommand help**
   ```bash
   make kafka
   make consul
   make locust
   ```

5. **Check make's subcommands and run it**
   ```bash
   # Kafka example
   make kafka:pull
   make kafka:run
   make kafka:status
   make kafka:stop

   # Consul example
   make consul:pull
   make consul:run
   make consul:open                # Open Consul UI at http://localhost:8500
   make consul:register-service    # Register sample web service
   make consul:get-services        # List all registered services
   make consul:discover-web        # Discover web service endpoints
   make consul:stop

   # Locust load testing example
   make locust:pull
   make locust:build
   make locust:run
   make locust:test-http-login   # HTTP login load testing

   # Cluster load testing (multiple PCs)
   # PC1 (Master): Run normal commands above
   # PC2 (Worker): Build image, join cluster, then run test commands
   make locust:build
   make locust:join-cluster LOCUST_MASTER_HOST=<PC1-IP>
   make locust:test-http-login  # Join cluster and run login test workers
   ```

## ⚙️ Configuration

### Environment Variables

The project uses a `.env` file to manage configuration. Create one from the example:

```bash
cp .env.example .env
```

**MySQL Configuration:**
- `MYSQL_HOST` - MySQL server hostname (default: `mysql-server`)
- `MYSQL_PORT` - MySQL server port (default: `3306`)
- `MYSQL_USER` - MySQL username (default: `testuser`)
- `MYSQL_PASSWORD` - MySQL password (default: `testpassword`)
- `MYSQL_DATABASE` - MySQL database name (default: `testdb`)

**HTTP Server Configuration:**
- `HTTP_HOST` - HTTP server target URL (default: `http://http-server:8080`)

**Cluster Configuration:**
- `LOCUST_MASTER_HOST` - Master node IP address for joining cluster (e.g., `192.168.1.100`)
- `LOCUST_WORKERS` - Number of worker containers to start (default: `1`)

You can override these values by:
1. Editing the `.env` file
2. Passing them as command-line arguments: `make locust:test-mysql MYSQL_HOST=prod-db`

## 🔗 Cluster Load Testing

This project supports distributed load testing across multiple PCs using Locust's master-worker architecture.

### Setup Instructions

**PC1 (Master Node):**
1. Clone and setup the repository as described above
2. Start the master and initial workers:
   ```bash
   make locust:test-http   # For HTTP testing
   # or
   make locust:test-mysql  # For MySQL testing
   ```
3. Access the Locust web UI (`http://localhost:8089`)

4. Note your PC1's IP address for PC2 to connect to

**PC2+ (Worker Nodes):**
1. Clone the same repository on additional PCs
2. Build the Locust image:
   ```bash
   make locust:build
   ```
3. Set the master host environment variable:
   ```bash
   export LOCUST_MASTER_HOST=<PC1-IP>
   ```
4. Run the *same test command* as the master to join the cluster:
   ```bash
   # For HTTP login testing (if PC1 runs locust:test-http-login)
   make locust:test-http-login LOCUST_WORKERS=2

   # For MySQL select testing (if PC1 runs locust:test-mysql-select)
   make locust:test-mysql-select LOCUST_WORKERS=2

   # Any test command will automatically detect cluster mode when LOCUST_MASTER_HOST is set
   ```

### Network Requirements

- All PCs must be on the same network or have network connectivity
- Port 8089 must be accessible from worker nodes to master node
- For MySQL testing, ensure MySQL connection parameters are correctly configured

### Monitoring

- Worker nodes will appear in the master's web UI under the "Workers" tab
- You can monitor the total number of users and RPS across all nodes
- Each worker node runs independently and reports back to the master

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
