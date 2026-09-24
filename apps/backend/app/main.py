import os
import socket
from contextlib import asynccontextmanager
from pathlib import Path

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP

from app.db import Base, SessionLocal, engine, startup_lock, wait_for_database
from app.graphql.schema import graphql_router
from app.routers import accounts, auth, health, me
from app.seed import seed_if_empty
from app.telemetry import setup_telemetry

OPENAPI_SPEC_PATH = Path(__file__).resolve().parent.parent / "openapi.yaml"


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_database()
    with startup_lock():
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


app = FastAPI(lifespan=lifespan)
setup_telemetry(app, engine)


# Which instance answered: with more than one backend behind Consul (see the
# Consul scenario) a client needs to see who served it. A raw ASGI middleware,
# not @app.middleware("http") - that one wraps every request in
# BaseHTTPMiddleware, which costs measurable throughput, and this app is the
# thing the load-test scenarios measure.
INSTANCE_ID = os.getenv("INSTANCE_ID") or socket.gethostname()


class ServedByMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.inner(scope, receive, send)
            return

        async def send_with_header(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", []).append((b"x-served-by", INSTANCE_ID.encode()))
            await send(message)

        await self.inner(scope, receive, send_with_header)


app.add_middleware(ServedByMiddleware)


# The contract (openapi.yaml) is the source of truth, not this app's own
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
    expose_headers=["Via", "X-Served-By"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(me.router)
app.include_router(graphql_router, prefix="/graphql")

# Exposes the REST routes above as MCP tools at /mcp (Streamable HTTP), so
# Claude Desktop (or any MCP client) can list/create accounts directly. Must
# be mounted after the routers above are registered, since it introspects
# the app's OpenAPI schema to build the tool list.
mcp = FastApiMCP(app)
mcp.mount_http()
