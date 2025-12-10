from locust import User, task, between, events, tag
import pymysql
import time
import logging
import os

# MySQL Connection Configuration (from environment variables)
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-server")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "testuser")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "testpassword")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "testdb")
MYSQL_CARTESIAN_LIMIT = int(os.getenv("MYSQL_CARTESIAN_LIMIT", "10000"))

class MySQLUser(User):
    """MySQL load testing user with connection pool stress testing"""
    wait_time = between(0.1, 0.5)
    # Set host for display in Locust UI
    host = f"mysql://{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"

    def on_start(self):
        """Initialize MySQL connection when user starts"""
        self.connection = None
        self.connect_to_mysql()

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


    @task
    @tag('mysql-select')
    def select_query(self):
        """Execute SELECT query"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT * FROM information_schema.COLUMNS LIMIT 10")
                results = cursor.fetchall()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="select",
                response_time=total_time,
                response_length=len(results),
                exception=None,
                context={}
            )

            # Debug logging
            if self.debug_mode:
                print(f"✅ [MySQL Select] Retrieved {len(results)} row(s) in {total_time}ms")
                for row in results[:3]:  # Show first 3 rows only
                    print(f"  - {row[:3]}...")  # Show first 3 columns of each row
                if len(results) > 3:
                    print(f"  ... and {len(results) - 3} more rows")

        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="select",
                response_time=total_time,
                response_length=0,
                exception=e,
                context={}
            )
            if self.debug_mode:
                print(f"❌ [MySQL Select] Error: {e}")
            self.connection = None

    @task
    @tag('mysql-cartesian')
    def cartesian_join_query(self):
        """Execute heavy memory consumption cartesian join query"""
        if not self.connection:
            self.connect_to_mysql()
            if not self.connection:
                return

        start_time = time.time()
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT c1.*, c2.COLUMN_NAME as col2
                    FROM information_schema.COLUMNS c1
                    CROSS JOIN information_schema.COLUMNS c2
                    LIMIT {MYSQL_CARTESIAN_LIMIT}
                """)
                results = cursor.fetchall()

            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="cartesian_join",
                response_time=total_time,
                response_length=len(results),
                exception=None,
                context={}
            )
        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="MySQL",
                name="cartesian_join",
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
