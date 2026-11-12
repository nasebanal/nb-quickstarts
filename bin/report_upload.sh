#!/bin/sh
# Uploads one test report to NASEBANAL Assurance via the `nb` CLI.
#
# Usage: bin/report_upload.sh <make-target-to-run-first> <kind> <tool> <components> <file|dir> [extra nb flags...]
#   e.g. bin/report_upload.sh pytest:test unit pytest api pytest/report/junit.xml
#
# <components> is what the result is about: one component (web, api, mobile) - the component part of the
# repository's key in the catalog. A comma list (web,api) uploads the same file once per component.
#
# Since nb 0.13.0 a result is reported to a *spec* of the catalog (NASEBANAL Evolution) that is tied to a
# repository; nothing is created by an upload. Register once (nb specs repositories upsert / nb specs specs push),
# then either name the spec by ids or let this script name it by names (see below).
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
#   NB_SPEC_ID_<COMPONENT>  the spec to report to, by id, per component: NB_SPEC_ID_WEB, NB_SPEC_ID_API,
#                       NB_SPEC_ID_MOBILE (wins over the names below)
#   NB_REPOSITORY       by names: the repository (default: nasebanal/nb-quickstarts); with the component
#                       it is the repository row the spec must be tied to
#   NB_SPEC             by names: the spec's name in the catalog (default: nb-quickstarts-<component>)
#   NB_GROUP            by names, optional: the catalog group the spec is filed in (none = no group)
#   NB_SPECS_ORG        optional: the organization whose specs these are (default: personal)
#   NB_RUN_KEY          optional - group several uploads into one run (default:
#                       local-<commit>-<day>, so everything uploaded today for
#                       the same commit lands in one run). `make all:report-upload`
#                       sets one key per call instead (commit + UTC time), so each
#                       call is a new run and adds a point to the trend
#   NB_API_VERSION      optional - the API version the run is about (v1, v2) when
#                       the repository serves several (/v1, /v2). It labels every
#                       kind except unit tests, which hold for all versions. It selects the spec
#                       by names (a new major API version is a new spec).
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

# A version labels the result; unit tests are the same for every version, so they carry none.
version_flag=""
if [ -n "${NB_API_VERSION:-}" ] && [ "$kind" != "unit" ]; then
  version_flag="--api-version $NB_API_VERSION"
fi

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

# Where the result goes: --spec-id when NB_SPEC_ID_<COMPONENT> is set, else the names.
upload_component() {
  c=$1
  var="NB_SPEC_ID_$(printf '%s' "$c" | tr '[:lower:]-' '[:upper:]_')"
  id=$(eval "printf '%s' \"\${$var:-}\"")
  if [ -n "$id" ]; then
    spec_flags="--spec-id $id"
    where="spec $id ($c)"
  else
    spec_flags="--repository ${NB_REPOSITORY:-nasebanal/nb-quickstarts} --component $c --spec ${NB_SPEC:-nb-quickstarts-$c}"
    [ -n "${NB_GROUP:-}" ] && spec_flags="$spec_flags --group $NB_GROUP"
    where="${NB_REPOSITORY:-nasebanal/nb-quickstarts} / $c / ${NB_SPEC:-nb-quickstarts-$c}"
  fi
  echo "Uploading $label report ($target) to $NB_BASE_URL, $where..."
  # shellcheck disable=SC2086  # $input ("--file x" / "--dir x"), $spec_flags and $version_flag are word lists on purpose; none has spaces in a value
  nb assurance report upload $input --kind "$kind" --tool "$tool" $spec_flags $version_flag \
    ${NB_SPECS_ORG:+--org "$NB_SPECS_ORG"} ${NB_RUN_KEY:+--run-key "$NB_RUN_KEY"} "$@"
}

rc=0
old_ifs=$IFS
IFS=,
for c in $components; do
  IFS=$old_ifs
  upload_component "$c" "$@" || rc=1
  IFS=,
done
IFS=$old_ifs
exit $rc
