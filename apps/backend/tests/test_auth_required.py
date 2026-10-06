"""The whole API needs an access token, except the few routes a client must reach to get one."""

import pytest
from app.main import app as fastapi_app
from fastapi.routing import APIRoute

# Login itself, the health check (Kong's and the frontend's "which gateway answered" checks use it), and the public key
# that verifies the tokens. The OAuth plumbing of the MCP login (/oauth/*, /.well-known/oauth-*) is public by design.
PUBLIC = {"/health", "/auth/login", "/.well-known/jwks.json"}
PUBLIC_PREFIXES = ("/oauth/", "/.well-known/oauth-")


def _protected_routes():
    for route in fastapi_app.routes:
        if isinstance(route, APIRoute) and route.path not in PUBLIC and not route.path.startswith(PUBLIC_PREFIXES):
            for method in route.methods - {"HEAD", "OPTIONS"}:
                yield method, route.path.replace("{transaction_id}", "1")


@pytest.mark.parametrize(("method", "path"), sorted(_protected_routes()))
def test_a_protected_route_answers_401_without_a_token(client, method, path):
    response = client.request(method, path, json={} if method in {"POST", "PUT"} else None)
    assert response.status_code == 401, f"{method} {path}"
    if path != "/mcp":  # the MCP endpoint answers with the MCP authorization challenge instead
        assert response.json() == {"detail": "invalid or missing token"}


def test_graphql_needs_a_token_too(client):
    response = client.post("/graphql", json={"query": "query { transactions { id } }"})
    assert response.status_code == 401


def test_the_public_routes_stay_public(client):
    assert client.get("/health").status_code == 200
    assert client.get("/.well-known/jwks.json").status_code == 200
    assert client.post("/auth/login", json={"username": "demo", "password": "demo"}).status_code == 200


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "x" * 129, "quantity": 1},  # longer than the column (found by ZAP's API scan: used to be a 500)
        {"name": "", "quantity": 1},
        {"name": "ok", "quantity": 2**31},
        {"name": "ok", "quantity": -(2**31) - 1},
    ],
)
def test_an_invalid_transaction_is_a_422_not_a_500(client, auth, payload):
    assert client.post("/transactions", json=payload, headers=auth).status_code == 422


def test_the_limits_of_a_transaction_are_accepted(client, auth):
    assert client.post("/transactions", json={"name": "x" * 128, "quantity": 2**31 - 1}, headers=auth).status_code == 201
