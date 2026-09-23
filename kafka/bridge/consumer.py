"""Bridges Kafka events into apps/backend's REST API.

Deliberately lives here in the kafka module, as its own container, instead
of inside apps/backend - so apps/backend has zero Kafka dependency and a
Kafka outage can never affect it, and so this bridge can point at any REST
backend via KAFKA_BRIDGE_TARGET_URL (not hardcoded to apps), matching this
repo's convention that test/integration tools read their target host from
env vars only.

Two distinct failure modes, handled two different ways:
  - Transient (Kafka unreachable, backend unreachable, a rejected request):
    retried forever with backoff, never a crash. The Kafka offset for a
    message is committed only *after* it has been successfully POSTed - so
    an outage pauses ingestion (Kafka durably retains the backlog) rather
    than losing events.
  - Permanent (a message that isn't valid JSON, or is missing `name`/
    `quantity`): logged and skipped - retrying it forever would only ever
    deadlock the whole pipeline behind one bad message, since no amount of
    retrying makes invalid input valid. Its offset is committed too, same
    as a successfully-delivered one, so the bridge moves on.
"""

import json
import logging
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import requests
from kafka.errors import KafkaError

from kafka import KafkaConsumer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("kafka-bridge")

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")
TOPIC = os.environ.get("KAFKA_TOPIC", "quickstart-events")
GROUP_ID = os.environ.get("KAFKA_CONSUMER_GROUP", "nb-quickstarts-bridge")
TARGET_URL = os.environ.get("KAFKA_BRIDGE_TARGET_URL", "http://backend:8080")
BRIDGE_USERNAME = os.environ.get("KAFKA_BRIDGE_USERNAME", "kafka-bridge")
RETRY_SECONDS = float(os.environ.get("KAFKA_BRIDGE_RETRY_SECONDS", "3"))
HEALTH_PORT = int(os.environ.get("KAFKA_BRIDGE_HEALTH_PORT", "8090"))

_token: str | None = None

# Read by _HealthHandler, written from the main loop/_login/_connect_consumer.
# Plain dict writes/reads of these simple values are already atomic under the
# GIL, so no lock is needed between the health server's thread and main().
_status = {"kafka_connected": False, "backend_reachable": False}


def _login() -> str:
    """Fetches (or reuses) a bearer token for POST /accounts. Retries forever -
    the backend may not be up yet, or may be temporarily unreachable."""
    global _token
    if _token:
        return _token
    while True:
        try:
            response = requests.post(
                f"{TARGET_URL}/auth/login", json={"username": BRIDGE_USERNAME}, timeout=5
            )
            response.raise_for_status()
            _token = response.json()["token"]
            _status["backend_reachable"] = True
            log.info("Logged in to %s as %s", TARGET_URL, BRIDGE_USERNAME)
            return _token
        except requests.RequestException as exc:
            _status["backend_reachable"] = False
            log.warning("Backend not reachable at %s yet (%s) - retrying in %ss", TARGET_URL, exc, RETRY_SECONDS)
            time.sleep(RETRY_SECONDS)


class InvalidEvent(Exception):
    """Raised for a message that can never be valid, no matter how many
    times it's retried - not valid JSON, or missing a required field."""


def _parse(raw: bytes) -> dict:
    try:
        event = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidEvent(f"not valid JSON: {exc}") from exc
    if not isinstance(event, dict) or "name" not in event:
        raise InvalidEvent(f"missing required field 'name': {event!r}")
    return {"name": event["name"], "quantity": event.get("quantity", 0)}


def _forward(event: dict) -> bool:
    """POSTs one event to /accounts. Returns True on success. A 401 clears the
    cached token so the next attempt re-logs in (e.g. after a backend
    restart, which wipes its in-memory token store)."""
    global _token
    token = _login()
    try:
        response = requests.post(
            f"{TARGET_URL}/accounts",
            json={"name": event["name"], "quantity": event["quantity"]},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        if response.status_code == 401:
            log.warning("Token rejected (backend likely restarted) - re-logging in")
            _token = None
            return False
        response.raise_for_status()
        _status["backend_reachable"] = True
        log.info("Forwarded event %s -> balance event recorded", event)
        return True
    except requests.RequestException as exc:
        _status["backend_reachable"] = False
        log.warning("Failed to forward %s to %s (%s) - will retry", event, TARGET_URL, exc)
        return False


def _connect_consumer() -> KafkaConsumer:
    """Connects to Kafka. Retries forever - the kafka module may not be up
    yet, or may be temporarily unreachable."""
    while True:
        try:
            consumer = KafkaConsumer(
                TOPIC,
                bootstrap_servers=BOOTSTRAP_SERVERS,
                group_id=GROUP_ID,
                auto_offset_reset="earliest",
                enable_auto_commit=False,
                # No value_deserializer: parsing happens explicitly in
                # main()'s loop instead, so a malformed message's parse
                # error is caught per-message (and that message skipped)
                # rather than raised from inside the consumer's own fetch
                # machinery, where it isn't a KafkaError and would crash
                # the whole process instead.
                consumer_timeout_ms=5000,
            )
            log.info("Connected to Kafka at %s, topic=%s", BOOTSTRAP_SERVERS, TOPIC)
            _status["kafka_connected"] = True
            return consumer
        except KafkaError as exc:
            _status["kafka_connected"] = False
            log.warning("Kafka not reachable at %s yet (%s) - retrying in %ss", BOOTSTRAP_SERVERS, exc, RETRY_SECONDS)
            time.sleep(RETRY_SECONDS)


class _HealthHandler(BaseHTTPRequestHandler):
    """GET /health -> 200 {"status": "ok", kafka_connected, backend_reachable}
    - proof kafka-bridge is running at all (always 200 while the process is
    alive - a liveness check, not a readiness one), with the two flags
    giving more detail than just "the container is running". Exists only so
    apps/frontend can show "is kafka-bridge up" in the UI - see api.ts's
    checkKafkaBridge() - deliberately not on apps/backend or routed through
    it, so apps/backend's zero-Kafka-dependency guarantee (see this
    module's own docstring) stays exactly that.
    """

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's naming convention
        if self.path != "/health":
            self.send_response(404)
            self.end_headers()
            return
        body = json.dumps({"status": "ok", **_status}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        # Browser JS calls this directly (cross-origin from apps/frontend,
        # not proxied through the backend or Kong), so it needs its own
        # CORS header - nothing here is sensitive, so a wildcard is fine.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002 - stdlib's signature
        pass  # Quiet by default - every health check would otherwise log a line.


def _start_health_server() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", HEALTH_PORT), _HealthHandler)  # noqa: S104 - container-internal
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log.info("Health check listening on :%d/health", HEALTH_PORT)


def main() -> None:
    _start_health_server()
    consumer = _connect_consumer()
    while True:
        try:
            for message in consumer:
                try:
                    event = _parse(message.value)
                except InvalidEvent as exc:
                    log.warning("Skipping unprocessable message at offset %s: %s", message.offset, exc)
                    consumer.commit()
                    continue
                # Retry the same message until it's actually recorded -
                # never advance the offset past a message we couldn't
                # deliver.
                while not _forward(event):
                    time.sleep(RETRY_SECONDS)
                consumer.commit()
        except KafkaError as exc:
            _status["kafka_connected"] = False
            log.warning("Lost connection to Kafka (%s) - reconnecting", exc)
            consumer = _connect_consumer()


if __name__ == "__main__":
    main()
