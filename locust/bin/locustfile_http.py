import os

import exit_code  # noqa: F401 - exit code: native 0 / 1 (over LOCUST_MAX_FAIL_RATIO) / 2 (task exception)
import report_on_stop  # noqa: F401 - writes the --html report when a run stops

from locust import HttpUser, between, tag, task


class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("HTTP_HOST", "http://localhost:8080")

    @task
    @tag('http-root')
    def health_check(self):
        self.client.get("/health")

    @task
    @tag('http-login')
    def test_login(self):
        self.client.post("/auth/login", json={
            "username": "demo",
            "password": os.getenv("DEMO_PASSWORD", "demo"),
        })
