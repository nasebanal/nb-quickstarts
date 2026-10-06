#!/bin/sh
# Makes sure `nb` has credentials before an upload; logs in through the browser
# when it has none.
#
# Usage: bin/ensure_nb_auth.sh
#
# Credentials, in the order `nb` itself uses them:
#   1. NB_TOKEN (PAT / service-account token) - nothing to check, nothing to do
#   2. a stored `nb auth login` session (OAuth, refreshed by `nb` on its own
#      while a refresh token exists) or a stored PAT
# With neither - or with an expired session that cannot refresh - this runs
# `nb auth login` (opens the browser; on a Linux box without a display it uses
# the device-code flow instead). Without a terminal (CI, pipes) it never waits
# on a login: it stops and says to set NB_TOKEN.
#
# `nb auth status` always exits 0, so its text is what tells the cases apart.

if ! command -v nb >/dev/null 2>&1; then
  echo "❌ 'nb' (the NASEBANAL CLI) is not on PATH - install it (npm i -g @nasebanal/cli) or link nb-cli."
  exit 1
fi

[ -n "$NB_TOKEN" ] && exit 0

status=$(nb auth status 2>&1)
if ! printf '%s\n' "$status" | grep -q 'source: none' &&
   ! { printf '%s\n' "$status" | grep -q '(expired)$'; }; then
  exit 0
fi

if [ ! -t 0 ] || [ ! -t 1 ]; then
  echo "❌ Not logged in to NASEBANAL and no terminal to log in from - set NB_TOKEN (a PAT), or run 'nb auth login' first."
  exit 1
fi

echo "🔐 Not logged in to NASEBANAL - starting 'nb auth login'..."
flags=""
if [ "$(uname -s)" = "Linux" ] && [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
  flags="--no-launch-browser"
fi
# shellcheck disable=SC2086  # $flags is empty or one flag on purpose
nb auth login $flags || { echo "❌ Login failed - nothing was uploaded."; exit 1; }
