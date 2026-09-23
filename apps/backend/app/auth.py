import json
import os
import secrets
import threading
from pathlib import Path

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

# Mock authentication for a demo app - no real expiry (tokens never time
# out on their own), and persisted to a file on the bind-mounted source
# dir instead of in-memory only, so a session survives both `--reload`
# restarts (any code edit triggers one) and a full container recreate
# (apps:restart, apps:down -> up). Used to be in-memory only: every
# restart silently invalidated every logged-in session, which is exactly
# what UnauthorizedError (see apps/frontend/src/lib/api.ts) exists to
# handle gracefully - that handling stays, since a full apps:reset (wipes
# the whole MySQL volume - see apps/docker-compose.yml) still legitimately
# invalidates every token along with everything else. Not a real session
# store: no rotation, no per-token metadata, just enough persistence that
# routine dev-loop restarts don't keep kicking you out.
_TOKENS_FILE = Path(__file__).resolve().parent.parent / ".tokens.json"

# FastAPI runs sync path operations (like login, below) in a threadpool, so
# concurrent logins - e.g. Locust's overload scenarios, which log in on
# every simulated user - genuinely run issue_token() from multiple OS
# threads at once, not just interleaved on one event loop. Without this,
# two threads' write_text() calls can race and interleave, corrupting the
# file (observed directly: a complete JSON object followed by leftover
# trailing bytes from a second, differently-sized concurrent write - valid
# JSON's "Extra data" error, crash-looping the whole app on every restart
# thereafter, since _load_tokens() runs at import time). The lock below
# serializes the read-modify-write; _save_tokens' write-to-temp-then-
# os.replace makes the file swap itself atomic too, so a reader (a fresh
# process starting up) never observes a partially-written file even
# without holding the lock.
_tokens_lock = threading.Lock()


def _load_tokens() -> dict[str, str]:
    if _TOKENS_FILE.exists():
        return json.loads(_TOKENS_FILE.read_text())
    return {}


def _save_tokens() -> None:
    tmp_file = _TOKENS_FILE.with_suffix(".json.tmp")
    tmp_file.write_text(json.dumps(_TOKENS))
    os.replace(tmp_file, _TOKENS_FILE)


_TOKENS: dict[str, str] = _load_tokens()

_bearer_scheme = HTTPBearer(auto_error=False)

# Keycloak JWT validation (see `make keycloak:verify-apps`) - empty (the
# default) leaves this off entirely: _jwks_client stays None, so
# _decode_keycloak_token below returns None immediately without ever
# making a network call, and every route behaves exactly as it did before
# Keycloak existed. Built once at import time, same as _TOKENS - a
# PyJWKClient caches the fetched key set internally and only re-fetches on
# a cache miss (e.g. a real key rotation), not on every request.
_KEYCLOAK_ISSUER = os.getenv("KEYCLOAK_ISSUER", "")
_jwks_client = PyJWKClient(f"{_KEYCLOAK_ISSUER}/protocol/openid-connect/certs") if _KEYCLOAK_ISSUER else None


def issue_token(username: str) -> str:
    token = secrets.token_urlsafe(24)
    with _tokens_lock:
        _TOKENS[token] = username
        _save_tokens()
    return token


def _decode_keycloak_token(token: str) -> str | None:
    """Validates `token` as a Keycloak-issued JWT against the configured
    realm's live JWKS and returns its username - or None if Keycloak isn't
    configured, the token isn't a JWT at all (the mock /auth/login token
    is a plain secrets.token_urlsafe() string, never containing a `.`), or
    signature/issuer validation fails, so the caller falls back to the
    legacy opaque-token lookup below. Audience isn't checked - this demo
    realm's one public client has no need for it, and Keycloak clients
    other than apps-demo aren't part of the scenario."""
    if _jwks_client is None or token.count(".") != 2:
        return None
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=_KEYCLOAK_ISSUER,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError:
        return None
    return claims.get("preferred_username") or claims.get("sub")


def get_current_username(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    keycloak_username = _decode_keycloak_token(credentials.credentials)
    if keycloak_username is not None:
        return keycloak_username
    if credentials.credentials not in _TOKENS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    return _TOKENS[credentials.credentials]
