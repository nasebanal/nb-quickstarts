"""Swaps the database for unit tests.

Doesn't connect to MySQL (mysql-server); swaps in an in-memory SQLite
database instead. Patching `app.db`'s `engine`/`SessionLocal`/
`wait_for_database` before importing `app.main` (and, transitively,
`app.graphql.schema`) makes both the REST and GraphQL code paths use the
test SQLite database. Import order matters here, so the patch happens at
module level (when pytest first imports this file).
"""

import app.db as db_module
import app.models  # noqa: F401 - registers the Item table on Base.metadata
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

db_module.engine = _test_engine
db_module.SessionLocal = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)
db_module.wait_for_database = lambda *args, **kwargs: None
db_module.Base.metadata.create_all(bind=_test_engine)

from app.main import app as fastapi_app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import pytest  # noqa: E402 - must be imported after the patch above


@pytest.fixture()
def client():
    with TestClient(fastapi_app) as test_client:
        yield test_client
