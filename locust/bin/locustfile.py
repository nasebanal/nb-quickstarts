from locust import HttpUser, User, task, between, events, tag
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
    host = os.getenv("LOCUST_HTTP_HOST", "http://localhost:8080")

    @task
    @tag('http-root')
    def load_homepage(self):
        self.client.get("/")

    @task
    @tag('http-login')
    def test_login(self):
        self.client.post("/login", json={
            "username": "admin",
            "password": "password"
        })

    @task
    @tag('graphql-query')
    def graphql_query(self):
        """GraphQL: Query posts (read operation)"""
        self.client.post("/graphql", name="/graphql (query)", json={
            "query": """
                query {
                    posts {
                        id
                        title
                        content
                        authorId
                        createdAt
                        author {
                            id
                            name
                            email
                        }
                    }
                }
            """
        })

    @task
    @tag('graphql-mutation')
    def graphql_mutation(self):
        """GraphQL: Mutation - Create post (write operation)"""
        import random
        author_id = random.choice(["1", "2", "3"])
        self.client.post("/graphql", name="/graphql (mutation)", json={
            "query": f"""
                mutation {{
                    createPost(
                        title: "Load Test Post",
                        content: "This is a test post from Locust",
                        authorId: "{author_id}"
                    ) {{
                        id
                        title
                        content
                        authorId
                        createdAt
                    }}
                }}
            """
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
                cursor.execute("""
                    SELECT c1.*, c2.COLUMN_NAME as col2
                    FROM information_schema.COLUMNS c1
                    CROSS JOIN information_schema.COLUMNS c2
                    LIMIT 10000
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
