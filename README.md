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
- **Locust**: MySQL/HTTP targets, cluster settings

Override via `.env` file or command-line:
```bash
make kong:run KONG_DB=postgres
make locust:test-mysql LOCUST_MYSQL_HOST=prod-db
```

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
make locust:join-cluster LOCUST_MASTER_HOST=<PC1-IP>
make locust:test-http LOCUST_WORKERS=2
```

**Requirements:** Network connectivity, ports 8089, 5557, 5558 accessible

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
