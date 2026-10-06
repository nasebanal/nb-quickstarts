import os
from contextlib import asynccontextmanager
from pathlib import Path

import yaml
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import AuthConfig, FastApiMCP

from app.db import Base, SessionLocal, engine, wait_for_database
from app.graphql.schema import graphql_router
from app.mcp_oauth import MCP_AUTH_REQUIRED, require_mcp_token
from app.mcp_oauth import router as mcp_oauth_router
from app.routers import accounts, auth, health, jwks, me, transactions
from app.seed import seed_if_empty
from app.telemetry import setup_telemetry

# shared/openapi/openapi.yaml, mounted read-only at /shared (see
# apps/docker-compose.yml). OPENAPI_SPEC_PATH overrides it; without Docker
# (a plain checkout) the same file is found relative to this one.
_SHARED_SPEC = Path("/shared/openapi/openapi.yaml")
_CHECKOUT_SPEC = Path(__file__).resolve().parent.parent.parent.parent / "shared" / "openapi" / "openapi.yaml"
OPENAPI_SPEC_PATH = Path(os.getenv("OPENAPI_SPEC_PATH") or (_SHARED_SPEC if _SHARED_SPEC.exists() else _CHECKOUT_SPEC))


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(lifespan=lifespan)
setup_telemetry(app, engine)


# The contract (shared/openapi/openapi.yaml) is the source of truth, not this app's own
# routes - see that file's header comment for why. FastAPI normally derives
# GET /openapi.json from the registered routes/Pydantic models on first
# request (and caches it on app.openapi_schema); overriding app.openapi
# makes it serve the checked-in file instead, unconditionally. Must be set
# before FastApiMCP(app) below, since it introspects app.openapi() at mount
# time to build its tool list.
def _load_openapi_schema() -> dict:
    if app.openapi_schema is None:
        app.openapi_schema = yaml.safe_load(OPENAPI_SPEC_PATH.read_text())
    return app.openapi_schema


app.openapi = _load_openapi_schema

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    # Response headers are hidden from browser JS by default under CORS
    # unless explicitly exposed here - `Via` is how the frontend detects
    # whether it's actually being routed through Kong right now (Kong adds
    # it to every proxied response; a direct connection has no such
    # header). Confirmed via curl that Kong adds it, and separately that
    # fetch()'s response.headers.get("via") returns null without this.
    expose_headers=["Via"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(jwks.router)
app.include_router(transactions.router)
app.include_router(accounts.router)
app.include_router(me.router)
app.include_router(graphql_router, prefix="/graphql")

# Exposes the REST routes above as MCP tools at /mcp (Streamable HTTP), so
# Claude Desktop (or any MCP client) can list transactions/post one/list
# balances directly. Must be mounted after the routers above are
# registered, since it introspects the app's OpenAPI schema to build the
# tool list.
#
# MCP_AUTH_REQUIRED=true (see app/mcp_oauth.py) puts /mcp behind a login: a
# client without a token gets a 401 that makes it open the browser, and the
# token it ends up with is forwarded to each tool call, so protected routes
# (/me, POST /transactions) work through MCP too. Unset, /mcp stays open.
if MCP_AUTH_REQUIRED:
    app.include_router(mcp_oauth_router)
    # The OAuth routes are the login's plumbing, not tools for the model:
    # leave them (tag "mcp-oauth") out of the tool list.
    mcp = FastApiMCP(
        app,
        auth_config=AuthConfig(dependencies=[Depends(require_mcp_token)]),
        exclude_tags=["mcp-oauth"],
    )
else:
    mcp = FastApiMCP(app)
mcp.mount_http()
