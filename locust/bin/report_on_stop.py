"""Writes the --html report the moment a run actually stops (the Web UI's
Stop button, or a headless run's --run-time elapsing) instead of waiting for
the whole Locust process to exit.

Locust's own --html writer (locust/main.py's save_html_report()) only runs
after main_greenlet.join() returns or on KeyboardInterrupt - never on
SIGTERM. `make locust:down` sends SIGTERM (via `docker compose down`), whose
handler (sig_term_handler -> shutdown()) calls runner.quit() and exits
without ever calling save_html_report() - confirmed empirically: a UI-mode
run stopped only via `locust:down` never got a report.html, even though the
run itself produced real stats (locust_stats*.csv kept updating throughout).

runner.stop() (called by clicking "Stop" in the UI, by a headless run's
--run-time timer, and by quit() itself when a run is still active) fires the
`test_stop` event unconditionally - unlike process exit, this doesn't depend
on how the process is asked to end. Hooking that event instead means a
report is written as soon as a run actually finishes, whether or not the
container is ever brought down afterward, and whether it's stopped via the
UI, run-time, Ctrl+C, or a `locust:down` sent while a run is still active.

Import this module (for its side effect) from any locustfile that passes
--html (see locust/docker-compose.yml's LOCUST_HTML_FILE) and should support
this. A worker process's own copy of this listener no-ops harmlessly: only
the master's command line ever carries --html, so parsed_options.html_file
is None there.
"""

from locust.html import get_html_report, process_html_filename

from locust import events


@events.test_stop.add_listener
def _write_html_report_on_stop(environment, **kwargs):
    options = getattr(environment, "parsed_options", None)
    html_file = getattr(options, "html_file", None)
    if not html_file:
        return
    process_html_filename(options)
    report = get_html_report(environment, show_download_link=False)
    with open(options.html_file, "w", encoding="utf-8") as file:
        file.write(report)
