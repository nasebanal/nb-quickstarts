#!/bin/sh
# Registers the shared OpenAPI contract (shared/openapi/openapi.yaml) in the NASEBANAL Evolution catalog
# (nb specs specs push), as the spec that `make <module>:report-upload` reports to.
#
# Usage: bin/evolution_register.sh [--dry-run]
#
# Settings (.env or the environment): NB_REPOSITORY (default nasebanal/nb-quickstarts - set your own
# owner/name to use your own catalog), NB_SPEC (default: the contract's info.title,
# NASEBANAL Quickstarts API), NB_GROUP, NB_SPECS_ORG,
# NB_TOKEN / NB_ASSURANCE_BASE_URL (see report_upload.sh), EVOLUTION_OPENAPI_FILE (default:
# shared/openapi/openapi.yaml). Safe to repeat: the same document uploads nothing.

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli, from the public npm registry). See README, 'The nb CLI'."
  exit 1
fi


# --dry-run (make evolution:check): say who is signed in before anything else.
if [ "$1" = "--dry-run" ]; then
  echo "Session:"
  if [ -n "$NB_TOKEN" ]; then
    echo "  credentials: NB_TOKEN (environment)"
  else
    status=$(nb auth status 2>&1)
    printf '%s\n' "$status" | sed -n -e 's/^Environment: */  environment: /p' -e 's/^Token:.*\[source: \(.*\)\].*/  credentials: \1/p' -e 's/^Expires: */  expires:     /p'
    if printf '%s\n' "$status" | grep -q 'source: none'; then
      echo "  not signed in - the login opens next (nb auth login)"
    fi
  fi
fi

"$(dirname "$0")/ensure_nb_auth.sh" || exit 1

if [ "$1" = "--dry-run" ]; then
  me=$(nb assurance me get 2>/dev/null)
  name=$(printf '%s\n' "$me" | sed -n 's/.*"name": *"\(.*\)".*/\1/p' | head -1)
  email=$(printf '%s\n' "$me" | sed -n 's/.*"email": *"\(.*\)".*/\1/p' | head -1)
  if [ -n "$email" ]; then echo "  user:        $name <$email>"; else echo "  user:        (could not read the profile)"; fi
  echo ""
fi

# The checked-in shared contract: the document apps:up documents at /api-specs and specmatic:test checks
# the backend against. Not the running backend's own /openapi.json (FastAPI's generated, thin one).
file=${EVOLUTION_OPENAPI_FILE:-shared/openapi/openapi.yaml}
repo=${NB_REPOSITORY:-nasebanal/nb-quickstarts}

if [ ! -f "$file" ]; then
  echo "❌ $file not found (EVOLUTION_OPENAPI_FILE)."
  exit 1
fi
# The spec's name is the contract's own title unless NB_SPEC says otherwise: the same name nb would pick,
# and the one report_upload.sh looks the spec up by.
title=$(sed -n 's/^  title: *//p' "$file" | head -n1 | tr -d '"')
spec=${NB_SPEC:-${title:-nb-quickstarts}}

# The catalog's host, as nb resolves it: NB_SPECS_BASE_URL, else by NB_ENV.
catalog_url=${NB_SPECS_BASE_URL:-}
if [ -z "$catalog_url" ]; then
  if [ "${NB_ENV:-}" = "local" ]; then catalog_url=http://localhost:8792; else catalog_url=https://api.specs.nasebanal.com; fi
fi
catalog_host=${catalog_url#*://}; catalog_host=${catalog_host%%[/:]*}
case "$catalog_host" in localhost|127.0.0.1) catalog_kind=local ;; nasebanal.com|*.nasebanal.com) catalog_kind=production ;; *) catalog_kind=other ;; esac
echo "Registering $file as spec '$spec' of $repo in the $catalog_kind catalog ($catalog_url)..."
# shellcheck disable=SC2086  # the optional flags are word lists on purpose
nb specs specs push --file "$file" --name "$spec" --repository "$repo" \
  ${NB_GROUP:+--group "$NB_GROUP"} ${NB_SPECS_ORG:+--org "$NB_SPECS_ORG"} "$@"
