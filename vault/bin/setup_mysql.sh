#!/bin/sh
# Runs INSIDE the vault container (`docker exec -i nb-vault sh < this file`,
# see `make vault:setup-mysql`), where the `vault` CLI already lives.
#
# Turns on Vault's database secrets engine and points it at apps' MySQL. From
# then on `vault read database/creds/apps-backend` (or the same HTTP call the
# backend makes) makes Vault CREATE A NEW MySQL USER on the spot - random
# name, random password, its own lease - and DROP it again when the lease
# runs out or is revoked. Nothing static is stored anywhere: the backend never
# has a password in its config, only a Vault token that can ask for one.
#
# Idempotent - safe to re-run.
set -e
export VAULT_ADDR=http://127.0.0.1:8200

vault secrets list -format=json | grep -q '"database/"' || vault secrets enable database

# The connection Vault itself uses to create/drop users - MySQL's root,
# reachable as mysql-server on apps-network.
vault write database/config/apps-mysql \
	plugin_name=mysql-database-plugin \
	connection_url='{{username}}:{{password}}@tcp(mysql-server:3306)/' \
	allowed_roles=apps-backend \
	username=root \
	password="$MYSQL_ROOT_PASSWORD" >/dev/null

# What a credential from the apps-backend role is allowed to do: everything in
# demo, nothing else. default_ttl is how long a lease lasts before it must
# be renewed (apps/backend renews at half of it); max_ttl is the ceiling.
vault write database/roles/apps-backend \
	db_name=apps-mysql \
	creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE:-demo}.* TO '{{name}}'@'%';" \
	revocation_statements="DROP USER IF EXISTS '{{name}}'@'%';" \
	default_ttl=1h \
	max_ttl=24h >/dev/null

echo "database secrets engine ready: role apps-backend (default_ttl 1h, max_ttl 24h)"
