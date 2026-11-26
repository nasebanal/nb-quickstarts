#!/bin/sh
# Uploads one test report to NASEBANAL Assurance via the `nb` CLI.
#
# Usage: bin/report_upload.sh <make-target-to-run-first> <kind> <tool> <components> <file|dir> [extra nb flags...]
#   e.g. bin/report_upload.sh pytest:test unit pytest api pytest/report/junit.xml
#
# Assurance tells results of one run apart by kind and sub-kind (--label) only: not by tool, and not by the
# component below, which only picks the spec. Two results of one kind therefore need different labels, or the
# later one replaces the earlier (and the dashboard shows only one of them): the modules whose kind another one
# also reports pass --label api / web (unit: pytest and vitest; contract: Specmatic and vitest), ZAP its scan.
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
# small summary client-side; only that summary is sent, never the raw file -
# unless NB_ATTACH_REPORTS=1 (below).
#
# Settings (.env or the environment):
#   NB_TOKEN            required - a PAT or service-account token for the Assurance
#                       API (`nb auth login` also works when it is unset)
#   NB_ASSURANCE_BASE_URL  Assurance API (not the web UI); defaults to production (nb 0.14.0 or later)
#   NB_SPEC_ID_<COMPONENT>  the spec to report to, by id, per component: NB_SPEC_ID_WEB, NB_SPEC_ID_API,
#                       NB_SPEC_ID_MOBILE (wins over the names below)
#   NB_REPOSITORY       by names: the repository (default: nasebanal/nb-quickstarts)
#   NB_SPEC             by names: the spec's name in the catalog (default: the contract's info.title, NASEBANAL
#                       Quickstarts API - one spec for the repository as a whole, registered with
#                       `make evolution:register`)
#   NB_SPEC_PER_COMPONENT=1  one spec per component instead (repository row + component, spec
#                       nb-quickstarts-<component>), the org-wide web / api naming; register them yourself
#   NB_GROUP            by names, optional: the catalog group the spec is filed in (none = no group)
#   NB_SPECS_ORG        optional: the organization whose specs these are (default: personal)
#   NB_RUN_KEY          optional - group several uploads into one run (default:
#                       local-<commit>-<day the report was RUN, UTC>, so the tools
#                       run on one day for the same commit land in one run, and a
#                       report sent again - even another day - replaces its result.
#                       CI: nb's own key). `make all:report-upload` sets one key per
#                       call instead (commit + the time of the newest report), so
#                       running the tests again adds a point to the trend and
#                       uploading the same reports again does not
#   NB_API_VERSION      optional - the API version of the spec to report to (v1, v2) when
#                       the repository has specs of several versions. It selects the spec
#                       by names, for every kind (a new major API version is a new spec;
#                       the version comes from the contract's info.version, 1.0.0 -> v1).
#                       One-off: make specmatic:report-upload NB_API_VERSION=v2
#   NB_ATTACH_REPORTS=1  optional, off by default - also send the tool's own report
#                       (`nb ... --attach-if-enabled`, nb 1.2.0 or later), which Evolution then offers for
#                       download. It is sent only when the catalog repository allows it (Repository Management ->
#                       Attaching original reports); otherwise the result is uploaded, the report stays here, nb
#                       says so and the upload succeeds. A report can hold tokens, cookies or request data: look
#                       at it first. A folder is sent as a zip; up to 20 MiB (over it, that upload fails)
#   REPORT_ORIGINAL     set by each module's Makefile, not by you: the report to attach (a file or a folder). A
#                       Locust run directory needs none (its report.html is used)
case "${1:-}" in -h|--help) sed -n '2,/^[^#]/{/^[^#]/d;s/^# \{0,1\}//;p;}' "$0"; exit 0 ;; esac

label=$1
kind=$2
tool=$3
components=$4
target=$5
shift 5 2>/dev/null || shift $#
# What is left is passed to nb as is (e.g. --metric high=0 for a ZAP scan).

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli, from the public npm registry). See README, 'The nb CLI'."
  exit 1
fi

# NB_TOKEN, a stored 'nb auth login' session, or - with neither - a browser login.
"$(dirname "$0")/ensure_nb_auth.sh" || exit 1


# The version selects the spec (a new major API version is a new spec) - for every kind, unit tests
# included: once a repository has specs of two versions, a name alone no longer says which one.
version_flag=""
if [ -n "${NB_API_VERSION:-}" ]; then
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

