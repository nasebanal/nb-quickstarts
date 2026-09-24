import os

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
