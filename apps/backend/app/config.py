import json
import os
import urllib.error
import urllib.request


def _fetch_vault_mysql_secret() -> dict | None:
    """Reads secret/apps/mysql from Vault's KV v2 engine (see `make
    vault:put-mysql-secret` / `vault:verify-apps`) - returns None whenever
    Vault isn't configured or reachable, so the caller falls back to
    MYSQL_USER/MYSQL_PASSWORD below untouched. Runs once at import time,
    same as `settings` itself - there's no live app running yet to defer
    this to. Uses print(), not the logging module: nothing in this app
    configures a root handler/level, so a plain logger.info() call here
    would silently go nowhere - print() is what `make vault:verify-apps`
    actually greps out of `docker logs nb-backend` as its proof.
    """
    vault_addr = os.getenv("VAULT_ADDR")
    vault_token = os.getenv("VAULT_TOKEN")
    if not vault_addr or not vault_token:
        return None
    request = urllib.request.Request(
        f"{vault_addr.rstrip('/')}/v1/secret/data/apps/mysql",
        headers={"X-Vault-Token": vault_token},
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            body = json.loads(response.read())
        secret = body["data"]["data"]
    except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
        print(f"[vault] secret fetch failed ({exc}), falling back to MYSQL_USER/MYSQL_PASSWORD env vars", flush=True)
        return None
    print(f"[vault] loaded MySQL credentials from {vault_addr}/v1/secret/data/apps/mysql", flush=True)
    return secret


_vault_mysql_secret = _fetch_vault_mysql_secret()


class Settings:
    mysql_host: str = os.getenv("MYSQL_HOST", "mysql-server")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = (_vault_mysql_secret or {}).get("user") or os.getenv("MYSQL_USER", "testuser")
    mysql_password: str = (_vault_mysql_secret or {}).get("password") or os.getenv("MYSQL_PASSWORD", "testpassword")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "testdb")

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )


settings = Settings()
