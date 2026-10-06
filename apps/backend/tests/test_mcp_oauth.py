"""The OAuth flow that puts /mcp behind a browser login (app/mcp_oauth.py).

Mounted on a tiny app of its own rather than app.main's: that one reads
MCP_AUTH_REQUIRED once at import, and the flow needs nothing from the rest of
the backend. `/protected` stands in for /mcp, guarded by the same dependency.
"""

import base64
import hashlib
import time
from urllib.parse import parse_qs, urlparse

from app import mcp_oauth
from app.jwt_tokens import decode_token, issue_token
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import pytest

REDIRECT_URI = "http://localhost:54321/callback"


@pytest.fixture()
def oauth_client():
    app = FastAPI()
    app.include_router(mcp_oauth.router)

    @app.get("/protected", dependencies=[Depends(mcp_oauth.require_mcp_token)])
    def protected() -> dict:
        return {"ok": True}

    return TestClient(app)


def _pkce() -> tuple[str, str]:
    verifier = "v" * 50
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def _register(client: TestClient, redirect_uri: str = REDIRECT_URI):
    return client.post("/oauth/register", json={"redirect_uris": [redirect_uri], "client_name": "Claude Code"})


def _authorize(client: TestClient, client_id: str, challenge: str, token: str | None = None):
    token = token or issue_token("demo")
    return client.post(
        "/oauth/authorize",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "client_id": client_id,
            "redirect_uri": REDIRECT_URI,
            "state": "xyz",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )


def _code_from(response) -> str:
    return parse_qs(urlparse(response.json()["redirect_to"]).query)["code"][0]


def test_unauthenticated_request_points_the_client_at_the_metadata(oauth_client):
    response = oauth_client.get("/protected")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == (
        f'Bearer resource_metadata="{mcp_oauth.PUBLIC_BASE_URL}/.well-known/oauth-protected-resource"'
    )


def test_invalid_token_is_rejected_with_the_same_challenge(oauth_client):
    response = oauth_client.get("/protected", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    assert "resource_metadata" in response.headers["www-authenticate"]


def test_metadata_sends_the_browser_to_the_frontend_login(oauth_client):
    resource = oauth_client.get("/.well-known/oauth-protected-resource").json()
    assert resource["authorization_servers"] == [mcp_oauth.PUBLIC_BASE_URL]
    server = oauth_client.get("/.well-known/oauth-authorization-server").json()
    assert server["authorization_endpoint"] == mcp_oauth.MCP_AUTHORIZE_URL
    assert server["code_challenge_methods_supported"] == ["S256"]
    assert server["registration_endpoint"].endswith("/oauth/register")


def test_full_flow_ends_in_a_token_the_guard_accepts(oauth_client):
    client_id = _register(oauth_client).json()["client_id"]
    verifier, challenge = _pkce()

    redirect_to = _authorize(oauth_client, client_id, challenge).json()["redirect_to"]
    assert redirect_to.startswith(f"{REDIRECT_URI}?code=")
    assert parse_qs(urlparse(redirect_to).query)["state"] == ["xyz"]

    token_response = oauth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": _code_from(_authorize(oauth_client, client_id, challenge)),
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert token_response.status_code == 200
    access_token = token_response.json()["access_token"]
    assert oauth_client.get("/protected", headers={"Authorization": f"Bearer {access_token}"}).json() == {"ok": True}


def test_token_is_issued_to_whoever_signed_in(oauth_client):
    client_id = _register(oauth_client).json()["client_id"]
    verifier, challenge = _pkce()
    code = _code_from(_authorize(oauth_client, client_id, challenge, token=issue_token("alice")))
    access_token = oauth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    ).json()["access_token"]
    assert decode_token(access_token)["sub"] == "alice"


def test_wrong_pkce_verifier_is_rejected(oauth_client):
    client_id = _register(oauth_client).json()["client_id"]
    _, challenge = _pkce()
    response = oauth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": _code_from(_authorize(oauth_client, client_id, challenge)),
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "code_verifier": "not-the-verifier",
        },
    )
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_grant"


def test_expired_code_is_rejected(oauth_client, monkeypatch):
    client_id = _register(oauth_client).json()["client_id"]
    verifier, challenge = _pkce()
    code = _code_from(_authorize(oauth_client, client_id, challenge))
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now + mcp_oauth.CODE_TTL_SECONDS + 1)
    response = oauth_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert response.status_code == 400


def test_authorize_needs_a_signed_in_user(oauth_client):
    client_id = _register(oauth_client).json()["client_id"]
    response = oauth_client.post(
        "/oauth/authorize",
        json={"client_id": client_id, "redirect_uri": REDIRECT_URI, "code_challenge": "x"},
    )
    assert response.status_code == 401


def test_authorize_rejects_a_redirect_uri_that_was_not_registered(oauth_client):
    client_id = _register(oauth_client).json()["client_id"]
    response = oauth_client.post(
        "/oauth/authorize",
        headers={"Authorization": f"Bearer {issue_token('demo')}"},
        json={"client_id": client_id, "redirect_uri": "http://localhost:1/other", "code_challenge": "x"},
    )
    assert response.status_code == 400


@pytest.mark.parametrize("redirect_uri", ["https://evil.example/cb", "http://evil.example/cb", "ftp://localhost/cb"])
def test_registration_only_allows_loopback_and_claude_callbacks(oauth_client, redirect_uri):
    assert _register(oauth_client, redirect_uri).status_code == 400


def test_registration_allows_claude_callback(oauth_client):
    assert _register(oauth_client, "https://claude.ai/api/mcp/auth_callback").status_code == 201


def test_forged_client_id_is_rejected(oauth_client):
    response = oauth_client.post(
        "/oauth/authorize",
        headers={"Authorization": f"Bearer {issue_token('demo')}"},
        json={"client_id": "nbm~e30~forged", "redirect_uri": REDIRECT_URI, "code_challenge": "x"},
    )
    assert response.status_code == 400
