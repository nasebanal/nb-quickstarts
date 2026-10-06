import hashlib
import hmac
import json
import os
import secrets
import time
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.auth import Principal, _b64, _sign, _unb64, get_current_principal, issue_token

# OAuth for /mcp (MCP's authorization flow: RFC 9728 protected-resource
# metadata, RFC 8414 authorization-server metadata, RFC 7591 dynamic client
# registration, authorization code + PKCE). Off unless MCP_AUTH_REQUIRED=true -
# empty (the default) leaves /mcp open exactly as before, so MCP Inspector,
# agentgateway and the test scenarios keep working untouched.
#
# With it on, a client that calls /mcp without a token gets a 401 pointing at
# the metadata below, and an MCP client such as Claude Code opens the browser
# on its own. The browser lands on the *frontend's* login page (MCP_AUTHORIZE_URL),
# so the user signs in the way they always do - the demo login, or Keycloak when
# KEYCLOAK_ISSUER is set - and the frontend then asks POST /oauth/authorize
# (with that login's token) for the authorization code. This backend is only
# the authorization server's bookkeeping; it never sees a password here.
#
# Stateless, like the demo token in auth.py: a client_id and an authorization
# code are signed, self-contained strings, so any backend instance can verify
# them and nothing is stored. The access token handed out is the ordinary
# demo token (auth.issue_token), which every protected route already accepts -
# even when the person signed in through Keycloak (their username carries over).
MCP_AUTH_REQUIRED = os.getenv("MCP_AUTH_REQUIRED", "").lower() in ("1", "true", "yes")

# Where this backend is reached from the MCP client / browser (not the
# in-network address), and where the frontend's MCP login page lives.
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8080").rstrip("/")
MCP_AUTHORIZE_URL = os.getenv("MCP_AUTHORIZE_URL", "http://localhost:5173/mcp-authorize")

CODE_TTL_SECONDS = 60

_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}
_ALLOWED_HTTPS_PREFIXES = ("https://claude.ai/", "https://claude.com/")

RESOURCE_METADATA_URL = f"{PUBLIC_BASE_URL}/.well-known/oauth-protected-resource"


def _seal(kind: str, data: dict) -> str:
    payload = _b64(json.dumps(data, separators=(",", ":")).encode())
    return f"{kind}~{payload}~{_sign(f'{kind}.{payload}')}"


def _unseal(kind: str, value: str) -> dict | None:
    try:
        prefix, payload, signature = value.split("~")
        if prefix != kind or not hmac.compare_digest(signature, _sign(f"{kind}.{payload}")):
            return None
        return json.loads(_unb64(payload))
    except (ValueError, UnicodeDecodeError):
        return None


def _redirect_uri_allowed(uri: str) -> bool:
    parsed = urlparse(uri)
    if parsed.scheme == "http":
        return parsed.hostname in _LOOPBACK_HOSTS
    return uri.startswith(_ALLOWED_HTTPS_PREFIXES)


def _oauth_error(error: str, description: str, code: int = status.HTTP_400_BAD_REQUEST) -> JSONResponse:
    return JSONResponse({"error": error, "error_description": description}, status_code=code)


def require_mcp_token(request: Request) -> None:
    """Dependency for /mcp: a 401 that tells the client where to start OAuth.

    The WWW-Authenticate header is what makes the client open the browser."""
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    challenge = {"WWW-Authenticate": f'Bearer resource_metadata="{RESOURCE_METADATA_URL}"'}
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "authentication required", headers=challenge)
    try:
        get_current_principal(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    except HTTPException:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or missing token", headers=challenge) from None


router = APIRouter(tags=["mcp-oauth"])


@router.get("/.well-known/oauth-protected-resource")
@router.get("/.well-known/oauth-protected-resource/mcp")
def protected_resource_metadata() -> dict:
    return {
        "resource": f"{PUBLIC_BASE_URL}/mcp",
        "authorization_servers": [PUBLIC_BASE_URL],
        "bearer_methods_supported": ["header"],
    }


@router.get("/.well-known/oauth-authorization-server")
def authorization_server_metadata() -> dict:
    return {
        "issuer": PUBLIC_BASE_URL,
        "authorization_endpoint": MCP_AUTHORIZE_URL,
        "token_endpoint": f"{PUBLIC_BASE_URL}/oauth/token",
        "registration_endpoint": f"{PUBLIC_BASE_URL}/oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
    }


class ClientRegistration(BaseModel):
    redirect_uris: list[str]
    client_name: str | None = None


@router.post("/oauth/register", status_code=status.HTTP_201_CREATED)
def register_client(payload: ClientRegistration):
    if not payload.redirect_uris or not all(_redirect_uri_allowed(uri) for uri in payload.redirect_uris):
        return _oauth_error("invalid_redirect_uri", "redirect_uris must be loopback http URLs or a claude.ai callback")
    # The client_id *is* the registration: signed, so /oauth/authorize can trust
    # the redirect URIs inside it without storing anything.
    client_id = _seal("nbm", {"r": payload.redirect_uris, "n": payload.client_name or "", "i": secrets.token_hex(4)})
    return {
        "client_id": client_id,
        "client_name": payload.client_name,
        "redirect_uris": payload.redirect_uris,
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
    }


class AuthorizeRequest(BaseModel):
    client_id: str
    redirect_uri: str
    state: str | None = None
    code_challenge: str
    code_challenge_method: str = "S256"


@router.get("/oauth/client")
def describe_client(client_id: str) -> dict:
    """What the consent screen shows: who is asking to be let in."""
    client = _unseal("nbm", client_id)
    if client is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown client")
    return {"client_name": client["n"], "redirect_uris": client["r"]}


@router.post("/oauth/authorize")
def authorize(payload: AuthorizeRequest, principal: Principal = Depends(get_current_principal)) -> dict:
    """Called by the frontend once the user has signed in there (demo login or
    Keycloak - get_current_principal accepts either) and clicked Allow. Returns
    the URL to send the browser to, which hands the code to the MCP client."""
    client = _unseal("nbm", payload.client_id)
    if client is None or payload.redirect_uri not in client["r"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown client or redirect_uri")
    if payload.code_challenge_method != "S256":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "only S256 PKCE is supported")
    code = _seal(
        "nbc",
        {
            "u": principal.username,
            "c": payload.client_id,
            "r": payload.redirect_uri,
            "k": payload.code_challenge,
            "e": int(time.time()) + CODE_TTL_SECONDS,
        },
    )
    params = {"code": code}
    if payload.state:
        params["state"] = payload.state
    separator = "&" if "?" in payload.redirect_uri else "?"
    return {"redirect_to": f"{payload.redirect_uri}{separator}{urlencode(params)}"}


def _pkce_challenge(verifier: str) -> str:
    return _b64(hashlib.sha256(verifier.encode()).digest())


@router.post("/oauth/token")
def token(
    grant_type: str = Form(...),
    code: str = Form(""),
    redirect_uri: str = Form(""),
    client_id: str = Form(""),
    code_verifier: str = Form(""),
):
    if grant_type != "authorization_code":
        return _oauth_error("unsupported_grant_type", "only authorization_code is supported")
    grant = _unseal("nbc", code)
    if (
        grant is None
        or grant["e"] < time.time()
        or grant["r"] != redirect_uri
        or grant["c"] != client_id
        or not code_verifier
        or not hmac.compare_digest(grant["k"], _pkce_challenge(code_verifier))
    ):
        return _oauth_error("invalid_grant", "the authorization code is invalid, expired, or does not match")
    return {"access_token": issue_token(grant["u"]), "token_type": "Bearer"}
