"""A client that finds its backend through Consul - client-side load balancing.

Every request it does two things, the whole idea of service discovery:

  1. ask Consul who is healthy right now (GET /v1/health/service/apps-backend?passing)
  2. pick one of them and call it

No backend address is written down anywhere: a new instance shows up in step 1
as soon as it is registered and healthy, and a dead one disappears as soon as
its health check fails. Instances are taken in turn (round robin); if a chosen
one does not answer - it died between Consul's last check and this request -
the client just tries the next healthy one, which is the other half of what a
client-side balancer does.

Who really answered is read from the X-Served-By response header the backend
adds, not assumed from the address that was called.

Usage (inside apps-network; `make consul:lb-demo` does that):
    python lb_demo.py [requests=12] [interval_seconds=0.3]
"""

import collections
import json
import os
import sys
import time
import urllib.error
import urllib.request

CONSUL = os.environ.get("CONSUL_HTTP_ADDR", "http://consul:8500")
SERVICE = os.environ.get("CONSUL_SERVICE", "apps-backend")


def healthy_instances() -> list[dict]:
    with urllib.request.urlopen(f"{CONSUL}/v1/health/service/{SERVICE}?passing", timeout=3) as response:
        entries = json.load(response)
    instances = [
        {"id": e["Service"]["ID"], "address": e["Service"]["Address"], "port": e["Service"]["Port"]}
        for e in entries
    ]
    return sorted(instances, key=lambda i: i["id"])


def call(instance: dict) -> tuple[int, str, float]:
    started = time.monotonic()
    with urllib.request.urlopen(f"http://{instance['address']}:{instance['port']}/health", timeout=1) as response:
        served_by = response.headers.get("X-Served-By", "?")
        return response.status, served_by, (time.monotonic() - started) * 1000


def main() -> None:
    total = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    interval = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
    answered: collections.Counter = collections.Counter()
    retries = 0
    unanswered = 0

    for n in range(1, total + 1):
        instances = healthy_instances()
        names = ", ".join(i["id"].removeprefix("apps-") for i in instances) or "none"
        if not instances:
            print(f"#{n:02d}  no healthy instance in Consul", flush=True)
            unanswered += 1
            time.sleep(interval)
            continue
        # Round robin over whoever is healthy *now*; on a failure, move on to the next one.
        start = (n - 1) % len(instances)
        for attempt in range(len(instances)):
            instance = instances[(start + attempt) % len(instances)]
            try:
                status, served_by, ms = call(instance)
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                retries += 1
                print(f"#{n:02d}  {instance['id'].removeprefix('apps-'):<10} FAILED ({exc.__class__.__name__}) - trying the next one", flush=True)
                continue
            answered[served_by] += 1
            print(f"#{n:02d}  {served_by:<10} HTTP {status}  {ms:4.0f}ms   healthy in Consul: {names}", flush=True)
            break
        else:
            unanswered += 1
            print(f"#{n:02d}  every healthy instance failed", flush=True)
        time.sleep(interval)

    print()
    print("Answered by:  " + "   ".join(f"{name}: {count}" for name, count in sorted(answered.items())))
    print(f"Retries: {retries}   Requests nobody answered: {unanswered}")


if __name__ == "__main__":
    main()
