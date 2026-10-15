#!/bin/sh
# Uploads one test report to NASEBANAL Assurance via the `nb` CLI.
#
# Usage: bin/report_upload.sh <make-target-to-run-first> <kind> <tool> <components> <file|dir> [extra nb flags...]
#   e.g. bin/report_upload.sh pytest:test unit pytest backend pytest/report/junit.xml
#
# <components> is what the result is about: one component (frontend, backend), or several separated by
# commas (frontend,backend) for a result that covers them together. Each becomes one `--component`.
#
# <file|dir> is a JUnit XML file, or - for Locust - a directory holding
# *_stats.csv (a `locust/logs/<timestamp>` run directory, or `locust/logs`
# itself, in which case the newest run is used). `nb` reduces the report to a
# small summary client-side; only that summary is sent, never the raw file.
#
# Settings (.env or the environment):
#   NB_TOKEN            required - a PAT or service-account token for the Assurance
#                       API (`nb auth login` also works when it is unset)
#   NB_BASE_URL         Assurance API; defaults to production. Set the URL of a
#                       local `npm run dev` of nb-assurance-api to report there
#   PROJECT_NAME        Assurance project name (default: nb-quickstarts); created
#                       on first upload
#   NB_RUN_KEY          optional - group several uploads into one run (default:
#                       local-<commit>-<day>, so everything uploaded today for
#                       the same commit lands in one run). `make all:report-upload`
#                       sets one key per call instead (commit + UTC time), so each
#                       call is a new run and adds a point to the trend
#   NB_API_VERSION      optional - the API version the run is about (v1, v2) when
#                       the repository serves several (/v1, /v2). It labels every
#                       kind except unit tests, which hold for all versions. The components
#                       stay as they are: the version is part of the result's identity, so v1
#                       and v2 of one component sit side by side in a run.
#                       One-off: make specmatic:report-upload NB_API_VERSION=v2
label=$1
kind=$2
tool=$3
components=$4
target=$5
shift 5 2>/dev/null || shift $#
# What is left is passed to nb as is (e.g. --metric high=0 for a ZAP scan).

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli, from the public npm registry) or npm link a local nb-cli. See README, 'The nb CLI'."
  exit 1
fi

# NB_TOKEN, a stored 'nb auth login' session, or - with neither - a browser login.
"$(dirname "$0")/ensure_nb_auth.sh" || exit 1

NB_BASE_URL=${NB_BASE_URL:-https://api.assurance.nasebanal.com}
export NB_BASE_URL
project=${PROJECT_NAME:-nb-quickstarts}

# A version labels the result; unit tests are the same for every version, so they carry none.
version_flag=""
if [ -n "${NB_API_VERSION:-}" ] && [ "$kind" != "unit" ]; then
  version_flag="--api-version $NB_API_VERSION"
fi

# One --component per name (the names have no spaces).
component_flags=""
old_ifs=$IFS
IFS=,
for c in $components; do
  component_flags="$component_flags --component $c"
done
IFS=$old_ifs

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
# shellcheck disable=SC2086  # $input is "--file x" / "--dir x", $component_flags "--component a --component b" and $version_flag "--api-version v2" on purpose; none has spaces in a value
nb assurance report upload $input --kind "$kind" --tool "$tool" $component_flags $version_flag --project "$project" \
  ${NB_RUN_KEY:+--run-key "$NB_RUN_KEY"} "$@"
