from locust import HttpUser, task, between

class WebsiteUser(HttpUser):

    @task
    def load_homepage(self):
        self.client.get("/")

    @task
    def test_login(self):
        self.client.post("/login", json={
            "username": "admin",
            "password": "password"
        })
