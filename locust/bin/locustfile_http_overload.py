"""Hammers POST /accounts directly over REST, with no wait_time between
requests - the "no Kafka" side of the comparison demo (see
locustfile_kafka.py for the buffered side). Each simulated user opens a
synchronous, blocking connection for every request; with enough concurrent
users this can exhaust the backend's DB connection pool
(SQLAlchemy's default pool_size=5 + max_overflow=10) and/or the thread pool
FastAPI runs sync route handlers in, producing errors or growing latency -
demonstrating why a direct-REST-under-load path doesn't degrade gracefully
the way an async, buffered Kafka path does.

Usage: make locust:up LOCUST_FILE=locustfile_http_overload.py LOCUST_USERS=100 LOCUST_SPAWN_RATE=20
"""

import os

from locust import HttpUser, task


class OverloadUser(HttpUser):
    wait_time = lambda self: 0  # noqa: E731 - no think time, on purpose
    host = os.getenv("HTTP_HOST", "http://localhost:8080")

    def on_start(self):
        response = self.client.post("/auth/login", json={"employeeCode": "overload-test"})
        self.token = response.json()["token"]

    @task
    def create_account(self):
        self.client.post(
            "/accounts",
            json={"name": "Overload Account", "quantity": 1},
            headers={"Authorization": f"Bearer {self.token}"},
        )
