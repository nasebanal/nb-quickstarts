"""The same overload as locustfile_http_overload.py - every user hammering
POST /accounts with no wait - but spread over every healthy backend instance
Consul knows about, instead of one fixed address.

Each request goes to the next instance in Consul's list of healthy
`apps-backend` instances (the same discovery `make consul:lb-demo` does; the
list is refreshed every couple of seconds, not on every request, so the load
generator does not become Consul's load test). With three instances running
(`APPS_BACKEND_INSTANCES=3 make apps:up`, then `make consul:register-apps`) the same 300 users see three DB connection pools
and three worker processes instead of one.

Usage: make locust:test LOCUST_FILE=locustfile_http_overload_consul.py \
         LOCUST_USERS=300 LOCUST_SPAWN_RATE=100 LOCUST_RUN_TIME=40s
"""

import itertools
import json
import os
import time
import urllib.request

from locust import HttpUser, task

CONSUL = os.getenv("CONSUL_HTTP_ADDR", "http://consul:8500")
SERVICE = os.getenv("CONSUL_SERVICE", "apps-backend")
REFRESH_SECONDS = 2.0

_instances: list[str] = []
_fetched_at = 0.0
_counter = itertools.count()


def _base_urls() -> list[str]:
    """The healthy instances' base URLs, refreshed at most every REFRESH_SECONDS."""
    global _instances, _fetched_at
    if not _instances or time.monotonic() - _fetched_at > REFRESH_SECONDS:
        try:
            with urllib.request.urlopen(f"{CONSUL}/v1/health/service/{SERVICE}?passing", timeout=3) as response:
                entries = json.load(response)
            fresh = sorted(f"http://{e['Service']['Address']}:{e['Service']['Port']}" for e in entries)
            if fresh:
                _instances = fresh
        except OSError:
            pass  # keep the last known list rather than stop the load
        _fetched_at = time.monotonic()
    return _instances


class OverloadUser(HttpUser):
    wait_time = lambda self: 0  # noqa: E731 - no think time, on purpose
    host = os.getenv("HTTP_HOST", "http://localhost:8080")

    def _next_base(self) -> str:
        urls = _base_urls()
        return urls[next(_counter) % len(urls)] if urls else self.host

    def on_start(self):
        # Tokens issued by one instance are honoured by the others (they share the tokens file).
        response = self.client.post(
            f"{self._next_base()}/auth/login",
            json={"username": "demo", "password": os.getenv("DEMO_PASSWORD", "demo")},
            name="/auth/login",
        )
        self.token = response.json()["token"]

    @task
    def create_account(self):
        self.client.post(
            f"{self._next_base()}/accounts",
            json={"name": "Overload Account", "quantity": 1},
            headers={"Authorization": f"Bearer {self.token}"},
            name="/accounts",
        )
