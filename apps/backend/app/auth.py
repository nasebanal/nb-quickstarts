import base64
import hashlib
import hmac
import os
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.passwords import verify_password

# Mock authentication for a demo app. A token is self-contained and signed:
# `nb1~<username>~<HMAC of it>`, with a secret every instance shares (the
# TOKEN_SECRET env var - a fixed demo default, since this is a local demo, so
# instances agree without configuring anything). Any backend instance can
# verify it on its own, with no shared store and no database query - which is
# what running several instances behind Consul needs, and what keeps login as
# cheap as it always was for the load-test scenarios (login must not compete
# with POST /accounts for the DB connection pool). It also survives restarts
# for free. There is no expiry and no revocation, by design: it is the demo
# login, not a session system. (It used to be an in-memory dict persisted to
# a JSON file; several instances writing that file overwrote each other's
# tokens.)
#
# No `.` in the format, deliberately: Keycloak's tokens are JWTs (three
# dot-separated parts) and are tried as such first; a mock token skips that
# branch immediately instead of costing a wasted key lookup.
_TOKEN_SECRET = os.getenv("TOKEN_SECRET", "nb-quickstarts-demo-secret").encode()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(_TOKEN_SECRET, payload.encode(), hashlib.sha256).digest())

_bearer_scheme = HTTPBearer(auto_error=False)

# Keycloak JWT validation (see `make keycloak:verify-apps` and the login
# page's Keycloak toggle) - empty (the default) leaves this off entirely:
# _jwks_client stays None, so _decode_keycloak_token below returns None
# immediately without ever making a network call, and every route behaves
# exactly as it did before Keycloak existed.
#
# Two different URLs on purpose. KEYCLOAK_ISSUER is the `iss` a token must
# carry - the address the *browser* uses (http://localhost:8180/...), since
# that's where a user logs in, and the keycloak module pins every issued
# token to it (KC_HOSTNAME). KEYCLOAK_JWKS_URL is where this backend
# actually fetches the public keys from - the in-network address, because
# from inside apps-network `localhost` is the backend container itself.
# Built once at import time, same as _TOKENS - a PyJWKClient caches the
# fetched key set internally and only re-fetches on a cache miss (e.g. a
# real key rotation), not on every request.
_KEYCLOAK_ISSUER = os.getenv("KEYCLOAK_ISSUER", "")
_KEYCLOAK_JWKS_URL = os.getenv("KEYCLOAK_JWKS_URL") or f"{_KEYCLOAK_ISSUER}/protocol/openid-connect/certs"
_jwks_client = PyJWKClient(_KEYCLOAK_JWKS_URL) if _KEYCLOAK_ISSUER else None


def _lookup_token(token: str) -> str | None:
    """The username a mock token was issued to, or None if it is not one of ours."""
    try:
        version, payload, signature = token.split("~")
        if version != "nb1" or not hmac.compare_digest(signature, _sign(payload)):
            return None
        return _unb64(payload).decode()
    except (ValueError, UnicodeDecodeError):
        return None


def issue_token(username: str) -> str:
    payload = _b64(username.encode())
    return f"nb1~{payload}~{_sign(payload)}"


@dataclass
class Principal:
    """Who is calling: the username, plus what the identity provider told us
    about them. `email`/`name` are only known for Keycloak (they come from the
    token's claims); a demo user's live in the `users` table."""

    username: str
    provider: str = "demo"
    email: str | None = None
    name: str | None = None


# Password hashes by username, filled on first login and kept for the life of
# the process. Login then costs one PBKDF2 and no database round-trip after the
# first: Locust's overload scenarios log in once per simulated user, and a DB
# query per login would make login compete for the same connection pool the
# scenarios are trying to exhaust with POST /accounts. (The hashes never change
# - there is no change-password feature.)
_password_hashes: dict[str, str] = {}


def authenticate(db: Session, username: str, password: str) -> bool:
    stored = _password_hashes.get(username)
    if stored is None:
        user = db.scalar(select(User).where(User.username == username))
        if user is None or user.password_hash is None:
            return False
        stored = _password_hashes[username] = user.password_hash
    return verify_password(password, stored)


def _decode_keycloak_token(token: str) -> Principal | None:
    """Validates `token` as a Keycloak-issued JWT against the configured
    realm's live JWKS and returns who it is - or None if Keycloak isn't
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
    username = claims.get("preferred_username") or claims.get("sub")
    if not username:
        return None
    return Principal(username=username, provider="keycloak", email=claims.get("email"), name=claims.get("name"))


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    keycloak_principal = _decode_keycloak_token(credentials.credentials)
    if keycloak_principal is not None:
        return keycloak_principal
    username = _lookup_token(credentials.credentials)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or missing token")
    return Principal(username=username)


def get_current_username(principal: Principal = Depends(get_current_principal)) -> str:
    return principal.username
