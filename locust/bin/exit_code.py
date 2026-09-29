"""Applies a failure threshold to Locust's own exit codes (0 = ok, 1 = failed
requests, 2 = unhandled task exception; see --exit-code-on-error and
"Changing the exit code" in the Locust docs). bin/run_test.sh reports them.

By default Locust exits 1 on any single failed request; here:
  - a failure ratio above LOCUST_MAX_FAIL_RATIO (default 0 = no failure
    tolerated) -> 1 (test result: NG)
  - an unhandled exception inside a task (a bug in the locustfile, not a
    failed request - those go through events.request) -> 2 (Locust's own code for an unhandled exception)
  - otherwise -> 0
Import this module (for its side effect) from every locustfile, next to
report_on_stop. Only the master/local runner decides; workers are skipped.
"""

import logging
import os

from locust.runners import WorkerRunner

from locust import events

TEST_FAILED = 1
UNHANDLED_EXCEPTION = 2


@events.quitting.add_listener
def _set_exit_code(environment, **kwargs):
    if isinstance(environment.runner, WorkerRunner):
        return
    log = logging.getLogger("exit_code")
    exceptions = getattr(environment.runner, "exceptions", None)
    if exceptions:
        log.error("%d unhandled task exception(s): unhandled (locust_exceptions.csv)", len(exceptions))
        environment.process_exit_code = UNHANDLED_EXCEPTION
        return
    max_ratio = float(os.getenv("LOCUST_MAX_FAIL_RATIO", "0"))
    stats = environment.stats.total
    if stats.fail_ratio > max_ratio:
        log.error("failure ratio %.1f%% > allowed %.1f%%: TEST FAILED", stats.fail_ratio * 100, max_ratio * 100)
        environment.process_exit_code = TEST_FAILED
    else:
        environment.process_exit_code = 0
