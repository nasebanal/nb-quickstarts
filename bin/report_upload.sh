#!/bin/sh
# Uploads one test report to NASEBANAL Assurance via the `nb` CLI.
#
# Usage: bin/report_upload.sh <make-target-to-run-first> <kind> <tool> <suite> <file|dir>
#   e.g. bin/report_upload.sh pytest:test unit pytest backend pytest/report/junit.xml
#
# <file|dir> is a JUnit XML file, or - for Locust - a directory holding
# *_stats.csv (a `locust/logs/<timestamp>` run directory, or `locust/logs`
# itself, in which case the newest run is used). `nb` reduces the report to a
# small summary client-side; only that summary is sent, never the raw file.
#
# Settings (.env or the environment):
#   NB_TOKEN            required - a PAT or service-account token for the Assurance
#                       API (`nb auth login` also works when it is unset)
#   NB_BASE_URL         Assurance API; defaults to the local `npm run dev` of
#                       nb-assurance-api (http://localhost:8791)
#   ASSURANCE_PROJECT   Assurance project name (default: nb-quickstarts); created
#                       on first upload
#   NB_RUN_KEY          optional - group several uploads into one run (default:
#                       local-<commit>-<day>, so everything uploaded today for
#                       the same commit lands in one run)
label=$1
kind=$2
tool=$3
suite=$4
target=$5

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli) or link nb-cli."
  exit 1
fi

# NB_TOKEN, a stored 'nb auth login' session, or - with neither - a browser login.
"$(dirname "$0")/ensure_nb_auth.sh" || exit 1

NB_BASE_URL=${NB_BASE_URL:-http://localhost:8791}
export NB_BASE_URL
project=${ASSURANCE_PROJECT:-nb-quickstarts}

if [ -d "$target" ]; then
  # Locust: nb takes a run directory; pick the newest one under locust/logs.
  if ! ls "$target"/*_stats.csv >/dev/null 2>&1; then
    newest=$(ls -1d "$target"/*/ 2>/dev/null | sort | tail -1)
    target=${newest%/}
  fi
  input="--dir $target"
else
  input="--file $target"
fi

if [ -z "$target" ] || { [ ! -e "$target" ]; }; then
  echo "No report yet - run 'make $label' first."
  exit 1
fi

echo "Uploading $label report ($target) to $NB_BASE_URL, project '$project'..."
# shellcheck disable=SC2086  # $input is "--file x" / "--dir x" on purpose; paths here have no spaces
nb assurance report upload $input --kind "$kind" --tool "$tool" --suite "$suite" --project "$project" \
  ${NB_RUN_KEY:+--run-key "$NB_RUN_KEY"}
