#!/bin/sh
# Runs a test command, passes its exit code through UNCHANGED, and prints
# whether that code means "the tests failed" or "the tool broke".
#
# Usage: bin/run_test.sh <label> <report-make-target|-> -- <command> [args...]
#
# The exit code is the tool's own native one (pytest 0-5, ZAP 0-3, Locust
# 0/1/2, ...), so CI and docs written for the tool still apply. Only the
# printed classification is ours, from the per-tool table below:
#   pytest      0 ok | 1 tests failed | 2 interrupted | 3 internal error | 4 usage | 5 no tests
#   zap         0 ok | 1 FAIL finding | 2 WARN only (suppressed by -I) | 3 other/tool error
#   locust      0 ok | 1 failed requests / over LOCUST_MAX_FAIL_RATIO | 2 unhandled task exception
#   vitest, playwright, specmatic   0 ok | 1 tests failed | other = tool error
#                                   (vitest also uses 1 for some config errors)
# Repo-wide, tool-independent codes:
#   70   a setup step inside the container failed (`|| exit 70`, sysexits EX_SOFTWARE)
#   125-127 docker itself failed, 130 Ctrl+C, 137 killed (OOM / docker kill)
label=$1
report=$2
shift 3

"$@"
rc=$?

result() { # $1 = FAIL|ERROR  $2 = explanation
  if [ "$1" = FAIL ]; then
    echo "❌ [$label] TEST FAILED (exit $rc) - the tool ran; $2"
    [ "$report" != "-" ] && echo "   See the report: make $report"
  else
    echo "⚠️  [$label] TOOL ERROR (exit $rc) - $2"
    echo "   This is not a test result: check the tool's own output above and docker logs."
  fi
}

case $rc in
  0)   echo "✅ [$label] PASS"; exit 0 ;;
  130) echo "⏹  [$label] INTERRUPTED (exit 130)"; exit 130 ;;
  70)  result ERROR "a setup step (install/prepare) failed inside the container." ;;
  125|126|127) result ERROR "docker/compose itself failed (daemon down? bad compose file/command?)." ;;
  137) result ERROR "killed (SIGKILL): out of memory or 'docker kill'." ;;
  *)
    case "$label:$rc" in
      pytest:1)  result FAIL "some tests failed." ;;
      pytest:2)  result ERROR "test run interrupted." ;;
      pytest:3)  result ERROR "pytest internal error." ;;
      pytest:4)  result ERROR "pytest usage error (bad command line/config)." ;;
      pytest:5)  result ERROR "no tests were collected." ;;
      zap*:1)    result FAIL "at least one FAIL-level finding." ;;
      zap*:2)    result FAIL "warnings found." ;;
      zap*:3)    result ERROR "ZAP failed to run the scan." ;;
      locust:1)  result FAIL "failed requests (over LOCUST_MAX_FAIL_RATIO)." ;;
      locust:2)  result ERROR "unhandled exception in a task (bug in the locustfile)." ;;
      *:1)       result FAIL "tests/checks failed." ;;
      *)         result ERROR "unexpected exit code." ;;
    esac ;;
esac
exit $rc
