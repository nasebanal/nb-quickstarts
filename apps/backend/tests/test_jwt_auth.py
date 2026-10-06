"""The backend's own JWTs (app/jwt_tokens.py): what they carry, what is refused, and the published JWKS."""

import base64
import hashlib
import hmac
import json
import time

import app.jwt_tokens as jwt_tokens
import jwt

import pytest

WRITE = {"name": "x", "quantity": 1}


def login(client):
    return client.post("/auth/login", json={"username": "demo", "password": "demo"}).json()["token"]


def post_with(client, token):
    return client.post("/transactions", json=WRITE, headers={"Authorization": f"Bearer {token}"})


def b64(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def test_login_returns_an_rs256_jwt_with_the_expected_claims(client):
    token = login(client)
    header = jwt.get_unverified_header(token)
    assert header["alg"] == "RS256" and header["kid"] == jwt_tokens.KEY_ID
    claims = jwt_tokens.decode_token(token)
    assert claims["sub"] == claims["preferred_username"] == "demo"
    assert claims["iss"] == jwt_tokens.ISSUER and claims["aud"] == jwt_tokens.AUDIENCE
    assert claims["exp"] - claims["iat"] == jwt_tokens.TTL_SECONDS


def test_a_valid_token_is_accepted(client):
    assert post_with(client, login(client)).status_code == 201


def test_an_expired_token_is_rejected(client):
    assert post_with(client, jwt_tokens.issue_token("demo", ttl_seconds=-10)).status_code == 401


def test_a_tampered_token_is_rejected(client):
    header, _payload, signature = login(client).split(".")
    forged_payload = b64({"iss": jwt_tokens.ISSUER, "aud": jwt_tokens.AUDIENCE, "sub": "someone-else", "iat": 1, "exp": 4102444800})
    assert post_with(client, f"{header}.{forged_payload}.{signature}").status_code == 401


def test_a_token_signed_by_another_key_is_rejected(client):
    from cryptography.hazmat.primitives.asymmetric import rsa

    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    claims = {"iss": jwt_tokens.ISSUER, "aud": jwt_tokens.AUDIENCE, "sub": "demo", "iat": int(time.time()), "exp": int(time.time()) + 300}
    assert post_with(client, jwt.encode(claims, other, algorithm="RS256")).status_code == 401


def test_a_token_for_another_issuer_or_audience_is_rejected(client):
    wrong_issuer = jwt_tokens._sign({**jwt_tokens._claims("demo", int(time.time()), int(time.time()) + 300), "iss": "http://evil.example"})
    wrong_audience = jwt_tokens._sign({**jwt_tokens._claims("demo", int(time.time()), int(time.time()) + 300), "aud": "someone-else"})
    assert post_with(client, wrong_issuer).status_code == 401
    assert post_with(client, wrong_audience).status_code == 401


def test_alg_none_and_hmac_confusion_are_rejected(client):
    claims = jwt_tokens._claims("demo", int(time.time()), int(time.time()) + 300)
    unsigned = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64(claims)}."
    assert post_with(client, unsigned).status_code == 401
    # The classic algorithm-confusion attack: an HS256 token whose HMAC secret is the (public) key.
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    public_pem = jwt_tokens._public_key.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    signing_input = f"{b64({'alg': 'HS256', 'typ': 'JWT'})}.{b64(claims)}"
    signature = base64.urlsafe_b64encode(hmac.new(public_pem, signing_input.encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
    assert post_with(client, f"{signing_input}.{signature}").status_code == 401


@pytest.mark.parametrize("token", ["", "not-a-jwt", "a.b.c", "nb1~ZGVtbw~anything"])
def test_garbage_is_rejected(client, token):
    assert post_with(client, token).status_code == 401


def test_the_jwks_verifies_the_tokens_the_backend_issues(client):
    response = client.get("/.well-known/jwks.json")
    assert response.status_code == 200
    (key,) = response.json()["keys"]
    assert key["kty"] == "RSA" and key["alg"] == "RS256" and key["use"] == "sig" and key["kid"] == jwt_tokens.KEY_ID
    signing_key = jwt.PyJWK(key).key
    claims = jwt.decode(login(client), signing_key, algorithms=["RS256"], audience=jwt_tokens.AUDIENCE, issuer=jwt_tokens.ISSUER)
    assert claims["sub"] == "demo"


def test_the_fixture_token_is_deterministic_and_long_lived():
    token = jwt_tokens.fixture_token("demo")
    assert token == jwt_tokens.fixture_token("demo")
    claims = jwt_tokens.decode_token(token)
    assert claims["sub"] == "demo" and claims["exp"] > time.time() + 50 * 365 * 24 * 3600


def test_the_fixed_demo_token_in_the_contract_is_the_one_the_backend_signs():
    import os
    import re

    path = os.getenv("OPENAPI_SPEC_PATH", "/shared/openapi/openapi.yaml")
    match = re.search(r"token: (eyJ[\w.-]+)", open(path).read())
    assert match, "the login example in openapi.yaml should carry the fixed demo token"
    assert match.group(1) == jwt_tokens.fixture_token("demo")


def test_the_contract_describes_the_jwks_endpoint(client):
    spec = client.get("/openapi.json").json()
    assert "/.well-known/jwks.json" in spec["paths"]
    assert spec["components"]["securitySchemes"]["HTTPBearer"]["bearerFormat"] == "JWT"
