from locust import HttpUser, task, between, tag
import os

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("HTTP_HOST", "http://localhost:8080")

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
