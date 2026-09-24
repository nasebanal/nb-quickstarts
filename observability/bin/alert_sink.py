"""Minimal Alertmanager webhook receiver: prints one line per alert.

Stands in for Slack/email/PagerDuty so the whole alert path (rule ->
Prometheus -> Alertmanager -> notification) can be seen end to end locally,
with no external account. `make observability:alerts` shows what it received.
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        for alert in body.get("alerts", []):
            print(
                f"[{alert['status'].upper()}] {alert['labels'].get('alertname')} "
                f"({alert['labels'].get('severity')}) - {alert['annotations'].get('summary')}",
                flush=True,
            )
        self.send_response(200)
        self.end_headers()

    def log_message(self, *args):  # keep stdout to alerts only
        pass


HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
