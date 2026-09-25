import contextlib
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_database(max_attempts: int = 30, retry_wait: float = 2.0) -> None:
    """mysql-server の起動待ち。apps-network 上で backend が mysql-server より先に
    listen し始めることがあるため、接続できるまでリトライする。"""
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect():
                return
        except Exception as exc:  # noqa: BLE001 - retry on any connection error
            last_exc = exc
            # Say why, every time: a wrong password (Access denied) or an
            # unreachable server would otherwise look like a silent hang for
            # the whole retry window. print(), not logging - nothing has
            # configured a root handler yet at this point of startup.
            print(f"[db] attempt {attempt}/{max_attempts} failed: {str(exc).splitlines()[0][:200]}", flush=True)
            time.sleep(retry_wait)
    raise RuntimeError(f"Could not connect to database after {max_attempts} attempts") from last_exc


@contextlib.contextmanager
def startup_lock():
    """Runs the code inside one instance at a time, across every backend instance.

    With several instances (APPS_BACKEND_INSTANCES > 1) starting at once - or all
    reloading after one code change - each would run `create_all` and the seed
    together and race ("Table already exists", duplicate seed rows). MySQL's
    GET_LOCK is a named lock held by a connection, visible to every instance
    on the same database; the others wait their turn, then find the work done.
    Other databases (the unit tests' SQLite) have a single process, so there
    is nothing to serialise.
    """
    if engine.dialect.name != "mysql":
        yield
        return
    with engine.connect() as connection:
        connection.exec_driver_sql("SELECT GET_LOCK('nb-quickstarts-startup', 60)")
        try:
            yield
        finally:
            connection.exec_driver_sql("SELECT RELEASE_LOCK('nb-quickstarts-startup')")
