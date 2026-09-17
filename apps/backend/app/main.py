from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP

from app.db import Base, SessionLocal, engine, wait_for_database
from app.graphql.schema import graphql_router
from app.routers import accounts, auth, health
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(
    title="nb-quickstarts apps backend",
    description=(
        "テスト対象アプリのバックエンドAPI(accounts リソースの最小限のイベントソーシング実装)。"
        "OpenAPI スキーマは Specmatic の契約テストにそのまま使う想定。"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(graphql_router, prefix="/graphql")

# Exposes the REST routes above as MCP tools at /mcp (Streamable HTTP), so
# Claude Desktop (or any MCP client) can list/create accounts directly. Must
# be mounted after the routers above are registered, since it introspects
# the app's OpenAPI schema to build the tool list.
mcp = FastApiMCP(app)
mcp.mount_http()