# NB_ATTACH_REPORTS=1: send the tool's own report with the result. A missing one is not a failure - the
# summary still goes up.
if [ "${NB_ATTACH_REPORTS:-}" = 1 ]; then
  # An older nb does not know the option; say what to do instead of its "unknown option".
  if ! nb assurance report upload --help 2>/dev/null | grep -q -- '--attach-if-enabled'; then
    echo "❌ NB_ATTACH_REPORTS=1 needs nb 1.2.0 or later (this is $(nb --version 2>/dev/null || echo unknown)): npm i -g @nasebanal/cli"
    exit 1
  fi
  original=${REPORT_ORIGINAL:-}
  if [ -z "$original" ] && [ -d "$target" ]; then original=$target/report.html; fi
  if [ -n "$original" ] && [ -e "$original" ]; then
    echo "Attaching the original report: $original"
    set -- "$@" --attach-if-enabled "$original"
  else
    echo "⚠️  No original report to attach (${original:-none}) - uploading the summary only."
  fi
fi

# The run key comes from when the report was run, not from when it is uploaded (bin/report_time.sh). In CI nb
# derives the key from the pipeline run; a report with no time in it also keeps nb's default.
if [ -z "${NB_RUN_KEY:-}" ] && [ -z "${GITHUB_RUN_ID:-}" ] && [ -z "${CI_PIPELINE_ID:-}" ]; then
  if ran=$("$(dirname "$0")/report_time.sh" "$target"); then
    commit=$(git rev-parse --short=7 HEAD 2>/dev/null || true)
    NB_RUN_KEY="local-${commit:+$commit-}${ran%-*}"
  fi
fi

# The default spec name is the contract's own title (NASEBANAL Quickstarts API) - what
# `nb specs specs push` names a spec by when no --name is given, so the catalog and the uploads agree.
default_spec_name() {
  t=$(sed -n 's/^  title: *//p' "$(dirname "$0")/../shared/openapi/openapi.yaml" 2>/dev/null | head -n1 | tr -d '"')
  printf '%s' "${t:-nb-quickstarts}"
}

# Where the result goes: --spec-id when NB_SPEC_ID_<COMPONENT> is set, else the names. The spec
# arguments are built as positional parameters (not a word list) because a name has spaces.
upload_component() {
  c=$1; shift
  var="NB_SPEC_ID_$(printf '%s' "$c" | tr '[:lower:]-' '[:upper:]_')"
  id=$(eval "printf '%s' \"\${$var:-}\"")
  if [ -n "$id" ]; then
    set -- --spec-id "$id" "$@"
    where="spec $id ($c)"
  else
    repo=${NB_REPOSITORY:-nasebanal/nb-quickstarts}
    if [ "${NB_SPEC_PER_COMPONENT:-}" = 1 ]; then
      spec=${NB_SPEC:-nb-quickstarts-$c}
      set -- --repository "$repo" --component "$c" --spec "$spec" "$@"
    else
      # Default: one spec for the repository as a whole (what `make evolution:register` creates).
      spec=${NB_SPEC:-$(default_spec_name)}
      set -- --repository "$repo" --spec "$spec" "$@"
    fi
    if [ -n "${NB_GROUP:-}" ]; then set -- --group "$NB_GROUP" "$@"; fi
    where="$repo / $spec"
  fi
  # The host nb will call, as nb resolves it: NB_ASSURANCE_BASE_URL (the older NB_BASE_URL still counts), else by NB_ENV.
  assurance_url=${NB_ASSURANCE_BASE_URL:-${NB_BASE_URL:-}}
  if [ -z "$assurance_url" ]; then
    if [ "${NB_ENV:-}" = "local" ]; then assurance_url=http://localhost:8791; else assurance_url=https://api.assurance.nasebanal.com; fi
  fi
  assurance_host=${assurance_url#*://}; assurance_host=${assurance_host%%[/:]*}
  case "$assurance_host" in localhost|127.0.0.1) assurance_kind=local ;; nasebanal.com|*.nasebanal.com) assurance_kind=production ;; *) assurance_kind=other ;; esac
  echo "Uploading $label report ($target) to $assurance_kind Assurance ($assurance_url), $where..."
  # shellcheck disable=SC2086  # $input ("--file x" / "--dir x") and $version_flag are word lists on purpose; none has spaces in a value
  nb assurance report upload $input --kind "$kind" --tool "$tool" $version_flag \
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
