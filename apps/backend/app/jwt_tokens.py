"""The backend's own access tokens: RS256 JWTs, with the public key published as a JWKS.

Login (`POST /auth/login`) and the MCP login (app/mcp_oauth.py) both hand out one of these. A token is
verified with the public key alone, so a gateway (agentgateway's `mcpAuthentication`, Kong's `jwt`
plugin) or any other service can check it from `GET /.well-known/jwks.json` without a shared secret -
the same way it would check a Keycloak token.

The signing key is a checked-in demo key (app/dev_jwt_key.pem, not a secret; JWT_PRIVATE_KEY_PATH
overrides it): every checkout and every backend instance then agree on one key, and signing is
stateless, so login stays as cheap as it was for the load-test scenarios (no database round-trip).
RS256 signing is deterministic, which is what lets `fixture_token` produce the fixed demo tokens
checked in under shared/openapi/ and in the MCP Inspector's config.
"""

import base64
import hashlib
import os
import time
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER = os.getenv("JWT_ISSUER", "http://localhost:8080")
AUDIENCE = "nb-quickstarts-api"
ALGORITHM = "RS256"
# A demo, so a login lasts a day - long enough that a token registered in Claude Code or typed into a
# config file does not expire mid-session (there are no refresh tokens here). JWT_TTL_SECONDS shortens
# or lengthens it; the MCP login uses the same lifetime.
TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", str(24 * 3600)))
MCP_TTL_SECONDS = TTL_SECONDS

# A fixed issue time and a far-off expiry, so the same token can be written into files and checked again.
FIXTURE_ISSUED_AT = 1767225600  # 2026-01-01T00:00:00Z
FIXTURE_EXPIRES_AT = 4102444800  # 2100-01-01T00:00:00Z

_KEY_PATH = Path(os.getenv("JWT_PRIVATE_KEY_PATH") or Path(__file__).with_name("dev_jwt_key.pem"))
_private_key = serialization.load_pem_private_key(_KEY_PATH.read_bytes(), password=None)
assert isinstance(_private_key, rsa.RSAPrivateKey)
_public_key = _private_key.public_key()


def _b64url(number: int) -> str:
    raw = number.to_bytes((number.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


_numbers = _public_key.public_numbers()
# The key id is the SHA-256 of the public modulus, so it follows the key and needs no configuration.
KEY_ID = base64.urlsafe_b64encode(hashlib.sha256(_numbers.n.to_bytes(256, "big")).digest()).rstrip(b"=").decode()[:16]


def _claims(username: str, issued_at: int, expires_at: int) -> dict:
    return {
        "iss": ISSUER,
        "sub": username,
        "preferred_username": username,
        "aud": AUDIENCE,
        "iat": issued_at,
        "exp": expires_at,
    }


def _sign(claims: dict) -> str:
    return jwt.encode(claims, _private_key, algorithm=ALGORITHM, headers={"kid": KEY_ID})


def issue_token(username: str, ttl_seconds: int | None = None) -> str:
    now = int(time.time())
    return _sign(_claims(username, now, now + (TTL_SECONDS if ttl_seconds is None else ttl_seconds)))


def fixture_token(username: str) -> str:
    """The fixed, long-lived token for `username` (same bytes every time) - for files that embed one."""
    return _sign(_claims(username, FIXTURE_ISSUED_AT, FIXTURE_EXPIRES_AT))


def decode_token(token: str) -> dict | None:
    """The claims of a token this backend issued, or None for anything else (bad signature, other issuer
    or audience, expired, missing `exp`/`iat`/`sub`, a different algorithm)."""
    try:
        return jwt.decode(
            token,
            _public_key,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.PyJWTError:
        return None


def jwks() -> dict:
    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": ALGORITHM,
                "kid": KEY_ID,
                "n": _b64url(_numbers.n),
                "e": _b64url(_numbers.e),
            }
        ]
    }
