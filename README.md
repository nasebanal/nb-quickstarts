# NASEBANAL Quickstarts

A collection of quickstart templates and examples to help developers get started quickly with various technologies and frameworks.

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
   make locust
   ```

5. **Check make's subcommands and run it**
   ```bash
   # Kafka example
   make kafka:pull
   make kafka:run
   make kafka:status
   make kafka:stop

   # Locust load testing example
   make locust:build
   make locust:run
   make locust:test-http   # HTTP load testing
   make locust:test-mysql  # MySQL load testing
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

You can override these values by:
1. Editing the `.env` file
2. Passing them as command-line arguments: `make locust:test-mysql MYSQL_HOST=prod-db`

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
