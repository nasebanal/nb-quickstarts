"""Keycloak JWT validation (app/auth.py), without a Keycloak.

The tests sign tokens with a throwaway RSA key and stand in for the JWKS
fetch, so what is checked is the backend's own logic: the signature, the
issuer (the browser-facing address, deliberately different from the URL the
keys are fetched from), expiry, and the fall-through to the mock token.
"""

import time
from types import SimpleNamespace

import app.auth as auth
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

import pytest

ISSUER = "http://localhost:8180/realms/nasebanal"


@pytest.fixture(scope="module")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture()
def keycloak_on(monkeypatch, signing_key):
    """Turns Keycloak validation on, with the key set the 'realm' would serve."""

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, _token):
            return SimpleNamespace(key=signing_key.public_key())

    monkeypatch.setattr(auth, "_KEYCLOAK_ISSUER", ISSUER)
    monkeypatch.setattr(auth, "_jwks_client", FakeJwksClient())


def make_token(key, **overrides):
    claims = {
        "iss": ISSUER,
        "preferred_username": "keycloak-demo",
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="RS256")


def post_account(client, token):
    return client.post(
        "/accounts",
        json={"name": "Cash", "quantity": 1},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_valid_keycloak_token_is_accepted(client, keycloak_on, signing_key):
    assert post_account(client, make_token(signing_key)).status_code == 201


def test_token_with_wrong_issuer_is_rejected(client, keycloak_on, signing_key):
    # The in-network address is where the keys come from, not what a token may claim.
    token = make_token(signing_key, iss="http://keycloak:8080/realms/nasebanal")
    assert post_account(client, token).status_code == 401


def test_expired_token_is_rejected(client, keycloak_on, signing_key):
    token = make_token(signing_key, exp=int(time.time()) - 10)
    assert post_account(client, token).status_code == 401


def test_token_signed_by_another_key_is_rejected(client, keycloak_on):
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    assert post_account(client, make_token(other_key)).status_code == 401


def test_mock_token_still_works_alongside(client, keycloak_on):
    token = client.post("/auth/login", json={"username": "demo", "password": "demo"}).json()["token"]
    assert post_account(client, token).status_code == 201


def test_keycloak_token_is_rejected_when_keycloak_is_off(client, signing_key):
    # Default configuration: no issuer, no JWKS client - a JWT is just an unknown token.
    assert auth._jwks_client is None
    assert post_account(client, make_token(signing_key)).status_code == 401
