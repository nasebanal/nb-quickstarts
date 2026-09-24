import json
import os
import threading
import time
import urllib.error
import urllib.request


def _vault_call(vault_addr: str, vault_token: str, path: str, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        f"{vault_addr.rstrip('/')}/v1/{path}",
        headers={"X-Vault-Token": vault_token},
        data=json.dumps(body).encode() if body is not None else None,
        method="PUT" if body is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=3) as response:
        return json.loads(response.read())


def _renew_lease_forever(vault_addr: str, vault_token: str, lease_id: str, ttl: int) -> None:
    """Keeps a dynamic credential alive: renews its lease at half the TTL.

    A Vault lease is a promise that the credential works for `ttl` seconds -
    after that Vault revokes it (drops the MySQL user). Renewing extends that
    up to the role's max_ttl (24h in `make vault:setup-mysql`); past it, the
    backend needs a restart to be issued a fresh credential."""
    while True:
        time.sleep(max(ttl // 2, 30))
        try:
            _vault_call(vault_addr, vault_token, "sys/leases/renew", {"lease_id": lease_id, "increment": ttl})
            print(f"[vault] renewed lease {lease_id}", flush=True)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print(f"[vault] lease renewal failed ({exc}) - this credential will expire", flush=True)


def _fetch_vault_mysql_credentials() -> dict | None:
    """Gets the MySQL credential from Vault - returns None whenever Vault
    isn't configured or reachable, so the caller falls back to MYSQL_USER/
    MYSQL_PASSWORD below untouched. Runs once at import time, same as
    `settings` itself - there's no live app running yet to defer this to.

    Tries, in order:
      1. a *dynamic* credential (database/creds/<role>, see `make
         vault:setup-mysql`) - Vault creates a brand-new MySQL user for this
         process on the spot, with a lease; nothing static is stored anywhere;
      2. the *static* secret at secret/apps/mysql (KV v2, `make
         vault:put-mysql-secret`).

    Uses print(), not the logging module: this runs before anything has
    configured logging, and `make vault:verify-apps` greps these lines out of
    `docker logs nb-backend` as its proof.
    """
    vault_addr = os.getenv("VAULT_ADDR")
    vault_token = os.getenv("VAULT_TOKEN")
    if not vault_addr or not vault_token:
        return None

    role = os.getenv("VAULT_MYSQL_ROLE", "apps-backend")
    # Vault creates the MySQL user by connecting to MySQL, so right after a
    # `down` + `up` (MySQL still starting) it answers 500 for a while. Retry
    # those; a 4xx (engine or role not set up, bad token) won't fix itself,
    # so that goes straight on to the static secret.
    for attempt in range(1, 31):
        try:
            body = _vault_call(vault_addr, vault_token, f"database/creds/{role}")
            credentials = {"user": body["data"]["username"], "password": body["data"]["password"]}
            ttl = int(body.get("lease_duration", 3600))
            print(
                f"[vault] issued a dynamic MySQL user {credentials['user']} (lease {ttl}s) "
                f"from {vault_addr}/v1/database/creds/{role}",
                flush=True,
            )
            threading.Thread(
                target=_renew_lease_forever,
                args=(vault_addr, vault_token, body["lease_id"], ttl),
                daemon=True,
            ).start()
            return credentials
        except urllib.error.HTTPError as exc:
            if exc.code < 500:
                print(f"[vault] no dynamic credential (HTTP {exc.code}), trying the static secret", flush=True)
                break
            print(f"[vault] dynamic credential not ready (HTTP {exc.code}), attempt {attempt}/30", flush=True)
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
            print(f"[vault] dynamic credential not ready ({exc}), attempt {attempt}/30", flush=True)
        time.sleep(2)

    try:
        secret = _vault_call(vault_addr, vault_token, "secret/data/apps/mysql")["data"]["data"]
    except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
        print(f"[vault] secret fetch failed ({exc}), falling back to MYSQL_USER/MYSQL_PASSWORD env vars", flush=True)
        return None
    print(f"[vault] loaded MySQL credentials from {vault_addr}/v1/secret/data/apps/mysql", flush=True)
    return secret


_vault_mysql_secret = _fetch_vault_mysql_credentials()


class Settings:
    mysql_host: str = os.getenv("MYSQL_HOST", "mysql-server")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = (_vault_mysql_secret or {}).get("user") or os.getenv("MYSQL_USER", "demo")
    mysql_password: str = (_vault_mysql_secret or {}).get("password") or os.getenv("MYSQL_PASSWORD", "demo")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "demo")

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )


settings = Settings()
