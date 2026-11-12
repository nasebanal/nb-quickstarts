#!/bin/sh
# Signs in to / out of NASEBANAL with the nb CLI (make evolution:login / evolution:logout).
#
# Usage: bin/evolution_auth.sh login|logout
#
# The session is nb's own (~/.config/nasebanal/), shared by every use of nb on this machine, not just
# nb-quickstarts. NB_TOKEN in the environment / .env is not touched by either command: while it is set,
# nb keeps using it.

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli, from the public npm registry). See README, 'The nb CLI'."
  exit 1
fi

NB_BASE_URL=${NB_BASE_URL:-https://api.assurance.nasebanal.com}
export NB_BASE_URL

case "$1" in
  login)
    flags=""
    # No display (a Linux box over ssh): the device-code flow instead of the browser.
    if [ "$(uname -s)" = "Linux" ] && [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
      flags="--no-launch-browser"
    fi
    # shellcheck disable=SC2086  # $flags is empty or one flag on purpose
    nb auth login $flags || { echo "❌ Login failed."; exit 1; }
    ;;
  logout)
    nb auth logout || exit 1
    [ -n "$NB_TOKEN" ] && echo "Note: NB_TOKEN is still set - nb keeps using it. Unset it (.env / environment) to be signed out."
    ;;
  *)
    echo "Usage: $0 login|logout"
    exit 2
    ;;
esac
exit 0
