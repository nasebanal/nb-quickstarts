#!/bin/sh
# Runs a command that writes junk into apps' MySQL (an active ZAP scan) and puts
# the database back exactly as it was afterwards - also when the command fails
# or is stopped with Ctrl+C.
#
# Usage: bin/with_db_restore.sh <command> [args...]
#   e.g. bin/with_db_restore.sh docker compose -p zap -f zap/docker-compose.yml run ... zap ...
#
# How: `mysqldump` of the apps database (inside the running mysql container, so
# nothing is installed on the host) before the command, and the dump loaded back
# afterwards. The apps containers keep running and keep their connection the
# whole time - nothing is switched or recreated, so an interrupted run cannot
# leave the apps pointed at a scratch database. Tables are dropped and recreated
# from the dump (the database itself is kept, so the backend's open connections
# stay valid). Anything written to the database while the command runs is lost.
#
# Settings (.env): APPS_MYSQL_ROOT_PASSWORD (default rootpassword),
# APPS_MYSQL_DATABASE (default demo). Exit code: the command's own.

c=nb-mysql-server
db=${APPS_MYSQL_DATABASE:-demo}
pw=${APPS_MYSQL_ROOT_PASSWORD:-rootpassword}

if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" != "true" ]; then
  echo "❌ The apps database container ($c) is not running - run 'make apps:up' first." >&2
  exit 70
fi

dump=$(mktemp "${TMPDIR:-/tmp}/apps-db-XXXXXX") || exit 70

echo "💾 Saving the '$db' database before the scan..."
if ! docker exec -e MYSQL_PWD="$pw" "$c" mysqldump -uroot --single-transaction --routines "$db" >"$dump" 2>/dev/null || [ ! -s "$dump" ]; then
  echo "❌ Could not save the database (wrong APPS_MYSQL_ROOT_PASSWORD?) - nothing was run." >&2
  rm -f "$dump"
  exit 70
fi

restore() {
  trap '' INT TERM   # a second Ctrl+C must not interrupt the restore
  echo "♻️  Restoring the '$db' database to what it was before the scan..."
  if docker exec -i -e MYSQL_PWD="$pw" "$c" mysql -uroot "$db" <"$dump" 2>/dev/null; then
    echo "✅ Database restored."
    rm -f "$dump"
  else
    echo "❌ Restoring failed. The saved copy is kept at $dump - or run 'make apps:reset' then 'make apps:up' for a fresh demo database." >&2
  fi
}
trap restore EXIT
trap 'exit 130' INT TERM

"$@"
