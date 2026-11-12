#!/bin/sh
# Checks that the host tools a target needs are there and, when not, says what
# to do about it (instead of a bare "command not found" halfway through).
#
# Usage: bin/require.sh <tool> [<tool>...]
#   docker   the docker CLI AND a running Docker Engine (checked with `docker info`)
#   nb       the NASEBANAL CLI
#   node     Node.js (runs bin/*.mjs)
#   python3  serves the vitest reports
#   jq       formats JSON answers
#   curl     HTTP calls to the running services
#   openssl  random container-name suffix
# Exit 0 when all are ready, 1 (after explaining each problem) otherwise.
# See README, "Prerequisites".

os=$(uname -s)
failed=0

say() { printf '%s\n' "$*" >&2; }
fail() { failed=1; say "❌ $1"; shift; for l in "$@"; do say "   $l"; done; }

# $1 = mac hint, $2 = linux hint
install_hint() { [ "$os" = "Darwin" ] && echo "$1" || echo "$2"; }

for tool in "$@"; do
  case $tool in
    docker)
      if ! command -v docker >/dev/null 2>&1; then
        fail "Docker is not installed (the 'docker' command was not found)." \
          "$(install_hint 'Install Docker Desktop: https://www.docker.com/products/docker-desktop/ (or: brew install --cask docker)' 'Install Docker Engine: https://docs.docker.com/engine/install/')" \
          "Then run this command again."
      elif ! docker info >/dev/null 2>&1; then
        fail "Docker is installed, but the Docker Engine is not running (or this user may not talk to it)." \
          "$(install_hint 'Start it: open -a Docker   (wait until the whale icon says "running"), then run this command again.' 'Start it: sudo systemctl start docker   (and, if it says permission denied: sudo usermod -aG docker $USER, then log in again).')"
      elif ! docker compose version >/dev/null 2>&1; then
        fail "'docker compose' (Compose v2) is not available." \
          "Update Docker Desktop, or install the Compose plugin: https://docs.docker.com/compose/install/"
      fi ;;
    nb)
      command -v nb >/dev/null 2>&1 ||
        fail "'nb' (the NASEBANAL CLI) is not installed - it uploads the reports to NASEBANAL." \
          "Install it:  npm i -g @nasebanal/cli   (needs Node.js; see README, 'The nb CLI')" \
          "Then sign in: nb auth login   (or set NB_TOKEN in .env)" ;;
    node)
      command -v node >/dev/null 2>&1 ||
        fail "Node.js is not installed - this step runs a bin/*.mjs script on your machine." \
          "$(install_hint 'Install it: brew install node' 'Install it: https://nodejs.org/ (or your package manager: apt install nodejs / dnf install nodejs)')" ;;
    python3)
      command -v python3 >/dev/null 2>&1 ||
        fail "python3 is not installed - it serves the report so the browser can load it." \
          "$(install_hint 'Install it: brew install python' 'Install it: apt install python3 / dnf install python3')" ;;
    jq)
      command -v jq >/dev/null 2>&1 ||
        fail "jq is not installed - this step formats a JSON answer with it." \
          "$(install_hint 'Install it: brew install jq' 'Install it: apt install jq / dnf install jq')" ;;
    curl)
      command -v curl >/dev/null 2>&1 ||
        fail "curl is not installed." \
          "$(install_hint 'Install it: brew install curl' 'Install it: apt install curl / dnf install curl')" ;;
    openssl)
      command -v openssl >/dev/null 2>&1 ||
        fail "openssl is not installed - it makes the random suffix of the test container names." \
          "$(install_hint 'Install it: brew install openssl' 'Install it: apt install openssl / dnf install openssl')" ;;
    *) fail "bin/require.sh: unknown tool '$tool'." ;;
  esac
done

exit $failed
