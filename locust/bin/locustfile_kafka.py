"""Produces the same kind of account-creation events as
locustfile_http_overload.py, but onto the Kafka topic instead of directly
into the backend's REST API - the "buffered" side of the comparison demo.
kafka-bridge (make kafka:bridge-up) then drains the topic into the backend
at its own pace, decoupled from however fast this producer fires: the
broker absorbs bursts that would otherwise hit the backend/DB directly.

Not an HttpUser - there's no HTTP request to make here, so this reports
into Locust's stats via a manual request event instead (the standard way
Locust supports non-HTTP protocols).

Usage: make locust:up LOCUST_FILE=locustfile_kafka.py LOCUST_USERS=100 LOCUST_SPAWN_RATE=20
"""

import json
import os
import time

from kafka import KafkaProducer
from locust import User, events, task

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")
TOPIC = os.getenv("KAFKA_TOPIC", "quickstart-events")

_producer: KafkaProducer | None = None


def _get_producer() -> KafkaProducer:
    global _producer
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=BOOTSTRAP_SERVERS,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
        )
    return _producer


class KafkaUser(User):
    wait_time = lambda self: 0  # noqa: E731 - no think time, matching the overload scenario

    @task
    def produce_account_event(self):
        start = time.monotonic()
        try:
            _get_producer().send(TOPIC, {"name": "Kafka Load Account", "quantity": 1}).get(timeout=5)
        except Exception as exc:  # noqa: BLE001 - reported to Locust's stats, not raised
            events.request.fire(
                request_type="KAFKA",
                name="produce",
                response_time=(time.monotonic() - start) * 1000,
                response_length=0,
                exception=exc,
            )
            return
        events.request.fire(
            request_type="KAFKA",
            name="produce",
            response_time=(time.monotonic() - start) * 1000,
            response_length=0,
            exception=None,
        )
