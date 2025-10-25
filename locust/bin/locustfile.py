from locust import HttpUser, User, task, between, events
import pymysql
import time
import logging
import os

# MySQL Connection Pool Configuration (from environment variables)
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-server")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "testuser")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "testpassword")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "testdb")
MYSQL_POOL_SIZE = 10

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def load_homepage(self):
        self.client.get("/")

    @task
    def test_login(self):
        self.client.post("/login", json={
            "username": "admin",
            "password": "password"
        })


class MySQLUser(User):
    """MySQL load testing user with connection pool stress testing"""
    wait_time = between(0.1, 0.5)
    # Set host for display in Locust UI
    host = f"mysql://{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

    def on_start(self):
        """Initialize MySQL connection when user starts"""
        self.connection = None
        self.connect_to_mysql()
        self.setup_test_table()

    def connect_to_mysql(self):
        """Establish MySQL connection"""
        start_time = time.time()
        try:
            self.connection = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                connect_timeout=10,
                read_timeout=10,
                write_timeout=10
            )
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="connect",
                response_time=total_time,
                response_length=0,
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="connect",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            logging.error(f"Failed to connect to MySQL: {e}")

    def setup_test_table(self):
        """Create test table if not exists"""
        if not self.connection:
            return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS load_test_data (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100),
                        value INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                self.connection.commit()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="setup_table",
                response_time=total_time,
                response_length=0,
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="setup_table",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )

    @task(3)
    def insert_query(self):
        """Execute INSERT query"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO load_test_data (name, value) VALUES (%s, %s)",
                    (f"test_{int(time.time())}", int(time.time() % 1000))
                )
                self.connection.commit()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="INSERT",
                response_time=total_time,
                response_length=0,
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="INSERT",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            self.connection = None

    @task(5)
    def select_query(self):
        """Execute SELECT query"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT * FROM load_test_data ORDER BY id DESC LIMIT 10")
                results = cursor.fetchall()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="SELECT",
                response_time=total_time,
                response_length=len(results),
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="SELECT",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            self.connection = None

    @task(2)
    def update_query(self):
        """Execute UPDATE query"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE load_test_data SET value = %s WHERE id = (SELECT id FROM (SELECT id FROM load_test_data ORDER BY RAND() LIMIT 1) AS tmp)",
                    (int(time.time() % 1000),)
                )
                self.connection.commit()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="UPDATE",
                response_time=total_time,
                response_length=0,
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="UPDATE",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            self.connection = None

    @task(1)
    def complex_query(self):
        """Execute complex query with JOIN and aggregation"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        COUNT(*) as total_count,
                        AVG(value) as avg_value,
                        MAX(value) as max_value,
                        MIN(value) as min_value
                    FROM load_test_data
                    WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                """)
                results = cursor.fetchall()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="COMPLEX_QUERY",
                response_time=total_time,
                response_length=len(results),
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="COMPLEX_QUERY",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            self.connection = None

    @task(1)
    def connection_pool_stress(self):
        """Stress test connection pool by opening/closing connections rapidly"""
        start_time = time.time()
        temp_connections = []

        try:
            # Try to open multiple connections rapidly to stress the pool
            for i in range(5):
                conn = pymysql.connect(
                    host=MYSQL_HOST,
                    port=MYSQL_PORT,
                    user=MYSQL_USER,
                    password=MYSQL_PASSWORD,
                    database=MYSQL_DATABASE,
                    connect_timeout=5
                )
                temp_connections.append(conn)

                # Execute a quick query on each connection
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchall()

            # Close all temporary connections
            for conn in temp_connections:
                conn.close()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="POOL_STRESS",
                response_time=total_time,
                response_length=len(temp_connections),
                exception=None,
                context={}
            )
        except Exception as e:
            # Clean up any opened connections
            for conn in temp_connections:
                try:
                    conn.close()
                except:
                    pass

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="POOL_STRESS",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )

    @task(1)
    def long_running_transaction(self):
        """Execute long-running transaction to test connection holding"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            self.connection.begin()

            with self.connection.cursor() as cursor:
                # Multiple operations in a single transaction
                cursor.execute("INSERT INTO load_test_data (name, value) VALUES (%s, %s)", ("tx_test", 100))
                cursor.execute("SELECT COUNT(*) FROM load_test_data")
                cursor.fetchall()
                cursor.execute("UPDATE load_test_data SET value = value + 1 WHERE name = 'tx_test'")

            self.connection.commit()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="LONG_TRANSACTION",
                response_time=total_time,
                response_length=0,
                exception=None,
                context={}
            )
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="LONG_TRANSACTION",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            self.connection = None

    def on_stop(self):
        """Clean up MySQL connection when user stops"""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
