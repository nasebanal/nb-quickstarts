#!/bin/sh
# Prints when the newest of the given test reports was RUN, from the time written inside the report, as
# YYYYMMDD-HHMMSS (UTC). bin/report_upload.sh and `make all:report-upload` build the run key from it, so sending
# the same report again replaces its result instead of adding a run.
#
# Usage: bin/report_time.sh <report>...
#
# A <report> is a JUnit XML file (its `timestamp` attributes), a ZAP *-report.json ("created"), or - for Locust -
# a run directory (or locust/logs, meaning the newest run in it; the first row of *_stats_history.csv). A path that
# does not exist or carries no time is ignored. Exits 1, printing nothing, when none has a time. The file's
# modification time is deliberately not used: a copy or a re-conversion (ZAP's JUnit file) changes it.
case "${1:-}" in -h|--help) sed -n '2,/^[^#]/{/^[^#]/d;s/^# \{0,1\}//;p;}' "$0"; exit 0 ;; esac

# 2026-11-26T03:56:13.172+00:00 -> 20261126-035613 (the reports write UTC)
compact() {
  sed -n 's/^\([0-9]\{4\}\)-\([0-9][0-9]\)-\([0-9][0-9]\)T\([0-9][0-9]\):\([0-9][0-9]\):\([0-9][0-9]\).*/\1\2\3-\4\5\6/p'
}

from_epoch() {
  date -u -r "$1" +%Y%m%d-%H%M%S 2>/dev/null || date -u -d "@$1" +%Y%m%d-%H%M%S 2>/dev/null
}

times_of() {
  path=$1
  if [ -d "$path" ]; then
    if ! ls "$path"/*_stats.csv >/dev/null 2>&1; then
      path=$(ls -1d "$path"/*/ 2>/dev/null | sort | tail -1)
      path=${path%/}
    fi
    for csv in "$path"/*_stats_history.csv; do
      [ -f "$csv" ] || continue
      epoch=$(sed -n '2{s/,.*//;p;}' "$csv")
      case "$epoch" in ''|*[!0-9]*) ;; *) from_epoch "$epoch" ;; esac
    done
    return
  fi
  [ -f "$path" ] || return
  case "$path" in
    *.json) grep -o '"created"[[:space:]]*:[[:space:]]*"[^"]*"' "$path" | sed 's/.*:[[:space:]]*"//;s/"$//' | compact ;;
    *) grep -o '[[:space:]]timestamp="[^"]*"' "$path" | sed 's/.*timestamp="//;s/"$//' | compact ;;
  esac
}

newest=$(for report in "$@"; do times_of "$report"; done | sort | tail -1)
[ -n "$newest" ] || exit 1
printf '%s\n' "$newest"
